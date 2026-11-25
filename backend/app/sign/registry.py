"""Which sign languages exist, and which model variant serves each one.

Source of truth: config/sign_languages.json. A variant is picked per language with
SIGN_VARIANTS (e.g. "rsl=mvit16-4,asl=signflow-a"); otherwise its default_variant.
"""

import json
from dataclasses import dataclass, field
from functools import lru_cache


@dataclass(frozen=True)
class ModelVariant:
    name: str
    model_path: str
    frame_interval: int
    download_url: str | None = None
    top1_accuracy: float | None = None


@dataclass(frozen=True)
class SignLanguageSpec:
    code: str
    name: str
    english_name: str
    text_lang: str  # language of the recognized words ("ru", "en")
    tts_lang: str  # BCP-47 voice for browser speechSynthesis
    classes_path: str
    variant: ModelVariant
    variants: dict[str, ModelVariant] = field(default_factory=dict)
    no_sign_label: str | None = "---"
    source_fps: float = 30.0
    min_confidence: float | None = None
    license: str = ""
    commercial_use: bool = True

    @property
    def target_fps(self) -> float:
        """Frame rate the model was trained on (e.g. 30 fps video, every 2nd frame -> 15)."""
        return self.source_fps / self.variant.frame_interval


def parse_variant_overrides(raw: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        if "=" not in part:
            raise ValueError(f"SIGN_VARIANTS entry {part!r} must look like lang=variant")
        lang, variant = (p.strip() for p in part.split("=", 1))
        out[lang] = variant
    return out


def load_registry(path: str, variants: str = "", enabled: str = "") -> dict[str, SignLanguageSpec]:
    with open(path, encoding="utf-8") as f:
        cfg = json.load(f)
    overrides = parse_variant_overrides(variants)
    enabled_set = {c.strip() for c in enabled.split(",") if c.strip()}
    registry: dict[str, SignLanguageSpec] = {}
    for lang in cfg["languages"]:
        code = lang["code"]
        if enabled_set and code not in enabled_set:
            continue
        all_variants = {
            name: ModelVariant(
                name=name,
                model_path=v["model_path"],
                frame_interval=int(v["frame_interval"]),
                download_url=v.get("download_url"),
                top1_accuracy=v.get("top1_accuracy"),
            )
            for name, v in lang["variants"].items()
        }
        chosen = overrides.get(code, lang["default_variant"])
        if chosen not in all_variants:
            raise ValueError(f"unknown variant {chosen!r} for {code}; choose one of {sorted(all_variants)}")
        registry[code] = SignLanguageSpec(
            code=code,
            name=lang["name"],
            english_name=lang.get("english_name", lang["name"]),
            text_lang=lang["text_lang"],
            tts_lang=lang["tts_lang"],
            classes_path=lang["classes_path"],
            variant=all_variants[chosen],
            variants=all_variants,
            no_sign_label=lang.get("no_sign_label"),
            source_fps=float(lang.get("source_fps", 30)),
            min_confidence=lang.get("min_confidence"),
            license=lang.get("license", ""),
            commercial_use=bool(lang.get("commercial_use", True)),
        )
    unknown = set(overrides) - set(registry)
    if unknown:
        raise ValueError(f"SIGN_VARIANTS names unknown/disabled languages: {sorted(unknown)}")
    return registry


@lru_cache
def cached_registry(path: str, variants: str, enabled: str) -> dict[str, SignLanguageSpec]:
    return load_registry(path, variants, enabled)


def registry_for(settings) -> dict[str, SignLanguageSpec]:
    return cached_registry(settings.sign_languages_path, settings.sign_variants, settings.sign_languages_enabled)
