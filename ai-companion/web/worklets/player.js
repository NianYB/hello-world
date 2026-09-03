// Playback of assistant audio.
//
// Chunks arrive faster than real time, so they queue here and drain at the
// output rate. `clear` empties the queue instantly, which is what makes
// barge-in feel immediate: without it the model keeps talking for however many
// seconds are already buffered after the user cuts in.

class PlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._queue = [];
    this._readIndex = 0;
    this._level = 0;
    this._sinceReport = 0;

    this.port.onmessage = (event) => {
      const msg = event.data;
      if (msg?.type === "clear") {
        this._queue = [];
        this._readIndex = 0;
        return;
      }
      if (msg instanceof Float32Array) this._queue.push(msg);
    };
  }

  process(_inputs, outputs) {
    const out = outputs[0][0];
    if (!out) return true;

    let peak = 0;
    for (let i = 0; i < out.length; i++) {
      const chunk = this._queue[0];
      if (!chunk) {
        out[i] = 0;
        continue;
      }
      const sample = chunk[this._readIndex++];
      out[i] = sample;
      const abs = Math.abs(sample);
      if (abs > peak) peak = abs;

      if (this._readIndex >= chunk.length) {
        this._queue.shift();
        this._readIndex = 0;
      }
    }

    // Smoothed level, reported ~30x/sec, drives the avatar's mouth.
    this._level += (peak - this._level) * 0.3;
    this._sinceReport += out.length;
    if (this._sinceReport >= sampleRate / 30) {
      this._sinceReport = 0;
      this.port.postMessage({
        type: "level",
        value: this._level,
        speaking: this._queue.length > 0,
      });
    }
    return true;
  }
}

registerProcessor("player", PlayerProcessor);
