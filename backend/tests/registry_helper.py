import json


def write_registry(tmp_path, rsl_model: str, asl_model: str) -> str:
    """A sign_languages.json with real class files but test model paths."""
    cfg = {
        "languages": [
            {
                "code": "rsl", "name": "Русский жестовый язык", "english_name": "Russian Sign Language",
                "text_lang": "ru", "tts_lang": "ru-RU", "classes_path": "data/rsl_classes.json",
                "no_sign_label": "---", "source_fps": 30, "default_variant": "main",
                "variants": {
                    "main": {"model_path": str(rsl_model), "frame_interval": 2},
                    "light": {"model_path": str(rsl_model), "frame_interval": 4},
                },
            },
            {
                "code": "asl", "name": "American Sign Language", "text_lang": "en", "tts_lang": "en-US",
                "classes_path": "data/asl_classes.json", "no_sign_label": None, "source_fps": 30,
                "min_confidence": 0.6, "commercial_use": False, "default_variant": "main",
                "variants": {"main": {"model_path": str(asl_model), "frame_interval": 2}},
            },
        ]
    }
    path = tmp_path / "sign_languages.json"
    path.write_text(json.dumps(cfg, ensure_ascii=False), encoding="utf-8")
    return str(path)
