import logging

log = logging.getLogger("phoenix.stt")

MIME_BY_EXT = {"webm": "audio/webm", "ogg": "audio/ogg", "wav": "audio/wav", "mp3": "audio/mp3", "m4a": "audio/mp4"}


def audio_duration(path: str) -> float | None:
    """Duration in seconds via PyAV (already a faster-whisper dependency); None if unknown."""
    try:
        import av

        with av.open(path) as c:
            if c.duration:
                return c.duration / 1_000_000  # av.time_base
            stream = next((s for s in c.streams if s.type == "audio"), None)
            if stream is not None and stream.duration and stream.time_base:
                return float(stream.duration * stream.time_base)
            # Browser MediaRecorder webm often has no duration header: decode to measure.
            last = 0.0
            for frame in c.decode(audio=0):
                if frame.time is not None:
                    last = frame.time + frame.samples / (frame.sample_rate or 1)
            return last or None
    except Exception as e:  # unreadable container: let the engine decide
        log.info("could not probe audio duration of %s: %s", path, e)
        return None
