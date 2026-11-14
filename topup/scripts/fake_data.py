#!/usr/bin/env python3
"""
fake_data.py — lightweight Faker replacement for the Amplitude demo generator.

Provides the same interface as the `faker` library for the methods used by
generate.py, with no external dependencies. Import this as a fallback when
`faker` is not installed:

    try:
        from faker import Faker
    except ImportError:
        from fake_data import Faker
"""

import random

# ---------------------------------------------------------------------------
# Word lists
# ---------------------------------------------------------------------------

_FIRST_NAMES = [
    "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael",
    "Linda", "William", "Barbara", "David", "Susan", "Richard", "Jessica",
    "Joseph", "Sarah", "Thomas", "Karen", "Charles", "Lisa", "Oliver",
    "Emma", "Jack", "Sophia", "Harry", "Olivia", "George", "Amelia",
    "Noah", "Isabella", "Liam", "Mia", "Ethan", "Charlotte", "Lucas",
    "Ava", "Mason", "Harper", "Logan", "Evelyn",
]

_LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Martinez", "Taylor", "Anderson", "Thomas", "Jackson", "White",
    "Harris", "Martin", "Thompson", "Robinson", "Clark", "Lewis", "Walker",
    "Hall", "Allen", "Young", "King", "Wright", "Scott", "Green", "Baker",
    "Adams", "Nelson", "Carter", "Mitchell", "Perez", "Roberts", "Turner",
    "Phillips", "Campbell", "Parker", "Evans",
]

_EMAIL_DOMAINS = [
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
    "protonmail.com", "live.com", "me.com", "mac.com", "aol.com",
]

_WORDS = [
    "apple", "banana", "cloud", "dream", "eagle", "forest", "galaxy",
    "harbour", "island", "jungle", "kitchen", "lemon", "mountain", "nation",
    "ocean", "planet", "quest", "river", "shadow", "tiger", "unique",
    "valley", "winter", "xenon", "yellow", "zenith", "amber", "bridge",
    "castle", "diamond", "empire", "falcon", "garden", "horizon", "ivory",
    "jasper", "knight", "lantern", "marble", "nectar", "oracle", "prism",
    "quartz", "royal", "silver", "thunder", "ultra", "violet", "walnut",
]

_LETTERS = "abcdefghijklmnopqrstuvwxyz"

# ---------------------------------------------------------------------------
# Faker-compatible class
# ---------------------------------------------------------------------------

class Faker:
    """
    Drop-in replacement for faker.Faker providing the methods used by
    generate.py: name(), email(), word(), bothify().

    Seeding is global (mirrors faker.Faker.seed behaviour).
    """

    _rng = random.Random()

    def __init__(self, locale=None):
        # locale is accepted but ignored — output is always English
        pass

    # ------------------------------------------------------------------
    # Class-level seed (mirrors Faker.seed(n) usage in generate.py)
    # ------------------------------------------------------------------

    @classmethod
    def seed(cls, n: int) -> None:
        """Seed the shared RNG. Mirrors `faker.Faker.seed(n)`."""
        cls._rng.seed(n)

    # ------------------------------------------------------------------
    # Name / contact
    # ------------------------------------------------------------------

    def name(self) -> str:
        first = self._rng.choice(_FIRST_NAMES)
        last  = self._rng.choice(_LAST_NAMES)
        return f"{first} {last}"

    def email(self) -> str:
        first  = self._rng.choice(_FIRST_NAMES).lower()
        last   = self._rng.choice(_LAST_NAMES).lower()
        sep    = self._rng.choice([".", "_", ""])
        num    = self._rng.randint(1, 999) if self._rng.random() < 0.4 else ""
        domain = self._rng.choice(_EMAIL_DOMAINS)
        return f"{first}{sep}{last}{num}@{domain}"

    # ------------------------------------------------------------------
    # Text
    # ------------------------------------------------------------------

    def word(self) -> str:
        return self._rng.choice(_WORDS)

    def bothify(self, text: str = "??") -> str:
        """
        Replace `?` with a random lowercase letter and `#` with a random digit.
        Mirrors faker's bothify behaviour.
        """
        result = []
        for ch in text:
            if ch == "?":
                result.append(self._rng.choice(_LETTERS))
            elif ch == "#":
                result.append(str(self._rng.randint(0, 9)))
            else:
                result.append(ch)
        return "".join(result)
