#!/bin/sh
# Subset LXGW WenKai TC (SIL OFL 1.1, Google Fonts) to the characters the film uses (lines.json + the title + digits) → fonts/
set -e
HERE=$(cd "$(dirname "$0")" && pwd); mkdir -p "$HERE/fonts"
TXT=$(python3 -c "import json,sys;t=''.join(l['text'] for l in json.load(open(sys.argv[1])))+'小栗的星星123';print(''.join(sorted(set(t))))" "$HERE/lines.json")
ENC=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$TXT")
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
for W in 400 700; do
  URL=$(curl -fsS -A "$UA" "https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@$W&text=$ENC" | grep -o 'https://[^)]*' | head -1)
  curl -fsS -o "$HERE/fonts/wenkai-$W.woff2" "$URL"; echo "fonts/wenkai-$W.woff2"
done
