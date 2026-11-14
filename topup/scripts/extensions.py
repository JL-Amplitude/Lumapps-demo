"""
Optional generator extensions, activated only by taxonomy keys:

  taxonomy["accounts"]            → B2B accounts (Amplitude Accounts add-on):
                                    group on every event + Group Identify props,
                                    per-account engagement trends (at-risk / growing)
                                    and extra light "engagement" sessions.
  taxonomy["agent_extensions"]    → AI agent / LLM properties on agent events and
                                    an "agent_response_rated" event.
  taxonomy["identity_stitching"]  → anonymous login events (device_id only) merged
                                    on login; device_id on every event.
  taxonomy["legacy_backfill_days"]→ ingestion_source = legacy_backfill | sdk.

Taxonomies without these keys are unaffected.
"""

import hashlib
import json
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

# ---------------------------------------------------------------------------
# Accounts
# ---------------------------------------------------------------------------

_COMPANY_NAMES = [
    "Northwind Retail", "Helios Health", "Brightline Foods", "Atlas Manufacturing",
    "Corvid Logistics", "Meridian Bank", "Pinecrest Hospitals", "Vantage Motors",
    "Oakridge Pharma", "Solstice Hotels", "Granite Steelworks", "Bluewave Telecom",
    "Ember Coffee Co", "Kestrel Aerospace", "Lumen Energy", "Harbor Grocers",
    "Summit Insurance", "Crescent Fashion", "Ironclad Tools", "Willow Care Homes",
    "Polaris Software", "Redwood Construction", "Sapphire Airlines", "Tidal Shipping",
    "Orchard Supermarkets", "Quantum Labs", "Riverbend Clinics", "Falcon Security",
    "Nimbus Cloud", "Evergreen Utilities", "Cobalt Chemicals", "Juniper Banking",
    "Maple Leaf Pharmacies", "Stonegate Hospitality", "Aurora Biotech", "Beacon Retail Group",
    "Copperfield Mining", "Driftwood Outdoor", "Horizon Automotive", "Lighthouse Media",
]
_FRONTLINE_INDUSTRIES = ["Retail", "Manufacturing", "Healthcare", "Hospitality", "Logistics"]
_DESK_INDUSTRIES      = ["Financial Services", "Technology", "Pharma", "Energy", "Media"]
_CSMS = ["Camille Durand", "Lucas Martin", "Sofia Rossi", "Noah Becker", "Emma Laurent", "Hugo Moreau"]
_REGIONS = ["EMEA", "NA", "APAC", "LATAM"]
_PLAN_TIERS = {"Essential": (40_000, 120_000), "Business": (120_000, 400_000),
               "Enterprise": (400_000, 1_500_000)}


_NAME_INDUSTRY = {
    "Northwind Retail": "Retail", "Helios Health": "Healthcare", "Brightline Foods": "Manufacturing",
    "Atlas Manufacturing": "Manufacturing", "Corvid Logistics": "Logistics", "Meridian Bank": "Financial Services",
    "Pinecrest Hospitals": "Healthcare", "Vantage Motors": "Manufacturing", "Oakridge Pharma": "Pharma",
    "Solstice Hotels": "Hospitality", "Granite Steelworks": "Manufacturing", "Bluewave Telecom": "Technology",
    "Ember Coffee Co": "Hospitality", "Kestrel Aerospace": "Manufacturing", "Lumen Energy": "Energy",
    "Harbor Grocers": "Retail", "Summit Insurance": "Financial Services", "Crescent Fashion": "Retail",
    "Ironclad Tools": "Manufacturing", "Willow Care Homes": "Healthcare", "Polaris Software": "Technology",
    "Redwood Construction": "Construction", "Sapphire Airlines": "Hospitality", "Tidal Shipping": "Logistics",
    "Orchard Supermarkets": "Retail", "Quantum Labs": "Technology", "Riverbend Clinics": "Healthcare",
    "Falcon Security": "Logistics", "Nimbus Cloud": "Technology", "Evergreen Utilities": "Energy",
    "Cobalt Chemicals": "Manufacturing", "Juniper Banking": "Financial Services", "Maple Leaf Pharmacies": "Retail",
    "Stonegate Hospitality": "Hospitality", "Aurora Biotech": "Pharma", "Beacon Retail Group": "Retail",
    "Copperfield Mining": "Manufacturing", "Driftwood Outdoor": "Retail", "Horizon Automotive": "Manufacturing",
    "Lighthouse Media": "Media",
}


def create_accounts(taxonomy: dict, seed: int) -> list[dict]:
    cfg = taxonomy["accounts"]
    rng = random.Random(f"{seed}|accounts")
    n = min(cfg.get("n_accounts", 40), len(_COMPANY_NAMES))
    names = _COMPANY_NAMES[:n]
    today = datetime.now(timezone.utc).date()
    accounts = []
    for i, name in enumerate(names):
        frontline_heavy = i % 5 < 3        # ~60% frontline-heavy accounts
        industry = rng.choice(_FRONTLINE_INDUSTRIES if frontline_heavy else _DESK_INDUSTRIES)
        tier = rng.choices(list(_PLAN_TIERS), weights=[0.35, 0.40, 0.25])[0]
        lo, hi = _PLAN_TIERS[tier]
        seats = {"Essential": rng.randint(300, 1500), "Business": rng.randint(1500, 8000),
                 "Enterprise": rng.randint(8000, 60000)}[tier]
        suite = rng.choice(["microsoft_365", "google_workspace"])
        integrations = [suite]
        if rng.random() < 0.6:
            integrations.append("sap_successfactors")
        if rng.random() < 0.4:
            integrations.append("servicenow")
        accounts.append({
            "account_id": f"acc_{1000 + i}",
            "account_name": name,
            "industry": _NAME_INDUSTRY.get(name, industry),
            "frontline_heavy": frontline_heavy,
            "plan_tier": tier,
            "arr": rng.randrange(lo, hi, 1000),
            "licensed_seats": seats,
            "csm_owner": rng.choice(_CSMS),
            "region": rng.choice(_REGIONS),
            "primary_suite": suite,
            "integrations_enabled": integrations,
            "contract_start_date": (today - timedelta(days=rng.randint(60, 1400))).isoformat(),
            "trend": "stable",
        })
    # Assign engagement trends deterministically
    idx = list(range(n))
    rng.shuffle(idx)
    n_risk = round(n * cfg.get("at_risk_share", 0.15))
    n_grow = round(n * cfg.get("growing_share", 0.20))
    for j in idx[:n_risk]:
        accounts[j]["trend"] = "declining"
    for j in idx[n_risk:n_risk + n_grow]:
        accounts[j]["trend"] = "growing"
    for a in accounts:
        if a["trend"] == "declining":
            a["renewal_date"] = (today + timedelta(days=rng.randint(30, 120))).isoformat()
            a["lifecycle_stage"] = "mature"
        elif a["trend"] == "growing":
            a["renewal_date"] = (today + timedelta(days=rng.randint(200, 365))).isoformat()
            a["lifecycle_stage"] = "onboarding"
        else:
            a["renewal_date"] = (today + timedelta(days=rng.randint(60, 365))).isoformat()
            a["lifecycle_stage"] = rng.choice(["adopting", "mature"])
    return accounts


def assign_account(user, accounts: list[dict], seed: int) -> dict:
    rng = random.Random(f"{seed}|{user.user_id}|account")
    frontline_user = not user.payment_method_saved
    weights = []
    for a in accounts:
        w = 1.0 + a["licensed_seats"] / 20000
        if a["frontline_heavy"] == frontline_user:
            w *= 3.0
        weights.append(w)
    return rng.choices(accounts, weights=weights, k=1)[0]


def trend_multiplier(account: Optional[dict], day_idx: int, full_days: int) -> float:
    if not account:
        return 1.0
    x = day_idx / max(full_days - 1, 1)
    if account["trend"] == "declining":
        return max(0.08, 1.7 - 1.75 * x)
    if account["trend"] == "growing":
        return 0.35 + 1.4 * x
    return 1.0


def group_identify_records(accounts: list[dict], group_type: str) -> list[dict]:
    recs = []
    for a in accounts:
        props = {k: v for k, v in a.items() if k not in ("trend", "frontline_heavy")}
        recs.append({"group_type": group_type, "group_value": a["account_name"],
                     "group_properties": {"$set": props}})
    return recs


# ---------------------------------------------------------------------------
# Device / identity
# ---------------------------------------------------------------------------

def device_id_for(user_id: str, seed: int) -> str:
    rng = random.Random(f"{seed}|{user_id}|device")
    return str(uuid.UUID(int=rng.getrandbits(128))).upper()


def platform_for(device_type: str, user_id: str) -> str:
    if device_type == "desktop":
        return "Web"
    return "iOS" if int(hashlib.sha256(user_id.encode()).hexdigest(), 16) % 2 else "Android"


def _iid(*parts) -> str:
    return hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()[:32]


def login_events(user, session_ms: int, taxonomy: dict, rng: random.Random) -> list[dict]:
    """Anonymous pre-login event + login event that stitches device_id → user_id."""
    ev = taxonomy["event_names"]
    sso = user.payment_method_saved
    if sso:
        method = "sso_" + ((user.account or {}).get("primary_suite", "microsoft_365"))
    else:
        method = rng.choice(["passwordless_sms", "badge_qr_code", "magic_link_personal_email"])
    t0 = session_ms - rng.randint(20, 90) * 1000
    anon = {
        "device_id": user.device_id, "event_type": ev["login_page_viewed"], "time": t0,
        "session_id": session_ms, "insert_id": _iid(user.device_id, "login_page", t0),
        "event_properties": {"login_options_shown": ["sso", "passwordless"] if not sso else ["sso"],
                             "entry_point": rng.choice(["email_digest_link", "mobile_app", "bookmark", "teams_tab"])},
    }
    t1 = t0 + rng.randint(8, 40) * 1000
    login = {
        "user_id": user.user_id, "device_id": user.device_id,
        "event_type": ev["login_completed"], "time": t1, "session_id": session_ms,
        "insert_id": _iid(user.user_id, "login_completed", t1),
        "event_properties": {"login_method": method, "has_corporate_email": sso,
                             "first_login": True},
    }
    return [anon, login]


# ---------------------------------------------------------------------------
# Light engagement sessions (communications / frontline)
# ---------------------------------------------------------------------------

def light_session(user, session_ms: int, taxonomy: dict, rng: random.Random, build_event) -> list[dict]:
    p = user.persona
    events = []
    ts = session_ms

    def emit(key, props):
        nonlocal ts
        events.append(build_event(key, user, session_ms, ts, taxonomy, props))
        ts += rng.randint(15, 180) * 1000

    emit("homepage_viewed", {"referrer_source": rng.choice(["email_digest", "push_notification", "direct", "teams_tab"]),
                             "is_return_visit": True})
    frontline = not user.payment_method_saved
    if rng.random() < (0.75 if frontline else 0.15):
        emit("promo_code_entered", {"shift_location": rng.choice(["Store 112", "Plant B", "Ward 4", "Warehouse 7", "Store 38"]),
                                    "shift_hours": rng.choice([4, 6, 8, 10, 12]),
                                    "view_range": rng.choice(["today", "this_week", "next_week"])})
    if rng.random() < 0.7:
        emit("category_browsed", {"category_name": rng.choice(["Company News", "Leadership", "My Site", "HR Updates", "Safety", "Local News"]),
                                  "items_visible": rng.randint(5, 25), "filter_used": rng.random() < 0.2,
                                  "sort_applied": rng.choice(["for_you", "latest"])})
    if rng.random() < 0.45:
        emit("promotion_viewed", {"promotion_type": rng.choice(["ceo_video", "town_hall_recap", "policy_update", "urgent_alert"]),
                                  "discount_pct": rng.choice([25, 50, 100]),
                                  "delivered_via": rng.choice(["web", "mobile_push", "email"])})
    if rng.random() < 0.3:
        emit("product_review_read", {"reviews_read": rng.randint(1, 15)})
    if rng.random() < 0.25:
        emit("recommendation_clicked", {"recommendation_context": rng.choice(["for_you", "trending", "role_based"]),
                                        "position_in_list": rng.randint(1, 6)})
    if rng.random() < 0.3:
        helpful = rng.random() < (0.78 if not frontline else 0.64)
        emit("product_searched", {"query_term": rng.choice(["holiday policy", "payslip", "expense policy", "wifi password",
                                                             "parental leave", "benefits enrollment", "shift swap", "safety training"]),
                                  "results_count": rng.randint(0, 40), "zero_results": rng.random() < 0.08,
                                  "answered_by_ai": rng.random() < 0.6, "answer_helpful": helpful})
    if rng.random() < 0.1:
        emit("product_saved", {"content_type": rng.choice(["article", "policy", "event"])})
    emit("session_ended", {"deepest_funnel_step_reached": 1, "converted": False,
                           "session_duration_seconds": (ts - session_ms) // 1000})
    return events


# ---------------------------------------------------------------------------
# Enrichment (applied to every event of a session)
# ---------------------------------------------------------------------------

_AGENT_META = {
    "HR Assistant":      ("hr_assistant",      "sap_successfactors"),
    "IT Helpdesk":       ("it_helpdesk",       "servicenow"),
    "Knowledge Agent":   ("knowledge_agent",   None),          # uses primary suite
    "PTO & Leave":       ("pto_leave_agent",   "sap_successfactors"),
    "Expense Approvals": ("expense_approvals", None),
}
_MODELS = ["claude-sonnet-4", "gpt-4.1", "gemini-2.5-pro"]


def enrich_session(events: list[dict], user, taxonomy: dict, rng: random.Random,
                   today: datetime) -> list[dict]:
    ev = taxonomy["event_names"]
    pmap = taxonomy.get("event_property_names", {})
    agent_type_key = pmap.get("item_category", "item_category")
    agent_events = {ev[k] for k in ("product_detail_viewed", "add_to_cart", "checkout_started",
                                    "order_completed", "price_breakdown_viewed", "cart_abandoned")}
    group_type = taxonomy.get("accounts", {}).get("group_type", "account")
    backfill_days = taxonomy.get("legacy_backfill_days")
    platform = platform_for(user.device_type, user.user_id)
    channel = "mobile_app" if platform != "Web" else rng.choice(["web", "web", "teams", "google_chat"])
    model = rng.choice(_MODELS)

    # Session-level agent context (from the Agent Task Started item)
    agent_type = next((e["event_properties"].get(agent_type_key) for e in events
                       if e.get("event_type") in agent_events and e["event_properties"].get(agent_type_key)), None)

    out = []
    for e in events:
        if user.account:
            e["groups"] = {group_type: user.account["account_name"]}
            if not e.get("event_type", "").startswith("$"):
                e["event_properties"]["account_id"] = user.account["account_id"]
        if user.device_id:
            e["device_id"] = user.device_id
        e["platform"] = platform
        if e.get("event_type", "").startswith("$"):
            out.append(e)
            continue
        e["event_properties"]["platform_channel"] = channel
        if backfill_days is not None and "ingestion_source" not in e["event_properties"]:
            age = (today - datetime.fromtimestamp(e["time"] / 1000, tz=timezone.utc)).days
            e["event_properties"]["ingestion_source"] = "legacy_backfill" if age > backfill_days else (
                "mobile_sdk" if platform != "Web" else "browser_sdk")

        if taxonomy.get("agent_extensions") and e.get("event_type") in agent_events and agent_type:
            name, connector = _AGENT_META.get(agent_type, ("general_agent", None))
            connector = connector or (user.account or {}).get("primary_suite", "microsoft_365")
            props = e["event_properties"]
            props.setdefault(agent_type_key, agent_type)
            props["agent_name"] = name
            props["connector"] = connector
            props["llm_model"] = model
            if e["event_type"] in (ev["add_to_cart"], ev["order_completed"]):
                props["response_latency_ms"] = rng.randint(600, 4800)
                props["tokens_used"] = rng.randint(400, 6000)
            if e["event_type"] == ev["price_breakdown_viewed"]:
                props["dismiss_reason"] = ("no_corporate_account" if not user.payment_method_saved
                                           else rng.choice(["closed_prompt", "timeout", "mfa_failed"]))
            if e["event_type"] == ev["order_completed"]:
                props["resolution_status"] = "resolved"
            if e["event_type"] == ev["cart_abandoned"]:
                props["resolution_status"] = "abandoned_at_authorization"
        out.append(e)

        # Agent feedback after completion
        if (taxonomy.get("agent_extensions") and e.get("event_type") == ev["order_completed"]
                and "agent_response_rated" in ev and rng.random() < 0.45):
            t = e["time"] + rng.randint(5, 40) * 1000
            rating = rng.choices([5, 4, 3, 2, 1], weights=[0.45, 0.30, 0.12, 0.08, 0.05])[0]
            fb = {k: v for k, v in e.items() if k not in ("event_type", "time", "insert_id", "event_properties")}
            fb.update({"event_type": ev["agent_response_rated"], "time": t,
                       "insert_id": _iid(user.user_id, "agent_rated", t),
                       "event_properties": {"agent_name": e["event_properties"].get("agent_name"),
                                            agent_type_key: agent_type, "rating": rating,
                                            "thumbs": "up" if rating >= 4 else "down",
                                            "llm_model": model, "platform_channel": channel,
                                            "account_id": e["event_properties"].get("account_id"),
                                            "ingestion_source": e["event_properties"].get("ingestion_source")}})
            out.append(fb)
    return out
