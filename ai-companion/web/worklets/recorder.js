// Microphone capture. Batches the 128-sample render quantum into larger PCM16
// chunks so we are not posting a message (and a websocket frame) per 5 ms.

const FRAMES_PER_CHUNK = 2048;

class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(FRAMES_PER_CHUNK);
    this._offset = 0;
    this._muted = false;
    this.port.onmessage = (event) => {
      if (event.data?.type === "mute") this._muted = Boolean(event.data.value);
    };
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._offset++] = channel[i];
      if (this._offset === FRAMES_PER_CHUNK) {
        if (!this._muted) this._flush();
        this._offset = 0;
      }
    }
    return true;
  }

  _flush() {
    const pcm = new Int16Array(FRAMES_PER_CHUNK);
    for (let i = 0; i < FRAMES_PER_CHUNK; i++) {
      const s = Math.max(-1, Math.min(1, this._buffer[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    this.port.postMessage(pcm, [pcm.buffer]);
  }
}

registerProcessor("recorder", RecorderProcessor);
