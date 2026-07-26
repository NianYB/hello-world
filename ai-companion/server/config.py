"""Runtime settings, read once from the environment."""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()

# The Realtime API only speaks 24 kHz mono PCM16 in both directions. The browser
# is pinned to the same rate so no resampling is needed anywhere in the path.
SAMPLE_RATE = 24000


@dataclass(frozen=True)
class Settings:
    api_key: str
    model: str
    voice: str
    transcription_model: str
    host: str
    port: int

    @property
    def realtime_url(self) -> str:
        return f"wss://api.openai.com/v1/realtime?model={self.model}"


def load_settings() -> Settings:
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Copy .env.example to .env and fill it in."
        )
    return Settings(
        api_key=api_key,
        model=os.environ.get("OPENAI_REALTIME_MODEL", "gpt-realtime-2.1"),
        voice=os.environ.get("OPENAI_VOICE", "shimmer"),
        transcription_model=os.environ.get("OPENAI_TRANSCRIPTION_MODEL", "whisper-1"),
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "8000")),
    )
