"""
taxonomy/__init__.py — taxonomy loader for the Amplitude demo generator.

Searches several well-known locations for a <slug>.py taxonomy file,
imports it, validates the TAXONOMY dict, and returns it to the caller.

Search order:
  1. mnt/<workspace>/taxonomies/<slug>.py   — persistent Cowork output
  2. mnt/outputs/taxonomies/<slug>.py       — legacy output path
  3. ~/.claude/demo-taxonomies/<slug>.py    — same-session fallback
  4. <cwd>/<slug>.py                        — local convenience
  5. <this package dir>/golden.py           — bundled reference (golden only)
"""

import importlib.util
from pathlib import Path

# ---------------------------------------------------------------------------
# Required top-level keys every taxonomy must define
# ---------------------------------------------------------------------------

_REQUIRED_KEYS = [
    "industry",
    "display_name",
    "event_names",
    "event_property_names",
    "user_property_names",
    "product_categories",
    "item_price_range",
    "persona_a",
    "persona_b",
]

_REQUIRED_EVENT_KEYS = [
    "homepage_viewed",
    "product_detail_viewed",
    "add_to_cart",
    "checkout_started",
    "order_completed",
    "price_breakdown_viewed",
    "session_ended",
]

_REQUIRED_PERSONA_KEYS = [
    "name", "share",
    "payment_method_saved",
    "loyalty_tier_weights",
    "acquisition_source_weights",
    "account_age_days_range",
    "device_type_weights",
    "step1_to_step2_rate",
    "step2_to_step3_rate",
    "step3_to_step4_rate",
    "step4_to_step5_rate",
    "free_shipping_rate",
    "shipping_cost_range",
    "friction_event_rate_dropper",
    "friction_event_rate_converter",
    "product_searched_rate",
    "category_browsed_rate",
    "product_saved_rate",
    "recommendation_clicked_rate",
    "promotion_viewed_rate",
    "product_review_read_rate",
    "promo_code_entered_rate",
    "multi_item_loop_rate",
    "category_reentry_rate",
    "session_reentry_rate",
]


# ---------------------------------------------------------------------------
# Path resolution
# ---------------------------------------------------------------------------

def _search_paths(slug: str) -> list[Path]:
    """Return candidate paths in priority order."""
    script_dir = Path(__file__).resolve().parent   # .../scripts/taxonomy/
    scripts_dir = script_dir.parent                # .../scripts/
    skill_dir   = scripts_dir.parent               # .../demo-event-generator/

    candidates: list[Path] = []

    # 1. taxonomies/ folder next to scripts/ inside the skill directory
    #    This is the primary persistent location in both claude.ai and Cowork.
    #    Structure: demo-event-generator/taxonomies/<slug>.py
    candidates.append(skill_dir / "taxonomies" / f"{slug}.py")

    # 2. Home-directory fallback (same-session convenience)
    candidates.append(Path.home() / ".claude" / "demo-taxonomies" / f"{slug}.py")

    # 3. Current working directory
    candidates.append(Path.cwd() / f"{slug}.py")

    # 4. Bundled reference taxonomy (golden only)
    candidates.append(script_dir / f"{slug}.py")

    return candidates


def _safe_exists(p: Path) -> bool:
    try:
        return p.exists()
    except (PermissionError, OSError):
        return False


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_taxonomy(slug: str) -> dict:
    """
    Load and return the TAXONOMY dict for the given slug.

    Raises FileNotFoundError if no matching file is found.
    Raises ValueError if the file does not define a TAXONOMY dict.
    """
    candidates = _search_paths(slug)
    taxonomy_file = next((p for p in candidates if _safe_exists(p)), None)

    if taxonomy_file is None:
        searched = "\n".join(f"  • {p}" for p in candidates)
        raise FileNotFoundError(
            f"Taxonomy '{slug}' not found. Searched:\n{searched}\n\n"
            f"Run the demo-event-generator skill to create a custom taxonomy,\n"
            f"or use --taxonomy golden for the bundled e-commerce reference."
        )

    spec = importlib.util.spec_from_file_location(f"_taxonomy_{slug}", taxonomy_file)
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    if not hasattr(mod, "TAXONOMY"):
        raise ValueError(
            f"{taxonomy_file} must define a module-level TAXONOMY dict."
        )

    return mod.TAXONOMY


def validate_taxonomy(taxonomy: dict) -> None:
    """
    Validate that a taxonomy dict contains all required keys and structure.

    Raises ValueError describing the first problem found.
    """
    # Top-level keys
    for key in _REQUIRED_KEYS:
        if key not in taxonomy:
            raise ValueError(f"Taxonomy is missing required top-level key: '{key}'")

    # event_names completeness
    event_names = taxonomy["event_names"]
    for key in _REQUIRED_EVENT_KEYS:
        if key not in event_names:
            raise ValueError(f"taxonomy['event_names'] is missing required key: '{key}'")
        if not isinstance(event_names[key], str) or not event_names[key].strip():
            raise ValueError(
                f"taxonomy['event_names']['{key}'] must be a non-empty string "
                f"(got: {event_names[key]!r})"
            )

    # item_price_range
    price_range = taxonomy["item_price_range"]
    if not (isinstance(price_range, (list, tuple)) and len(price_range) == 2):
        raise ValueError("taxonomy['item_price_range'] must be a (lo, hi) tuple")
    lo, hi = price_range
    if lo > hi:
        raise ValueError(
            f"taxonomy['item_price_range'] lo ({lo}) must be <= hi ({hi})"
        )

    # product_categories
    cats = taxonomy["product_categories"]
    if not isinstance(cats, list) or len(cats) == 0:
        raise ValueError("taxonomy['product_categories'] must be a non-empty list")

    # Persona keys
    for persona_key in ("persona_a", "persona_b"):
        persona = taxonomy[persona_key]
        for key in _REQUIRED_PERSONA_KEYS:
            if key not in persona:
                raise ValueError(
                    f"taxonomy['{persona_key}'] is missing required key: '{key}'"
                )

    # Persona shares sum to ~1.0
    total_share = taxonomy["persona_a"]["share"] + taxonomy["persona_b"]["share"]
    if not (0.99 <= total_share <= 1.01):
        raise ValueError(
            f"persona_a.share + persona_b.share must sum to 1.0 (got {total_share:.3f})"
        )
