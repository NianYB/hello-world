# AI Companion

Real-time full-duplex voice companion in the browser: talk over her, she stops
and responds. Persona is configurable; lip-synced video is a documented next
stage, not built.

## Setup

```bash
cp .env.example .env      # add your OPENAI_API_KEY
./run.sh                  # http://127.0.0.1:8000
```

Click 開始對話 and allow microphone access. Headphones recommended — without
them the speakers feed her own voice back into the mic and she interrupts
herself.

## Layout

| Path | Role |
| --- | --- |
| `server/realtime.py` | Upstream Realtime API client; the only holder of the API key |
| `server/persona.py` | The character — traits, speaking style, boundaries |
| `server/main.py` | FastAPI app, static files, `/ws` relay |
| `web/worklets/` | Mic capture and playback `AudioWorklet`s |
| `web/avatar.js` | Placeholder animation where lip-sync video will go |
| `docs/ARCHITECTURE.md` | Data flow, barge-in handling, the lip-sync stage |

## A note on GPT-Live

**GPT-Live has no API.** It launched 2026-07-08 as a ChatGPT consumer feature
(iOS / Android / chatgpt.com); API access is waitlist-only with no announced
date. Demos claiming to wire "GPT-Live" into a digital human are using
`gpt-realtime-2.1`, which is the full-duplex model developers can actually call,
and which this project uses.

## Editing the character

`server/persona.py` holds every behavioural trait as plain text. Restart the
server after editing — instructions are sent once at session start.

## Status

Voice conversation, barge-in, live transcript and the placeholder avatar are
implemented. Lip-synced video is specified in `docs/ARCHITECTURE.md` but not
written; it needs a GPU.
