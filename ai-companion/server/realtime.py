"""Thin client for the OpenAI Realtime API.

The browser never sees the API key: it talks to our /ws endpoint, and this module
is the only thing that holds an upstream connection.

Two details are deliberately defensive, because the Realtime event schema has
changed shape between the beta and GA interfaces:

* audio deltas are accepted under both ``response.output_audio.delta`` (GA) and
  ``response.audio.delta`` (beta);
* any upstream ``error`` event is forwarded to the browser verbatim instead of
  being swallowed, so a rejected session payload shows up immediately rather
  than as silence.
"""

from __future__ import annotations

import base64
import json
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from websockets.asyncio.client import connect

from .config import SAMPLE_RATE, Settings
from .persona import Persona

# Server events carrying a chunk of assistant audio, newest naming first.
_AUDIO_DELTA = ("response.output_audio.delta", "response.audio.delta")
# Server events carrying a chunk of the assistant's own transcript.
_ASSISTANT_TEXT = (
    "response.output_audio_transcript.delta",
    "response.audio_transcript.delta",
)
_USER_TEXT_DONE = "conversation.item.input_audio_transcription.completed"


class RealtimeSession:
    """One upstream conversation. Not reusable across connections."""

    def __init__(self, settings: Settings, persona: Persona) -> None:
        self._settings = settings
        self._persona = persona
        self._ws: Any = None

    @asynccontextmanager
    async def connect(self) -> AsyncIterator["RealtimeSession"]:
        headers = {
            "Authorization": f"Bearer {self._settings.api_key}",
            "OpenAI-Beta": "realtime=v1",
        }
        async with connect(
            self._settings.realtime_url,
            additional_headers=headers,
            max_size=None,
        ) as ws:
            self._ws = ws
            await self._send(self._session_payload())
            try:
                yield self
            finally:
                self._ws = None

    def _session_payload(self) -> dict[str, Any]:
        """GA-shaped session config.

        If the API rejects this, the ``error`` event reaches the browser console
        and this is the first place to look — the beta interface used a flat
        shape (``input_audio_format``/``voice``/``turn_detection`` at the top
        level of ``session``) instead of the nested ``audio`` object.
        """
        pcm = {"type": "audio/pcm", "rate": SAMPLE_RATE}
        return {
            "type": "session.update",
            "session": {
                "type": "realtime",
                "instructions": self._persona.instructions(),
                "audio": {
                    "input": {
                        "format": pcm,
                        "transcription": {
                            "model": self._settings.transcription_model
                        },
                        # Server-side VAD is what makes the exchange full duplex:
                        # the model starts responding on its own, and
                        # interrupt_response lets the user talk over it.
                        "turn_detection": {
                            "type": "server_vad",
                            "threshold": 0.5,
                            "prefix_padding_ms": 300,
                            "silence_duration_ms": 500,
                            "interrupt_response": True,
                        },
                    },
                    "output": {"format": pcm, "voice": self._settings.voice},
                },
            },
        }

    async def _send(self, payload: dict[str, Any]) -> None:
        if self._ws is None:
            raise RuntimeError("send attempted outside connect()")
        await self._ws.send(json.dumps(payload))

    async def send_audio(self, pcm16: bytes) -> None:
        """Append one chunk of caller microphone audio."""
        await self._send(
            {
                "type": "input_audio_buffer.append",
                "audio": base64.b64encode(pcm16).decode("ascii"),
            }
        )

    async def events(self) -> AsyncIterator[dict[str, Any]]:
        """Upstream events, normalised into the browser-facing protocol."""
        if self._ws is None:
            raise RuntimeError("events() attempted outside connect()")
        async for raw in self._ws:
            event = json.loads(raw)
            kind = event.get("type", "")

            if kind in _AUDIO_DELTA:
                yield {"type": "audio", "data": event.get("delta", "")}
            elif kind in _ASSISTANT_TEXT:
                yield {
                    "type": "transcript",
                    "role": "assistant",
                    "text": event.get("delta", ""),
                    "final": False,
                }
            elif kind == _USER_TEXT_DONE:
                yield {
                    "type": "transcript",
                    "role": "user",
                    "text": event.get("transcript", ""),
                    "final": True,
                }
            elif kind == "input_audio_buffer.speech_started":
                # Barge-in: the user cut in, so whatever is queued for playback
                # in the browser is now stale and must be dropped.
                yield {"type": "interrupt"}
            elif kind == "response.done":
                yield {"type": "state", "value": "listening"}
            elif kind == "session.updated":
                yield {"type": "state", "value": "ready"}
            elif kind == "error":
                err = event.get("error", {})
                yield {
                    "type": "error",
                    "message": err.get("message") or json.dumps(err)[:400],
                }
