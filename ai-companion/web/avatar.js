// Placeholder avatar.
//
// This is the seam where MuseTalk / Wav2Lip output goes. A real lip-sync stage
// replaces this canvas with a <video> element fed by WebRTC, driven by the same
// audio stream; until then the mouth is opened directly by output amplitude,
// which is enough to check that audio and animation stay in sync.

export class Avatar {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.level = 0;
    this.target = 0;
    this.speaking = false;
    this._resize();
    window.addEventListener("resize", () => this._resize());
    requestAnimationFrame(() => this._draw());
  }

  setLevel(value, speaking) {
    this.target = value;
    this.speaking = speaking;
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const size = this.canvas.clientWidth;
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.size = size;
  }

  _draw() {
    // Ease toward the reported level so the mouth does not jitter per frame.
    this.level += (this.target - this.level) * 0.25;

    const { ctx, size } = this;
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.32;

    ctx.clearRect(0, 0, size, size);

    // Reactive halo.
    const halo = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * (1.5 + this.level));
    halo.addColorStop(0, "rgba(236, 118, 165, 0.45)");
    halo.addColorStop(1, "rgba(236, 118, 165, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    // Face.
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#2b2233";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.speaking ? "#ec76a5" : "#5a4a63";
    ctx.stroke();

    // Eyes.
    const eyeY = cy - r * 0.18;
    const eyeDx = r * 0.34;
    ctx.fillStyle = "#f3e9f2";
    for (const dx of [-eyeDx, eyeDx]) {
      ctx.beginPath();
      ctx.ellipse(cx + dx, eyeY, r * 0.09, r * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth: height tracks amplitude.
    const open = Math.min(1, this.level * 3);
    const mouthH = r * (0.05 + open * 0.42);
    const mouthW = r * (0.34 + open * 0.12);
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.34, mouthW, mouthH, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ec76a5";
    ctx.fill();

    requestAnimationFrame(() => this._draw());
  }
}
