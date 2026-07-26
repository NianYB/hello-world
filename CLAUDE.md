# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

Two unrelated things live here:

* `README` — a single line, `Hello World!`, inherited from GitHub's canonical tutorial
  repository `octocat/Hello-World`. The commit history up to `7fd1a60` is that repository's:
  same SHAs, authored by The Octocat in 2011–2012. None of it is project work, so don't read
  intent into it. `README` has no file extension; that is the upstream original, not an
  oversight — don't rename it or replace it with `README.md` as a drive-by change.
* `ai-companion/` — the actual project. Everything below is about it.

## ai-companion

Real-time full-duplex voice companion: browser mic → FastAPI relay → OpenAI Realtime API →
audio back. See `ai-companion/docs/ARCHITECTURE.md` for the data flow and
`ai-companion/README.md` for setup.

### Commands

Run from `ai-companion/`:

```bash
./run.sh                                  # dev server on :8000, creates .venv on first run
.venv/bin/python -m uvicorn server.main:app --reload
curl localhost:8000/healthz               # confirms a key is configured; never echoes it
```

There is no test suite and no linter configured. If you add either, record the command here.

### Two facts that keep getting mis-stated

**GPT-Live has no API.** It launched 2026-07-08 as a ChatGPT consumer feature; API access is
waitlist-only. The model this project calls is `gpt-realtime-2.1`. Demos claiming to wire
"GPT-Live" into something are using the realtime API.

**Personality is prompt, not model.** Jealousy, sulking, overthinking — all of it is text in
`server/persona.py`. Don't go looking for a model parameter that produces it.

### Where things break first

The Realtime event schema shifted between the beta and GA interfaces, and `server/realtime.py`
absorbs that in two places: audio deltas are accepted under both `response.output_audio.delta`
and `response.audio.delta`, and `_session_payload()` sends the GA nested `audio: {input,
output}` shape rather than the flat beta shape. A session that connects but produces silence is
almost always this. Upstream `error` events are forwarded to the browser deliberately — check
the on-page transcript before adding logging.

Audio is 24 kHz mono PCM16 end to end, and the browser `AudioContext` is pinned to match. If
you change the rate anywhere, change it in `config.py` and `web/app.js` together or everything
resamples into garbage.

### Verifying without credentials

`api.openai.com` is blocked by the sandbox network policy in Claude Code web sessions, so live
conversation cannot be tested there. The client half still can: drive it with Chromium's fake
mic (`--use-fake-device-for-media-stream`) and assert that binary frames reach the websocket —
4096 bytes per frame, one per 2048-sample chunk. That exercises getUserMedia, the
`AudioContext`, the recorder worklet and PCM conversion without any key.

The lip-sync stage described in `docs/ARCHITECTURE.md` needs a GPU and is not implemented.
