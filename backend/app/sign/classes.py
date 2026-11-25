import json
from functools import lru_cache
from typing import Literal

NO_SIGN = "---"


@lru_cache
def load_classes(path: str) -> list[str]:
    with open(path, encoding="utf-8") as f:
        classes = json.load(f)
    if not isinstance(classes, list) or not all(isinstance(c, str) for c in classes):
        raise ValueError(f"{path} must be a JSON list of strings")
    return classes


def categorize(text: str) -> Literal["letter", "word", "phrase"]:
    t = text.strip()
    if len(t) == 1 and t.isupper():
        return "letter"
    if " " in t:
        return "phrase"
    return "word"
