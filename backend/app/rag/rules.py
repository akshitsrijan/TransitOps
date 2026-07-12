"""Deterministic extraction of numeric policy thresholds embedded in the RAG
corpus's prose (e.g. "every 10,000 km", "shall not exceed 12 hours",
"issued for 5 years"). No LLM involved — plain regex + keyword classification
over retrieved text, so scoring is reproducible and fast.
"""

import re
from dataclasses import dataclass

_NUM = r"[\d][\d,]*(?:\.\d+)?"
_UNIT = r"(?:km|kilometers?|kilometres?|hours?|years?|months?|minutes?)"

_UNIT_CANON = {
    "km": "km", "kilometer": "km", "kilometers": "km", "kilometre": "km", "kilometres": "km",
    "hour": "hours", "hours": "hours",
    "year": "years", "years": "years",
    "month": "months", "months": "months",
    "minute": "minutes", "minutes": "minutes",
}

_MAX_KEYWORDS = ("more than", "exceed", "shall not", "must not", "maximum", "no more than")
_MIN_KEYWORDS = ("at least", "minimum")
_INTERVAL_KEYWORDS = ("every",)
_VALIDITY_KEYWORDS = ("issued for", "valid for", "validity", "renewable")


@dataclass
class ExtractedRule:
    kind: str  # "interval" | "max" | "min" | "validity" | "range"
    low: float
    high: float | None
    unit: str
    sentence: str
    source: str
    heading: str


def _canon_unit(raw: str) -> str:
    return _UNIT_CANON.get(raw.lower().rstrip("s") + "s", _UNIT_CANON.get(raw.lower(), raw.lower()))


def _to_number(raw: str) -> float:
    return float(raw.replace(",", ""))


def _split_sentences(text: str) -> list[str]:
    text = text.replace("\n", " ")
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def _classify(text: str) -> str:
    lowered = text.lower()
    if any(k in lowered for k in _MAX_KEYWORDS):
        return "max"
    if any(k in lowered for k in _MIN_KEYWORDS):
        return "min"
    if any(k in lowered for k in _INTERVAL_KEYWORDS):
        return "interval"
    if any(k in lowered for k in _VALIDITY_KEYWORDS):
        return "validity"
    return "range"


_MONTHS_PER_YEAR = 12


def _normalize_to(unit: str, value: float, target_unit: str) -> float:
    if unit == target_unit:
        return value
    if unit == "months" and target_unit == "years":
        return value / _MONTHS_PER_YEAR
    if unit == "years" and target_unit == "months":
        return value * _MONTHS_PER_YEAR
    return value  # incompatible units (e.g. km vs hours) - leave as-is, caller should distrust this


def extract_rules(text: str, source: str, heading: str) -> list[ExtractedRule]:
    rules: list[ExtractedRule] = []
    for sentence in _split_sentences(text):
        # "X to Y <unit>" or "X <unit> to Y <unit>" range, e.g. "6 months to 1 year"
        range_match = re.search(
            rf"({_NUM})\s*({_UNIT})?\s+to\s+({_NUM})\s*({_UNIT})", sentence, re.I
        )
        if range_match:
            low, low_unit, high, high_unit = range_match.groups()
            unit = _canon_unit(high_unit)
            low_val = _to_number(low)
            if low_unit:
                low_val = _normalize_to(_canon_unit(low_unit), low_val, unit)
            rules.append(
                ExtractedRule(
                    kind="range", low=low_val, high=_to_number(high), unit=unit,
                    sentence=sentence, source=source, heading=heading,
                )
            )
            continue

        # "X-Y <unit>" range, e.g. "every 2-3 years", "1-2 years"
        dash_match = re.search(rf"({_NUM})\s*[-–]\s*({_NUM})\s*({_UNIT})", sentence, re.I)
        if dash_match:
            low, high, unit = dash_match.groups()
            rules.append(
                ExtractedRule(
                    kind="range", low=_to_number(low), high=_to_number(high), unit=_canon_unit(unit),
                    sentence=sentence, source=source, heading=heading,
                )
            )
            continue

        # single "<number> <unit>" occurrences, classified from a local window so
        # sentences with two clauses (e.g. "not more than 8 hours ... at least 30
        # minutes") don't misclassify the second number using the first clause's keyword
        for match in re.finditer(rf"({_NUM})\s*({_UNIT})\b", sentence, re.I):
            value, unit = match.groups()
            window_start = max(0, match.start() - 40)
            local_kind = _classify(sentence[window_start:match.start()])
            rules.append(
                ExtractedRule(
                    kind=local_kind, low=_to_number(value), high=None, unit=_canon_unit(unit),
                    sentence=sentence, source=source, heading=heading,
                )
            )
    return rules
