# Architecture

## What runs today

```
browser mic ──PCM16/24k──▶ /ws (FastAPI) ──▶ Realtime API (gpt-realtime-2.1)
                                │                       │
browser speaker ◀──PCM16/24k────┴──── audio deltas ──────┘
     │
     └──▶ amplitude ──▶ canvas avatar (placeholder)
```

The server is a relay, and it exists for exactly one reason: the API key must
not reach the browser. It holds no conversation state — the Realtime session
upstream is the state.

Audio is 24 kHz mono PCM16 end to end. The browser `AudioContext` is pinned to
24000 so nothing resamples at any hop.

## Why full duplex is a server-VAD setting, not a model trick

`turn_detection.type = "server_vad"` with `interrupt_response: true` is what
makes the exchange overlap-capable: the model decides on its own when the user
has started and stopped talking, and accepts being talked over.

Barge-in has a client half that is easy to miss. Audio deltas arrive faster than
real time, so several seconds of speech may already be queued in the browser
when the user cuts in. On `input_audio_buffer.speech_started` the client flushes
the player queue (`{type:"clear"}`), otherwise she keeps talking over the user
for as long as the buffer is deep. Echo cancellation is enabled on the mic
capture for the same class of reason — without it her own output re-triggers the
VAD through the speakers.

## Personality is prompt, not model

`server/persona.py` is the entire character. Jealousy, overthinking, sulking and
the short spoken-length constraint are lines of text in `Persona.instructions()`.
Changing the character means editing that dataclass; no other file cares.

## The lip-sync stage (not built)

`web/avatar.js` is a placeholder driven by output amplitude. It occupies the
seam a real renderer would fill:

1. Assistant audio, already available server-side, is forwarded to a renderer
   running [LiveTalking](https://github.com/lipku/livetalking).
2. LiveTalking drives MuseTalk or Wav2Lip to generate lip-synced frames from the
   audio's acoustic features.
3. Frames reach the browser over WebRTC; the `<canvas>` becomes a `<video>`.

This stage needs a GPU — MuseTalk reports 30+ fps on a V100, and below realtime
frame rate the illusion collapses. It is the reason the split exists: everything
above runs on any laptop, and only this stage needs hardware.

## Schema drift to watch

The Realtime event schema changed between the beta and GA interfaces. Two places
absorb that:

* `realtime.py` accepts audio deltas under both `response.output_audio.delta`
  (GA) and `response.audio.delta` (beta).
* `_session_payload()` sends the GA nested `audio: {input, output}` shape. The
  beta shape was flat (`input_audio_format`, `voice`, `turn_detection` directly
  under `session`). If the session is rejected, this is the first thing to swap.

Upstream `error` events are forwarded to the browser rather than logged and
dropped, so a rejected payload appears in the transcript instead of presenting
as silence.
