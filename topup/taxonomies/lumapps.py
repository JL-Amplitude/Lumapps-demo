"""
Lumapps taxonomy for the Amplitude demo event generator.
Employees ask an AI agent in the Agent Hub to complete a task (PTO, IT ticket,
approval); the agent must be authorised on a connected system (M365 / Google
Workspace / SAP SuccessFactors). Frontline workers without corporate SSO hit a
connector sign-in prompt they can't complete and dismiss it, dropping off
between "Agent Task Started" and "Agent Action Authorized".
"""

TAXONOMY: dict = {
    "industry":      "lumapps",
    "display_name":  "Lumapps",
    "tax_rate":      0.0,

    "event_names": {
        "homepage_viewed":        "Intranet Home Viewed",
        "product_detail_viewed":  "Agent Hub Opened",
        "add_to_cart":            "Agent Task Started",
        "checkout_started":       "Agent Action Authorized",
        "order_completed":        "Agent Task Completed",
        "price_breakdown_viewed": "Connector Sign-In Prompt Dismissed",
        "session_ended":          "session_ended",
        "product_searched":       "Knowledge Search Performed",
        "category_browsed":       "News Feed Browsed",
        "product_saved":          "Article Bookmarked",
        "recommendation_clicked": "Recommended Content Clicked",
        "promotion_viewed":       "Leadership Announcement Viewed",
        "product_review_read":    "Post Comments Viewed",
        "cart_abandoned":         "Agent Task Abandoned",
        "promo_code_entered":     "Shift Schedule Viewed",
        # Lumapps extension events (identity stitching + AI agent feedback)
        "login_page_viewed":      "Login Page Viewed",
        "login_completed":        "Login Completed",
        "agent_response_rated":   "Agent Response Rated",
    },

    "event_property_names": {
        "item_id":                "agent_task_id",
        "item_category":          "agent_type",
        "item_price":             "estimated_minutes_saved",
        "cart_total":             "total_minutes_saved",
        "shipping_cost":          "connector_wait_seconds",
        "tax_amount":             "tax_amount",
        "total_amount":           "task_effort_minutes",
        "free_shipping_eligible": "connector_preauthorized",
        "order_id":               "request_reference_id",
        "is_first_order":         "is_first_agent_task",
        "query_term":             "search_query",
        "results_count":          "results_returned",
        "category_name":          "feed_channel",
        "items_visible":          "posts_shown",
        "rating_score":           "agent_satisfaction_score",
        "promotion_type":         "announcement_format",
        "discount_pct":           "audience_targeting_pct",
        "discount_value":         "shift_hours",
        "promo_attempted":        "schedule_checked",
        "promo_applied":          "schedule_change_requested",
        "payment_method_saved":   "corporate_sso_enabled",
        "is_return_visit":        "is_returning_employee",
    },

    "user_property_names": {
        "payment_method_saved": "corporate_sso_enabled",
        "loyalty_tier":         "workforce_type",
        "acquisition_source":   "utm_medium",
        "account_age_days":     "employee_tenure_days",
        "device_type":          "device_type",
    },

    "product_categories": ["HR Assistant", "IT Helpdesk", "Knowledge Agent",
                           "PTO & Leave", "Expense Approvals"],
    "item_price_range":   (5, 45),  # estimated minutes saved per agent task

    # ── Lumapps-specific extensions (used by generate.py when present) ──────
    "accounts": {
        "group_type": "account",
        "n_accounts": 40,
        "at_risk_share": 0.15,     # accounts whose engagement decays over the window
        "growing_share": 0.20,     # accounts ramping up (recent go-lives)
    },
    "agent_extensions": True,       # agent/LLM props on agent events
    "identity_stitching": True,     # anonymous login events merged on sign-in
    "legacy_backfill_days": 14,     # events older than N days tagged legacy_backfill

    "persona_a": {
        "name":                 "desk_workers",
        "share":                0.40,
        "payment_method_saved": True,

        "loyalty_tier_weights":       {"manager": 0.40, "knowledge_worker": 0.40, "frontline": 0.20},
        "acquisition_source_weights": {
            "search": 0.35, "organic search": 0.20,
            "social": 0.20, "direct": 0.15,
            "affiliate": 0.07, "llm": 0.03,
        },
        "account_age_days_range":  (90, 730),
        "device_type_weights":     {"desktop": 0.55, "mobile": 0.35, "tablet": 0.10},

        "step1_to_step2_rate": 0.88,
        "step2_to_step3_rate": 0.78,
        "step3_to_step4_rate": 0.84,
        "step4_to_step5_rate": 0.90,

        "free_shipping_rate":  0.70,
        "shipping_cost_range": (0.0, 0.0),

        "friction_event_rate_dropper":   0.85,
        "friction_event_rate_converter": 0.20,

        "product_searched_rate":       0.40,
        "category_browsed_rate":       0.65,
        "product_saved_rate":          0.25,
        "recommendation_clicked_rate": 0.30,
        "promotion_viewed_rate":       0.35,
        "product_review_read_rate":    0.40,
        "promo_code_entered_rate":     0.10,
        "multi_item_loop_rate":        0.45,
        "category_reentry_rate":       0.20,
        "session_reentry_rate":        0.10,
    },

    "persona_b": {
        "name":                 "frontline_workers",
        "share":                0.60,
        "payment_method_saved": False,

        "loyalty_tier_weights":       {"manager": 0.05, "knowledge_worker": 0.15, "frontline": 0.80},
        "acquisition_source_weights": {
            "search": 0.15, "organic search": 0.10,
            "social": 0.25, "direct": 0.10,
            "affiliate": 0.05, "llm": 0.35,
        },
        "account_age_days_range":  (0, 90),
        "device_type_weights":     {"desktop": 0.35, "mobile": 0.55, "tablet": 0.10},

        "step1_to_step2_rate": 0.76,
        "step2_to_step3_rate": 0.60,
        "step3_to_step4_rate": 0.16,
        "step4_to_step5_rate": 0.84,

        "free_shipping_rate":  0.20,
        "shipping_cost_range": (0.0, 0.0),

        "friction_event_rate_dropper":   0.85,
        "friction_event_rate_converter": 0.20,

        "product_searched_rate":       0.55,
        "category_browsed_rate":       0.50,
        "product_saved_rate":          0.15,
        "recommendation_clicked_rate": 0.20,
        "promotion_viewed_rate":       0.50,
        "product_review_read_rate":    0.55,
        "promo_code_entered_rate":     0.45,
        "multi_item_loop_rate":        0.25,
        "category_reentry_rate":       0.30,
        "session_reentry_rate":        0.20,
    },
}
