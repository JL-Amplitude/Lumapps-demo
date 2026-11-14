#!/usr/bin/env python3
"""
Amplitude Demo Dataset Generator
---------------------------------
Generates a repeatable, deterministic e-commerce event dataset for
Amplitude Analytics product demonstrations.

Usage:
    python generate.py --dry-run --users 10 --seed 42
    python generate.py --output-file events.jsonl --seed 42 --users 750
    python generate.py --mode historical --seed 42 --users 750
    python generate.py --taxonomy saas --mode historical --seed 42 --users 750
    python generate.py --check-config --taxonomy golden
"""

import argparse
import getpass
import hashlib
import json
import logging
import os
import random
import sys
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import requests
try:
    from faker import Faker
except ImportError:
    from fake_data import Faker

from taxonomy import load_taxonomy, validate_taxonomy
from taxonomy.golden import FUNNEL_STEPS, FRICTION_EVENT, TAX_RATE
import extensions as ext

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Amplitude endpoints
# ---------------------------------------------------------------------------

BATCH_URL    = "https://api2.amplitude.com/batch"
IDENTIFY_URL = "https://api2.amplitude.com/identify"
GROUP_IDENTIFY_URL = "https://api2.amplitude.com/groupidentify"
BATCH_SIZE   = 2000   # max events per request

# ---------------------------------------------------------------------------
# User dataclass
# ---------------------------------------------------------------------------

@dataclass
class User:
    user_id: str
    persona: dict                       # full persona dict from taxonomy
    payment_method_saved: bool
    loyalty_tier: str
    acquisition_source: str
    account_age_days: int
    device_type: str
    fake_name: str
    fake_email: str
    # Experiment assignment — None means not in experiment
    experiment_variant: Optional[str] = None   # "control" | "treatment" | None
    account: Optional[dict] = None             # extension: B2B account
    device_id: Optional[str] = None            # extension: identity stitching
    # resolved per-session
    sessions: list = field(default_factory=list)

# ---------------------------------------------------------------------------
# Deterministic insert_id
# ---------------------------------------------------------------------------

def _insert_id(user_id: str, canonical_key: str, ts_ms: int) -> str:
    """SHA-256 based deduplication key. Same inputs always produce same ID."""
    raw = f"{user_id}|{canonical_key}|{ts_ms}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


# ---------------------------------------------------------------------------
# Event property name translation
# ---------------------------------------------------------------------------

def _translate_props(props: dict, taxonomy: dict) -> dict:
    """
    Translate canonical event property keys to taxonomy display names.
    Keys not present in event_property_names pass through unchanged.
    This ensures property names in Amplitude match the taxonomy and the
    Lovable site SDK calls.
    """
    mapping = taxonomy.get("event_property_names", {})
    if not mapping:
        return props
    return {mapping.get(k, k): v for k, v in props.items()}


# ---------------------------------------------------------------------------
# Event builder
# ---------------------------------------------------------------------------

def build_event(
    canonical_key: str,
    user: User,
    session_id: int,
    ts_ms: int,
    taxonomy: dict,
    event_props: Optional[dict] = None,
) -> dict:
    """Build a single Amplitude event payload."""
    display_name = taxonomy["event_names"][canonical_key]
    translated   = _translate_props(event_props or {}, taxonomy)
    return {
        "user_id":           user.user_id,
        "event_type":        display_name,
        "time":              ts_ms,
        "session_id":        session_id,
        "insert_id":         _insert_id(user.user_id, canonical_key, ts_ms),
        "event_properties":  translated,
    }


def build_exposure_event(
    user: "User",
    session_id: int,
    ts_ms: int,
    flag_key: str,
    variant: str,
) -> dict:
    """
    Build an Amplitude Experiment exposure event ($exposure).
    These use Amplitude's reserved event type and fixed property schema —
    property names must NOT be translated through the taxonomy mapping.
    See: https://amplitude.com/docs/feature-experiment/track-exposure
    """
    return {
        "user_id":          user.user_id,
        "event_type":       "$exposure",
        "time":             ts_ms,
        "session_id":       session_id,
        "insert_id":        _insert_id(user.user_id, f"exposure|{flag_key}", ts_ms),
        "event_properties": {
            "flag_key": flag_key,
            "variant":  variant,
        },
    }

# ---------------------------------------------------------------------------
# User pool creation
# ---------------------------------------------------------------------------

def _weighted_choice(weights: dict, rng: random.Random) -> str:
    keys = list(weights.keys())
    probs = [weights[k] for k in keys]
    return rng.choices(keys, weights=probs, k=1)[0]


def create_user_pool(
    n: int,
    taxonomy: dict,
    rng: random.Random,
    fake: Faker,
) -> list[User]:
    persona_a = taxonomy["persona_a"]
    persona_b = taxonomy["persona_b"]
    share_a   = persona_a["share"]

    users = []
    for _ in range(n):
        persona = persona_a if rng.random() < share_a else persona_b

        loyalty_tier = _weighted_choice(persona["loyalty_tier_weights"], rng)
        acq_source   = _weighted_choice(persona["acquisition_source_weights"], rng)
        device_type  = _weighted_choice(persona["device_type_weights"], rng)
        age_lo, age_hi = persona["account_age_days_range"]
        account_age  = rng.randint(age_lo, age_hi)

        # 25% of users are exposed to the experiment (flag key is derived from
        # the friction event display name at runtime). Equal 50/50 split between
        experiment_variant: Optional[str] = None
        if rng.random() < 0.25:
            experiment_variant = "control" if rng.random() < 0.5 else "treatment"

        users.append(User(
            user_id              = str(uuid.UUID(int=rng.getrandbits(128))),
            persona              = persona,
            payment_method_saved = persona["payment_method_saved"],
            loyalty_tier         = loyalty_tier,
            acquisition_source   = acq_source,
            account_age_days     = account_age,
            device_type          = device_type,
            fake_name            = fake.name(),
            fake_email           = fake.email(),
            experiment_variant   = experiment_variant,
        ))
    return users

# ---------------------------------------------------------------------------
# Session simulation
# ---------------------------------------------------------------------------

def _gap(rng: random.Random, lo: int = 30, hi: int = 300) -> int:
    """Random inter-event gap in milliseconds."""
    return rng.randint(lo, hi) * 1000


def _pick_item(taxonomy: dict, rng: random.Random) -> dict:
    categories = taxonomy["product_categories"]
    lo, hi     = taxonomy["item_price_range"]
    price      = round(rng.uniform(lo, hi), 2)
    category   = rng.choice(categories)
    item_id    = f"{category[:3].upper()}-{rng.randint(1000, 9999)}"
    return {"item_id": item_id, "item_category": category, "item_price": price}


def simulate_session(
    user: User,
    session_start_ms: int,
    taxonomy: dict,
    rng: random.Random,
    fake: Faker,
) -> list[dict]:
    """
    Simulate one session for a user. Returns a list of Amplitude event dicts.

    Non-linearity:
    - search injected at random position between steps 1–3
    - 35% chance of viewing a second product before adding to cart
    - 25% chance of category re-entry after a product detail view
    - supporting events fire via independent Bernoulli draws
    """
    events: list[dict] = []
    p = user.persona
    ts = session_start_ms
    session_id = session_start_ms  # Amplitude convention

    def emit(canonical_key: str, props: Optional[dict] = None) -> None:
        nonlocal ts
        events.append(build_event(canonical_key, user, session_id, ts, taxonomy, props))
        ts += _gap(rng)

    # Decide search injection point (0=before step1, 1=after step1, 2=after step2, 3=after step3)
    search_inject_point = rng.randint(0, 3) if rng.random() < p["product_searched_rate"] else -1

    def maybe_search(point: int) -> None:
        if search_inject_point == point:
            emit("product_searched", {
                "query_term":   fake.word(),
                "results_count": rng.randint(0, 120),
                "zero_results": rng.random() < 0.08,
            })

    # -----------------------------------------------------------------------
    # Step 1: homepage_viewed
    # -----------------------------------------------------------------------
    maybe_search(0)
    emit("homepage_viewed", {
        "referrer_source": user.acquisition_source,
        "is_return_visit": user.account_age_days > 0,
    })

    if rng.random() > p["step1_to_step2_rate"]:
        emit("session_ended", {"deepest_funnel_step_reached": 1, "converted": False,
                               "session_duration_seconds": (ts - session_start_ms) // 1000})
        return events

    # Supporting: promotion_viewed (can fire early)
    if rng.random() < p["promotion_viewed_rate"]:
        emit("promotion_viewed", {
            "promotion_type": rng.choice(["banner", "popup", "sale_page"]),
            "discount_pct":   rng.choice([10, 15, 20, 25]),
        })

    maybe_search(1)

    # Optional category browse before product detail
    if rng.random() < p["category_browsed_rate"]:
        emit("category_browsed", {
            "category_name":    rng.choice(taxonomy["product_categories"]),
            "items_visible":    rng.randint(12, 48),
            "filter_used":      rng.random() < 0.30,
            "sort_applied":     rng.choice(["popular", "price_asc", "price_desc", "newest"]),
        })

    # -----------------------------------------------------------------------
    # Step 2: product_detail_viewed
    # -----------------------------------------------------------------------
    item = _pick_item(taxonomy, rng)
    emit("product_detail_viewed", {
        **item,
        "rating_score":      round(rng.uniform(3.0, 5.0), 1),
        "reviews_count":     rng.randint(0, 1200),
        "availability":      rng.choices(["in_stock", "low_stock", "out_of_stock"],
                                         weights=[0.80, 0.15, 0.05])[0],
    })

    # Optional: read reviews
    if rng.random() < p["product_review_read_rate"]:
        emit("product_review_read", {
            "item_id":           item["item_id"],
            "reviews_read":      rng.randint(1, 10),
            "avg_rating_viewed": round(rng.uniform(3.0, 5.0), 1),
        })

    # Optional: recommendation click
    if rng.random() < p["recommendation_clicked_rate"]:
        rec_item = _pick_item(taxonomy, rng)
        emit("recommendation_clicked", {
            **rec_item,
            "recommendation_context": rng.choice(["similar", "trending", "personalised"]),
            "position_in_list":       rng.randint(1, 6),
        })

    # Non-linearity: multi-item loop (view a second product)
    if rng.random() < p["multi_item_loop_rate"]:
        item2 = _pick_item(taxonomy, rng)
        while item2["item_id"] == item["item_id"]:
            item2 = _pick_item(taxonomy, rng)

        # Optional category re-entry before second product
        if rng.random() < p["category_reentry_rate"]:
            emit("category_browsed", {
                "category_name": item2["item_category"],
                "items_visible": rng.randint(12, 48),
                "filter_used":   rng.random() < 0.40,
                "sort_applied":  rng.choice(["popular", "price_asc", "newest"]),
            })

        emit("product_detail_viewed", {
            **item2,
            "rating_score":  round(rng.uniform(3.0, 5.0), 1),
            "reviews_count": rng.randint(0, 1200),
            "availability":  rng.choices(["in_stock", "low_stock", "out_of_stock"],
                                          weights=[0.80, 0.15, 0.05])[0],
        })
        # Use the second item going forward if the user "switches"
        if rng.random() < 0.50:
            item = item2

    if rng.random() > p["step2_to_step3_rate"]:
        # Optional save before leaving
        if rng.random() < p["product_saved_rate"]:
            emit("product_saved", {"item_id": item["item_id"],
                                   "item_category": item["item_category"]})
        emit("session_ended", {"deepest_funnel_step_reached": 2, "converted": False,
                               "session_duration_seconds": (ts - session_start_ms) // 1000})
        return events

    maybe_search(2)

    # -----------------------------------------------------------------------
    # Step 3: add_to_cart
    # -----------------------------------------------------------------------
    emit("add_to_cart", {
        **item,
        "quantity":     rng.randint(1, 3),
        "cart_total":   round(item["item_price"] * rng.randint(1, 3), 2),
    })

    # Optional save
    if rng.random() < p["product_saved_rate"]:
        emit("product_saved", {"item_id": item["item_id"],
                               "item_category": item["item_category"]})

    maybe_search(3)

    # -----------------------------------------------------------------------
    # Experiment exposure (fires at step 3 for all assigned users)
    # The flag key is derived from the friction event display name so it
    # always matches the experiment created in Amplitude for this taxonomy.
    # Formula: slugify(friction_event_display_name) + "-reduction"
    # e.g. "Bank Connection Failed" → "bank-connection-failed-reduction"
    # -----------------------------------------------------------------------
    friction_display = taxonomy["event_names"].get("price_breakdown_viewed", "friction-event")
    import re as _re
    EXPERIMENT_FLAG = _re.sub(r"[^a-z0-9]+", "-", friction_display.lower()).strip("-") + "-reduction"

    if user.experiment_variant:
        events.append(build_exposure_event(
            user, session_id, ts, EXPERIMENT_FLAG, user.experiment_variant
        ))
        ts += _gap(rng)

    # Treatment effect: the redesigned friction step reduces how often users
    # encounter the friction event, and boosts step 3→4 conversion as a result.
    # Control and non-experiment users use baseline persona rates.
    if user.experiment_variant == "treatment":
        effective_dropper_rate    = p["friction_event_rate_dropper"] * 0.35
        effective_step3_to_step4  = min(p["step3_to_step4_rate"] * 2.8, 0.75)
    else:
        effective_dropper_rate    = p["friction_event_rate_dropper"]
        effective_step3_to_step4  = p["step3_to_step4_rate"]

    # -----------------------------------------------------------------------
    # Step 3 → Step 4: pre-determine outcome, then fire friction event at
    # asymmetric rates for droppers vs converters.
    #
    # This is what makes price_breakdown_viewed appear at #1 in Amplitude's
    # Conversion Drivers "Dropped Off" report: droppers see it ~90% of the
    # time; converters only ~15%. The old approach fired it for everyone
    # (~91%) regardless of outcome, producing near-zero correlation.
    # -----------------------------------------------------------------------
    free_shipping  = rng.random() < p["free_shipping_rate"]
    shipping_lo, shipping_hi = p["shipping_cost_range"]
    shipping_cost  = 0.0 if free_shipping else round(rng.uniform(shipping_lo, shipping_hi), 2)
    tax_amount     = round(item["item_price"] * taxonomy.get("tax_rate", TAX_RATE), 2)
    total_amount   = round(item["item_price"] + shipping_cost + tax_amount, 2)

    # Pre-determine the gate outcome using the effective rate (treatment gets a boost)
    will_convert = rng.random() < effective_step3_to_step4

    # Fire friction event at different rates depending on actual outcome
    friction_fire_rate = (
        effective_dropper_rate                  # ~90% control / ~32% treatment
        if not will_convert
        else p["friction_event_rate_converter"] # ~15% for converters regardless of variant
    )
    if rng.random() < friction_fire_rate:
        emit(FRICTION_EVENT, {
            "item_id":                item["item_id"],
            "item_price":             item["item_price"],
            "shipping_cost":          shipping_cost,
            "tax_amount":             tax_amount,
            "total_amount":           total_amount,
            "free_shipping_eligible": free_shipping,
        })

    # Promo code attempt (price-sensitive users reacting to the pricing screen)
    promo_attempted = False
    if rng.random() < p["promo_code_entered_rate"]:
        promo_attempted = True
        promo_success   = rng.random() < 0.25   # 25% of codes work
        emit("promo_code_entered", {
            "code_entered":   fake.bothify(text="SAVE??").upper(),
            "code_valid":     promo_success,
            "discount_value": round(total_amount * 0.10, 2) if promo_success else 0.0,
        })
        if promo_success:
            total_amount = round(total_amount * 0.90, 2)

    # Apply the pre-determined gate
    if not will_convert:
        emit("cart_abandoned", {
            "item_id":             item["item_id"],
            "cart_total":          total_amount,
            "abandonment_trigger": "pricing_screen" if not free_shipping else "other",
            "promo_attempted":     promo_attempted,
        })
        emit("session_ended", {"deepest_funnel_step_reached": 3, "converted": False,
                               "session_duration_seconds": (ts - session_start_ms) // 1000})
        return events

    # -----------------------------------------------------------------------
    # Step 4: checkout_started
    # -----------------------------------------------------------------------
    emit("checkout_started", {
        "item_id":               item["item_id"],
        "total_amount":          total_amount,
        "payment_method_saved":  user.payment_method_saved,
        "free_shipping_eligible": free_shipping,
    })

    if rng.random() > p["step4_to_step5_rate"]:
        emit("session_ended", {"deepest_funnel_step_reached": 4, "converted": False,
                               "session_duration_seconds": (ts - session_start_ms) // 1000})
        return events

    # -----------------------------------------------------------------------
    # Step 5: order_completed
    # -----------------------------------------------------------------------
    emit("order_completed", {
        "order_id":      str(uuid.UUID(int=rng.getrandbits(128)))[:8].upper(),
        "item_id":       item["item_id"],
        "item_category": item["item_category"],
        "total_amount":  total_amount,
        "shipping_cost": shipping_cost,
        "is_first_order": user.account_age_days == 0,
        "promo_applied":  promo_attempted and rng.random() < 0.25,
    })

    emit("session_ended", {"deepest_funnel_step_reached": 5, "converted": True,
                           "session_duration_seconds": (ts - session_start_ms) // 1000})
    return events

# ---------------------------------------------------------------------------
# Identify (user properties)
# ---------------------------------------------------------------------------

def build_identify_record(user: User, taxonomy: dict) -> dict:
    """Build a single identify record for one user (no api_key — batched separately)."""
    prop_names = taxonomy["user_property_names"]
    return {
        "user_id": user.user_id,
        "user_properties": {
            "$set": {
                prop_names["payment_method_saved"]: user.payment_method_saved,
                prop_names["loyalty_tier"]:         user.loyalty_tier,
                "utm_medium":   user.acquisition_source,
                prop_names["account_age_days"]:     user.account_age_days,
                prop_names["device_type"]:          user.device_type,
            }
        }
    }

# ---------------------------------------------------------------------------
# API calls with retry
# ---------------------------------------------------------------------------

def _post_with_retry(url: str, payload: dict, dry_run: bool,
                     output_file, label: str, form_encoded: bool = False) -> None:
    if dry_run:
        print(f"[DRY-RUN] {label}")
        return

    if output_file:
        output_file.write(json.dumps(payload) + "\n")
        return

    for attempt in range(1, 4):
        try:
            if form_encoded:
                # /identify expects application/x-www-form-urlencoded
                resp = requests.post(url, data=payload, timeout=15)
            else:
                resp = requests.post(url, json=payload, timeout=15)
            if resp.status_code == 200:
                return
            log.warning("%s  HTTP %s (attempt %d): %s",
                        label, resp.status_code, attempt, resp.text[:200])
        except requests.RequestException as exc:
            log.warning("%s  Request error (attempt %d): %s", label, attempt, exc)

        if attempt < 3:
            time.sleep(2 ** attempt)

    log.error("%s  Failed after 3 attempts — skipping.", label)


def send_identify_batch(users: list[User], taxonomy: dict, api_key: str,
                        dry_run: bool, output_file) -> None:
    """Send all user identifies in batches of 1000 (Amplitude limit)."""
    chunk_size = 1000
    for i in range(0, len(users), chunk_size):
        chunk = users[i:i + chunk_size]
        records = [build_identify_record(u, taxonomy) for u in chunk]
        payload = {
            "api_key": api_key,
            "identification": json.dumps(records),
        }
        _post_with_retry(IDENTIFY_URL, payload, dry_run, output_file,
                         f"identify batch users={len(chunk)} offset={i}",
                         form_encoded=True)


def send_events(events: list[dict], api_key: str,
                dry_run: bool, output_file) -> None:
    for i in range(0, len(events), BATCH_SIZE):
        chunk = events[i:i + BATCH_SIZE]
        payload = {"api_key": api_key, "events": chunk}
        _post_with_retry(BATCH_URL, payload, dry_run, output_file,
                         f"batch events={len(chunk)} offset={i}")

# ---------------------------------------------------------------------------
# State file — persists seed, api_key, users across Cowork sessions
# ---------------------------------------------------------------------------

def _find_taxonomy_dir() -> Optional[Path]:
    """
    Locate the taxonomies/ directory inside the skill folder.
    generate.py lives at <skill>/scripts/generate.py
    taxonomies/ lives at <skill>/taxonomies/
    """
    script_dir = Path(__file__).resolve().parent   # .../scripts/
    skill_dir  = script_dir.parent                 # .../demo-event-generator/
    tax_dir    = skill_dir / "taxonomies"
    try:
        tax_dir.mkdir(parents=True, exist_ok=True)
        return tax_dir
    except OSError:
        return None


def _state_file_path(slug: str) -> Path:
    """Return the path where the state file for this taxonomy will be stored."""
    tax_dir = _find_taxonomy_dir()
    if tax_dir:
        return tax_dir / f"{slug}.state.json"
    # Fallback: alongside the script (temporary, non-persistent)
    return Path(__file__).resolve().parent / f"{slug}.state.json"


def load_state(slug: str) -> Optional[dict]:
    """Load persisted run state for a taxonomy. Returns None if not found."""
    path = _state_file_path(slug)
    try:
        if path.exists():
            return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        log.warning("Could not read state file %s: %s", path, exc)
    return None


def save_state(slug: str, seed: int, api_key: str, users: int,
               last_run_date: str) -> None:
    """
    Persist run metadata so --top-up can restore seed, api_key, and user
    count without the user needing to remember them.
    """
    path = _state_file_path(slug)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        state = {
            "taxonomy":      slug,
            "seed":          seed,
            "api_key":       api_key,
            "users":         users,
            "last_run_date": last_run_date,
        }
        path.write_text(json.dumps(state, indent=2))
        log.info("State saved → %s", path)
    except OSError as exc:
        log.warning("Could not save state file: %s", exc)


# ---------------------------------------------------------------------------
# Summary table
# ---------------------------------------------------------------------------

def print_summary(funnel_counts: dict, total_users: int) -> None:
    print("\n" + "=" * 55)
    print("  FUNNEL SUMMARY")
    print("=" * 55)
    steps = FUNNEL_STEPS
    labels = [
        "Step 1  homepage_viewed",
        "Step 2  product_detail_viewed",
        "Step 3  add_to_cart",
        "Step 4  checkout_started",
        "Step 5  order_completed",
    ]
    prev = total_users
    for step, label in zip(steps, labels):
        count = funnel_counts.get(step, 0)
        pct   = count / prev * 100 if prev else 0
        arrow = "  ←  HIGH FRICTION" if step == "checkout_started" else ""
        print(f"  {label:<35} {count:>5}  ({pct:5.1f}%){arrow}")
        prev  = count
    print("=" * 55)
    print(f"  Total users generated: {total_users}")
    print("=" * 55 + "\n")

# ---------------------------------------------------------------------------
# Run modes
# ---------------------------------------------------------------------------

def run(taxonomy: dict, args: argparse.Namespace, api_key: str,
        date_range: Optional[tuple] = None) -> None:
    """
    Generate and upload events.

    date_range — optional (start_dt, end_dt) pair of UTC-aware datetimes
                 used by --top-up to restrict which days are emitted.
                 When None, the full window defined by args.mode is used.

    Determinism guarantee
    ─────────────────────
    • User pool      : always recreated from args.seed  →  same user_ids every run
    • Day assignment : derived from Random(seed|user_id|"schedule")
                       →  each user's active days are stable across full/top-up runs
    • Session events : derived from Random(seed|user_id|date)
                       →  identical events for the same (user, date) pair regardless
                          of whether the run is full or a top-up
    • insert_id      : hash(user_id|event|timestamp_ms)
                       →  Amplitude silently deduplicates any accidental re-uploads
    """
    main_rng = random.Random(args.seed)
    fake = Faker()
    Faker.seed(args.seed)

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # The full 30-day scheduling window — always the same anchor regardless of
    # whether this is a full run or a top-up.  User day-assignment is computed
    # against this window so the schedule stays consistent between runs.
    full_start = today - timedelta(days=30)
    # Long top-up gaps (> 30 days): stretch the scheduling window back so every
    # missing day can still receive sessions.
    if date_range is not None and date_range[0] < full_start:
        full_start = date_range[0]
    full_end   = today + timedelta(days=1)   # exclusive upper bound
    full_days  = (full_end - full_start).days

    # The emit range — which calendar days to actually generate events for.
    if date_range is not None:
        emit_start, emit_end = date_range
    elif args.mode == "historical":
        emit_start, emit_end = full_start, full_end
    else:                                    # daily
        emit_start, emit_end = today, today + timedelta(days=1)

    # Build a set of dates in the emit range for O(1) lookup
    emit_dates: set = set()
    d = emit_start
    while d < emit_end:
        emit_dates.add(d.date())
        d += timedelta(days=1)

    log.info(
        "Generating %d users — taxonomy: %s  seed: %d  "
        "emitting %d day(s)  [%s → %s]",
        args.users, taxonomy["industry"], args.seed, len(emit_dates),
        emit_start.date(), (emit_end - timedelta(days=1)).date(),
    )

    users         = create_user_pool(args.users, taxonomy, main_rng, fake)
    all_events:   list[dict] = []
    funnel_counts: dict[str, int] = {s: 0 for s in FUNNEL_STEPS}

    output_file = None
    if getattr(args, "output_file", None):
        output_file = open(args.output_file, "w", encoding="utf-8")

    try:
        # Identify records are always sent — idempotent and keeps user
        # properties current even on a top-up.
        accounts = None
        if taxonomy.get("accounts"):
            accounts = ext.create_accounts(taxonomy, args.seed)
            for u in users:
                u.account = ext.assign_account(u, accounts, args.seed)
        if taxonomy.get("identity_stitching") or taxonomy.get("accounts"):
            for u in users:
                u.device_id = ext.device_id_for(u.user_id, args.seed)

        send_identify_batch(users, taxonomy, api_key, args.dry_run, output_file)

        if accounts:
            recs = ext.group_identify_records(accounts, taxonomy["accounts"].get("group_type", "account"))
            _post_with_retry(GROUP_IDENTIFY_URL,
                             {"api_key": api_key, "identification": json.dumps(recs)},
                             args.dry_run, output_file,
                             f"group identify accounts={len(recs)}", form_encoded=True)
            log.info("Group-identified %d accounts.", len(recs))

        # Weekday/weekend weights across the FULL scheduling window.
        day_weights = [
            1.3 if (full_start + timedelta(days=i)).weekday() < 5 else 0.7
            for i in range(full_days)
        ]

        for user in users:
            # ── Per-user scheduling RNG ──────────────────────────────────────
            # Seeded from (global seed + user_id) so each user always gets
            # the same set of active days, regardless of the emit range.
            sched_rng  = random.Random(f"{args.seed}|{user.user_id}|schedule")
            n_sessions = 2 if sched_rng.random() < user.persona["session_reentry_rate"] else 1
            # Keep daily density constant when a long top-up stretches the window
            density = max(1.0, full_days / 31)
            n_sessions = max(1, round(n_sessions * density))
            u_weights = [w * ext.trend_multiplier(user.account, i, full_days)
                         for i, w in enumerate(day_weights)]
            chosen_idx = sched_rng.choices(range(full_days), weights=u_weights, k=n_sessions)
            chosen_idx = sorted(set(chosen_idx))

            light_idx: set = set()
            if user.account is not None:
                n_light = round(sched_rng.randint(3, 9) * density)
                light_idx = set(sched_rng.choices(range(full_days), weights=u_weights, k=n_light)) - set(chosen_idx)
            first_idx = min(set(chosen_idx) | light_idx)

            for day_idx in sorted(set(chosen_idx) | light_idx):
                day = full_start + timedelta(days=day_idx)

                # Skip days outside the emit range (top-up behaviour)
                if day.date() not in emit_dates:
                    continue

                # ── Per-user-per-day RNG ─────────────────────────────────────
                # Seeded from (global seed + user_id + date) so this user's
                # events on this date are identical whether generated in a
                # full run or a top-up.  insert_id deduplication in Amplitude
                # handles any accidental re-uploads automatically.
                day_rng = random.Random(f"{args.seed}|{user.user_id}|{day.date().isoformat()}")

                hour       = day_rng.randint(8, 22)
                minute     = day_rng.randint(0, 59)
                second     = day_rng.randint(0, 59)
                session_dt = day.replace(hour=hour, minute=minute, second=second)
                session_ms = int(session_dt.timestamp() * 1000)

                if day_idx in light_idx:
                    session_events = ext.light_session(user, session_ms, taxonomy, day_rng, build_event)
                else:
                    session_events = simulate_session(user, session_ms, taxonomy, day_rng, fake)
                if taxonomy.get("identity_stitching") and day_idx == first_idx:
                    session_events = ext.login_events(user, session_ms, taxonomy, day_rng) + session_events
                if user.device_id or taxonomy.get("agent_extensions"):
                    session_events = ext.enrich_session(session_events, user, taxonomy, day_rng, today)

                for event in session_events:
                    et = event["event_type"]
                    for step in FUNNEL_STEPS:
                        if et == taxonomy["event_names"][step]:
                            funnel_counts[step] += 1

                all_events.extend(session_events)

        send_events(all_events, api_key, args.dry_run, output_file)

        if args.dry_run:
            print(f"\n[DRY-RUN] Total events generated: {len(all_events)}")
            print("[DRY-RUN] First 20 events:\n")
            for e in all_events[:20]:
                print(json.dumps(e, indent=2))
        else:
            log.info("Sent %d events to Amplitude.", len(all_events))

    finally:
        if output_file:
            output_file.close()
            log.info("Events written to %s", args.output_file)

    print_summary(funnel_counts, args.users)

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate and upload Amplitude demo event data.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate.py --dry-run --users 10 --seed 42
  python generate.py --output-file events.jsonl --seed 42 --users 750
  python generate.py --mode historical --seed 42 --users 750
  python generate.py --taxonomy saas --mode historical --seed 42 --users 750
  python generate.py --check-config --taxonomy saas
        """,
    )
    parser.add_argument("--taxonomy",     default="golden",
                        help="Taxonomy name to use (default: golden)")
    parser.add_argument("--mode",         choices=["historical", "daily"],
                        default="historical",
                        help="historical = 30 days; daily = today only (default: historical)")
    parser.add_argument("--users",        type=int, default=2000,
                        help="Number of synthetic users to generate (default: 2000)")
    parser.add_argument("--seed",         type=int, default=42,
                        help="Random seed for reproducibility (default: 42)")
    parser.add_argument("--dry-run",      action="store_true",
                        help="Print events to stdout; do not call Amplitude API")
    parser.add_argument("--output-file",  metavar="PATH",
                        help="Write events as JSONL to this file instead of uploading")
    parser.add_argument("--check-config", action="store_true",
                        help="Validate taxonomy and exit without generating data")
    parser.add_argument("--api-key",      metavar="KEY",
                        help="Amplitude HTTP API key (omit to be prompted securely)")
    parser.add_argument("--top-up",       action="store_true",
                        help=(
                            "Add data for every day since the last run. "
                            "Reads seed, API key, and user count from the saved "
                            "state file — only --taxonomy is required. "
                            "Run a full historical load first to create the state file."
                        ))
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # Load and validate taxonomy
    taxonomy = load_taxonomy(args.taxonomy)
    validate_taxonomy(taxonomy)

    if args.check_config:
        print(f"[OK] Taxonomy '{args.taxonomy}' is valid.")
        print(f"     Industry:    {taxonomy['industry']}")
        print(f"     Display:     {taxonomy['display_name']}")
        print(f"     Events:      {len(taxonomy['event_names'])} canonical keys mapped")
        print(f"     Properties:  {len(taxonomy['user_property_names'])} user properties mapped")
        sys.exit(0)

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # -----------------------------------------------------------------------
    # Top-up mode — restore everything from the state file; only --taxonomy
    # is needed from the user.
    # -----------------------------------------------------------------------
    if args.top_up:
        state = load_state(args.taxonomy)
        if state is None:
            print(
                f"[ERROR] No state file found for '{args.taxonomy}'.\n"
                f"        Run a full historical load first (without --top-up) "
                f"to create the state file.",
                file=sys.stderr,
            )
            sys.exit(1)

        last_run = datetime.fromisoformat(state["last_run_date"]).replace(tzinfo=timezone.utc)

        if last_run.date() >= today.date():
            print(f"✅  '{args.taxonomy}' is already up to date (last run: {state['last_run_date']}).")
            sys.exit(0)

        gap_days     = (today.date() - last_run.date()).days
        top_up_start = last_run + timedelta(days=1)
        print(
            f"⬆️   Topping up '{args.taxonomy}': "
            f"{gap_days} day(s) from {top_up_start.date()} → {today.date()}"
        )

        # Restore stored values — the user never needs to know any of these
        args.seed  = state["seed"]
        args.users = state["users"]
        api_key    = os.environ.get("AMPLITUDE_API_KEY") or state["api_key"]

        run(taxonomy, args, api_key,
            date_range=(top_up_start, today + timedelta(days=1)))

        if not args.dry_run:
            save_state(args.taxonomy, args.seed, api_key,
                       args.users, today.date().isoformat())
        return

    # -----------------------------------------------------------------------
    # Normal run — prompt for API key then generate the full date window.
    # -----------------------------------------------------------------------
    api_key = ""
    if not args.dry_run and not getattr(args, "output_file", None):
        if args.api_key:
            api_key = args.api_key.strip()
        else:
            api_key = getpass.getpass("Enter your Amplitude HTTP API key: ").strip()
        if not api_key:
            print("[ERROR] API key cannot be empty.", file=sys.stderr)
            sys.exit(1)

    run(taxonomy, args, api_key)

    # Persist state so --top-up works next time
    if not args.dry_run and not getattr(args, "output_file", None):
        save_state(args.taxonomy, args.seed, api_key,
                   args.users, today.date().isoformat())


if __name__ == "__main__":
    main()
