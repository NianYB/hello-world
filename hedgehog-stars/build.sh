#!/bin/sh
# Rebuild 小栗的星星 from scratch: LIB=<lemo-opuscar library> sh build.sh
# Needs the library's core, voice and music tiers (setup.sh deps voice music), ffmpeg 7+ and ffprobe on PATH, and a network
# connection for the Chinese voice (edge-tts) and the font subset (Google Fonts).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}; export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
PY="$LIB/.venv/bin/python"
sh "$HERE/fonts.sh"                                                                 # 1. font subset (LXGW WenKai TC, OFL)
(cd "$HERE" && "$PY" tts.py lines.json voices --voice zh-TW-HsiaoChenNeural)        # 2. narration (edge-tts)
cd "$LIB"
node core/render/events.mjs "$HERE"                                                  # 3. timeline → events.json
"$PY" "$HERE/music/score.py"                                                        # 4. original score (synthesised) → music/score.wav
"$PY" "$HERE/mix.py"                                                                # 5. foley + ambience + voice + score → out/mix.wav
node "$HERE/subs.mjs" && "$PY" core/render/srt.py "$HERE/subs.json" "$HERE/hedgehog-stars.srt"   # 6. subtitles
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"   # 7. frames
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/hedgehog-stars.mp4" 24 0   # 8. mux, −14 LUFS, no extra grain (the paper is the grain)
node core/render/still.mjs "$HERE" 47 --out "$HERE/out" && cp "$HERE/out/t_47.jpg" "$HERE/poster.jpg"
