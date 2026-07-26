import { Avatar } from "./avatar.js";

const SAMPLE_RATE = 24000; // must match the server; the API speaks only 24k

const els = {
  start: document.getElementById("start"),
  stop: document.getElementById("stop"),
  mute: document.getElementById("mute"),
  state: document.getElementById("state"),
  log: document.getElementById("log"),
  canvas: document.getElementById("avatar"),
};

const avatar = new Avatar(els.canvas);

let ctx = null;
let socket = null;
let recorder = null;
let player = null;
let micStream = null;
let assistantLine = null;

function setState(text, tone = "") {
  els.state.textContent = text;
  els.state.dataset.tone = tone;
}

function line(role, text) {
  const el = document.createElement("p");
  el.className = `line ${role}`;
  el.textContent = text;
  els.log.appendChild(el);
  els.log.scrollTop = els.log.scrollHeight;
  return el;
}

function base64ToFloat32(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const pcm = new Int16Array(bytes.buffer);
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / 0x8000;
  return out;
}

async function start() {
  els.start.disabled = true;
  setState("連線中…");

  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true, // stops the model from hearing its own voice
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err) {
    setState("拿不到麥克風權限", "error");
    els.start.disabled = false;
    return;
  }

  ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  await ctx.audioWorklet.addModule("/static/worklets/recorder.js");
  await ctx.audioWorklet.addModule("/static/worklets/player.js");

  player = new AudioWorkletNode(ctx, "player", { outputChannelCount: [1] });
  player.connect(ctx.destination);
  player.port.onmessage = ({ data }) => {
    if (data?.type === "level") avatar.setLevel(data.value, data.speaking);
  };

  recorder = new AudioWorkletNode(ctx, "recorder");
  ctx.createMediaStreamSource(micStream).connect(recorder);
  recorder.port.onmessage = ({ data }) => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(data);
  };

  const proto = location.protocol === "https:" ? "wss" : "ws";
  socket = new WebSocket(`${proto}://${location.host}/ws`);
  socket.binaryType = "arraybuffer";
  socket.onopen = () => setState("已連線，開始說話吧", "ok");
  socket.onclose = () => stop("連線已關閉");
  socket.onerror = () => setState("連線錯誤", "error");
  socket.onmessage = ({ data }) => handleEvent(JSON.parse(data));

  els.stop.disabled = false;
  els.mute.disabled = false;
}

function handleEvent(event) {
  switch (event.type) {
    case "audio":
      if (event.data) {
        const chunk = base64ToFloat32(event.data);
        player.port.postMessage(chunk, [chunk.buffer]);
      }
      break;

    case "interrupt":
      // User started talking: drop queued speech so she stops mid-sentence.
      player.port.postMessage({ type: "clear" });
      assistantLine = null;
      setState("在聽你說…", "ok");
      break;

    case "transcript":
      if (event.role === "user") {
        if (event.text) line("user", event.text);
        assistantLine = null;
      } else {
        if (!assistantLine) assistantLine = line("assistant", "");
        assistantLine.textContent += event.text;
      }
      break;

    case "state":
      if (event.value === "ready") setState("已連線，開始說話吧", "ok");
      break;

    case "error":
      line("error", event.message);
      setState("發生錯誤，詳見對話紀錄", "error");
      break;
  }
}

function stop(reason = "已停止") {
  socket?.close();
  socket = null;
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
  ctx?.close();
  ctx = null;
  recorder = player = null;
  assistantLine = null;
  avatar.setLevel(0, false);

  els.start.disabled = false;
  els.stop.disabled = true;
  els.mute.disabled = true;
  els.mute.dataset.on = "false";
  els.mute.textContent = "靜音";
  setState(reason);
}

els.start.addEventListener("click", start);
els.stop.addEventListener("click", () => stop());
els.mute.addEventListener("click", () => {
  const muted = els.mute.dataset.on !== "true";
  els.mute.dataset.on = String(muted);
  els.mute.textContent = muted ? "取消靜音" : "靜音";
  recorder?.port.postMessage({ type: "mute", value: muted });
});
