"""Sign languages Phoenix lists but cannot recognize yet (no open dataset + model wired in).

The site shows them in its pickers and dictionary as "coming soon". When one gets a model,
add it to config/sign_languages.json and remove it from here.
"""

PLANNED_SIGN_LANGUAGES = [
    {"code": "ipsl", "english_name": "Indo-Pakistani Sign Language"},
    {"code": "csl", "english_name": "Chinese Sign Language"},
    {"code": "bisindo", "english_name": "Indonesian Sign Language"},
    {"code": "libras", "english_name": "Brazilian Sign Language"},
    {"code": "ethsl", "english_name": "Ethiopian Sign Language"},
    {"code": "lse", "english_name": "Spanish Sign Language"},
    {"code": "esl", "english_name": "Egyptian Sign Language"},
    {"code": "psl", "english_name": "Persian Sign Language"},
]

PLANNED_CODES = frozenset(l["code"] for l in PLANNED_SIGN_LANGUAGES)
