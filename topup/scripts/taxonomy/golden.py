"""
Golden taxonomy — canonical e-commerce event and property names.

This is the source of truth for the demo dataset. The generator uses these
keys internally. Industry overrides map each key to a new display name;
any key not overridden falls back to the value defined here.
"""

# ---------------------------------------------------------------------------
# Events
# All 15 canonical event keys → default display names (golden = e-commerce).
# ---------------------------------------------------------------------------

EVENTS: dict[str, str] = {
    # --- 5-step funnel ---
    "homepage_viewed":        "homepage_viewed",
    "product_detail_viewed":  "product_detail_viewed",
    "add_to_cart":            "add_to_cart",
    "checkout_started":       "checkout_started",
    "order_completed":        "order_completed",
    # --- supporting events ---
    "category_browsed":       "category_browsed",
    "product_searched":       "product_searched",
    "product_saved":          "product_saved",
    "recommendation_clicked": "recommendation_clicked",
    "promotion_viewed":       "promotion_viewed",
    "price_breakdown_viewed": "price_breakdown_viewed",   # friction event
    "promo_code_entered":     "promo_code_entered",
    "product_review_read":    "product_review_read",
    "cart_abandoned":         "cart_abandoned",
    "session_ended":          "session_ended",
}

# Ordered funnel steps (canonical keys)
FUNNEL_STEPS: list[str] = [
    "homepage_viewed",
    "product_detail_viewed",
    "add_to_cart",
    "checkout_started",
    "order_completed",
]

# The event that fires between Step 3 and Step 4, carrying the friction signal
FRICTION_EVENT = "price_breakdown_viewed"

# All canonical keys — used by the validator
CANONICAL_KEYS: list[str] = list(EVENTS.keys())

# ---------------------------------------------------------------------------
# User properties
# ---------------------------------------------------------------------------

USER_PROPERTIES: dict[str, str] = {
    "payment_method_saved": "payment_method_saved",  # bool — primary friction signal
    "loyalty_tier":         "loyalty_tier",           # "gold" | "silver" | "new"
    "acquisition_source":   "acquisition_source",     # channel
    "account_age_days":     "account_age_days",       # int
    "device_type":          "device_type",            # "desktop" | "mobile" | "tablet"
}

# ---------------------------------------------------------------------------
# Persona definitions
# Drive conversion rates and all signal distributions.
# ---------------------------------------------------------------------------

PERSONA_A: dict = {
    "name": "saved_payment_user",
    "share": 0.40,
    # User property values
    "payment_method_saved": True,
    "loyalty_tier_weights": {"gold": 0.40, "silver": 0.40, "new": 0.20},
    "acquisition_source_weights": {
        "organic": 0.30, "email": 0.35, "paid_search": 0.20,
        "social": 0.10, "direct": 0.05,
    },
    "account_age_days_range": (90, 730),
    "device_type_weights": {"desktop": 0.55, "mobile": 0.35, "tablet": 0.10},
    # Funnel conversion rates
    "step1_to_step2_rate": 0.88,
    "step2_to_step3_rate": 0.78,
    "step3_to_step4_rate": 0.84,
    "step4_to_step5_rate": 0.90,
    # Friction event behaviour
    "free_shipping_rate": 0.85,     # probability of free_shipping_eligible: True
    "shipping_cost_range": (0.0, 4.99),
    # Friction event fire rates — high for droppers, low for converters.
    # This asymmetry is what makes the event surface at the top of Amplitude's
    # Conversion Drivers "Dropped Off" report.
    "friction_event_rate_dropper":   0.90,
    "friction_event_rate_converter": 0.15,
    # Supporting event probabilities (per session)
    "category_browsed_rate": 0.65,
    "product_searched_rate": 0.40,
    "product_saved_rate": 0.25,
    "recommendation_clicked_rate": 0.30,
    "promotion_viewed_rate": 0.35,
    "promo_code_entered_rate": 0.10,   # low — already loyal
    "product_review_read_rate": 0.40,
    "multi_item_loop_rate": 0.45,      # view a second product before adding to cart
    "category_reentry_rate": 0.20,
    "session_reentry_rate": 0.10,      # second session same day
}

PERSONA_B: dict = {
    "name": "no_saved_payment_user",
    "share": 0.60,
    # User property values
    "payment_method_saved": False,
    "loyalty_tier_weights": {"gold": 0.05, "silver": 0.15, "new": 0.80},
    "acquisition_source_weights": {
        "organic": 0.25, "paid_search": 0.40, "social": 0.25,
        "email": 0.05, "direct": 0.05,
    },
    "account_age_days_range": (0, 90),
    "device_type_weights": {"desktop": 0.35, "mobile": 0.55, "tablet": 0.10},
    # Funnel conversion rates
    "step1_to_step2_rate": 0.76,
    "step2_to_step3_rate": 0.60,
    "step3_to_step4_rate": 0.16,
    "step4_to_step5_rate": 0.84,
    # Friction event behaviour
    "free_shipping_rate": 0.10,
    "shipping_cost_range": (4.99, 14.99),
    # Friction event fire rates (same asymmetry as Persona A — rates are fixed by design)
    "friction_event_rate_dropper":   0.90,
    "friction_event_rate_converter": 0.15,
    # Supporting event probabilities (per session)
    "category_browsed_rate": 0.50,
    "product_searched_rate": 0.55,
    "product_saved_rate": 0.15,
    "recommendation_clicked_rate": 0.20,
    "promotion_viewed_rate": 0.50,
    "promo_code_entered_rate": 0.45,   # high — price-sensitive, looking for discounts
    "product_review_read_rate": 0.55,
    "multi_item_loop_rate": 0.25,
    "category_reentry_rate": 0.30,
    "session_reentry_rate": 0.20,
}

PERSONAS: list[dict] = [PERSONA_A, PERSONA_B]

# ---------------------------------------------------------------------------
# Product catalogue
# ---------------------------------------------------------------------------

PRODUCT_CATEGORIES: list[str] = [
    "electronics", "clothing", "home_living", "beauty", "sports",
]

ITEM_PRICE_RANGE: tuple[float, float] = (9.99, 499.99)
TAX_RATE: float = 0.08   # 8% applied to item price

# ---------------------------------------------------------------------------
# Golden taxonomy bundle (used by taxonomy loader)
# ---------------------------------------------------------------------------

TAXONOMY: dict = {
    "industry": "ecommerce",
    "display_name": "E-commerce Golden Dataset",
    "event_names": EVENTS,
    "event_property_names": {
        "item_id":               "item_id",
        "item_category":         "item_category",
        "item_price":            "item_price",
        "cart_total":            "cart_total",
        "shipping_cost":         "shipping_cost",
        "tax_amount":            "tax_amount",
        "total_amount":          "total_amount",
        "free_shipping_eligible": "free_shipping_eligible",
        "order_id":              "order_id",
        "is_first_order":        "is_first_order",
        "query_term":            "query_term",
        "results_count":         "results_count",
        "category_name":         "category_name",
        "items_visible":         "items_visible",
        "rating_score":          "rating_score",
        "promotion_type":        "promotion_type",
        "discount_pct":          "discount_pct",
        "discount_value":        "discount_value",
        "promo_attempted":       "promo_attempted",
        "promo_applied":         "promo_applied",
        "payment_method_saved":  "payment_method_saved",
        "is_return_visit":       "is_return_visit",
    },
    "user_property_names": USER_PROPERTIES,
    "persona_a": PERSONA_A,
    "persona_b": PERSONA_B,
    "product_categories": PRODUCT_CATEGORIES,
    "item_price_range": ITEM_PRICE_RANGE,
}