"""FastAPI app: static client plus a websocket relay to the Realtime API."""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import Settings, load_settings
from .persona import DEFAULT_PERSONA
from .realtime import RealtimeSession

log = logging.getLogger("companion")

WEB_DIR = Path(__file__).resolve().parent.parent / "web"

app = FastAPI(title="AI Companion")
app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")

_settings: Settings | None = None


def settings() -> Settings:
    """Resolved lazily so importing the module never requires an API key."""
    global _settings
    if _settings is None:
        _settings = load_settings()
    return _settings


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


@app.get("/healthz")
async def healthz() -> dict[str, object]:
    """Liveness plus whether a key is configured — no key value is exposed."""
    try:
        cfg = settings()
    except RuntimeError as exc:
        return {"ok": False, "reason": str(exc)}
    return {"ok": True, "model": cfg.model, "voice": cfg.voice}


@app.websocket("/ws")
async def companion_ws(client: WebSocket) -> None:
    await client.accept()
    try:
        cfg = settings()
    except RuntimeError as exc:
        await client.send_text(json.dumps({"type": "error", "message": str(exc)}))
        await client.close()
        return

    session = RealtimeSession(cfg, DEFAULT_PERSONA)
    try:
        async with session.connect():
            up = asyncio.create_task(_client_to_model(client, session))
            down = asyncio.create_task(_model_to_client(session, client))
            done, pending = await asyncio.wait(
                {up, down}, return_when=asyncio.FIRST_COMPLETED
            )
            for task in pending:
                task.cancel()
            # Surface a crash in either pump rather than closing silently.
            for task in done:
                task.result()
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001 - report upstream failures to the UI
        log.exception("session failed")
        await _try_send(client, {"type": "error", "message": repr(exc)})
    finally:
        await _try_close(client)


async def _client_to_model(client: WebSocket, session: RealtimeSession) -> None:
    """Microphone PCM16 frames from the browser, forwarded upstream."""
    while True:
        message = await client.receive()
        if message["type"] == "websocket.disconnect":
            return
        chunk = message.get("bytes")
        if chunk:
            await session.send_audio(chunk)


async def _model_to_client(session: RealtimeSession, client: WebSocket) -> None:
    async for event in session.events():
        await client.send_text(json.dumps(event))


async def _try_send(client: WebSocket, payload: dict[str, object]) -> None:
    try:
        await client.send_text(json.dumps(payload))
    except Exception:  # noqa: BLE001 - the socket is already gone
        pass


async def _try_close(client: WebSocket) -> None:
    try:
        await client.close()
    except Exception:  # noqa: BLE001 - already closed
        pass


def main() -> None:
    import uvicorn

    cfg = load_settings()
    uvicorn.run(app, host=cfg.host, port=cfg.port)


if __name__ == "__main__":
    main()
