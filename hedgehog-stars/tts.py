# Runs core/tts/tts_zh.py (edge-tts) with the system CA bundle, so it also works behind a TLS-inspecting proxy.
# Usage: "$LIB/.venv/bin/python" tts.py lines.json voices/   (CA bundle: $TTS_CA, default /root/.ccr/ca-bundle.crt, else certifi)
import os, ssl, sys, runpy
import edge_tts.communicate as C
ca = os.environ.get('TTS_CA', '/root/.ccr/ca-bundle.crt')
if os.path.exists(ca): C._SSL_CTX = ssl.create_default_context(cafile=ca)
lib = os.environ['LIB']
sys.argv = [os.path.join(lib, 'core/tts/tts_zh.py')] + sys.argv[1:]
runpy.run_path(sys.argv[0], run_name='__main__')
