/**
 * PCM AudioWorklet processor
 *
 * NOTE: This standalone file is LEGACY and is NOT loaded at runtime. The worklet that
 * actually runs is inlined as `WORKLET_CODE` in composables/useCallAudio.ts (loaded via a
 * Blob URL). This copy is kept in sync only to avoid confusion — edit the inline copy.
 *
 * The AudioContext runs at 16 kHz (the WhatsApp call rate), so the browser's native
 * resampler handles mic 48k→16k and 16k→hardware. The worklet does NO manual resampling on
 * the common path — only framing and a managed playback jitter buffer with prebuffering, a
 * latency cap and click-free underrun concealment (PLC). If a browser ignores the 16 kHz
 * request, a streaming linear resampler bridges the rates.
 */
const TARGET_RATE = 16000;
const FRAME = 960; // 60 ms @ 16 kHz

// Streaming linear resampler — continuity preserved across blocks via fractional position.
function makeResampler(inRate, outRate) {
  let pos = 0;
  const step = inRate / outRate;
  return function (input) {
    if (input.length === 0) return new Float32Array(0);
    const out = [];
    while (pos < input.length) {
      const i = Math.floor(pos);
      const frac = pos - i;
      const a = input[i];
      const b = input[i + 1 < input.length ? i + 1 : input.length - 1];
      out.push(a + (b - a) * frac);
      pos += step;
    }
    pos -= input.length;
    return Float32Array.from(out);
  };
}

class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._rate = sampleRate; // actual AudioContext rate
    this._resample = Math.abs(this._rate - TARGET_RATE) > 1;
    this._capRs = this._resample ? makeResampler(this._rate, TARGET_RATE) : null;  // mic → 16k
    this._playRs = this._resample ? makeResampler(TARGET_RATE, this._rate) : null; // 16k → out

    this._capBuf = new Float32Array(0);  // 16 kHz float capture accumulator
    this._playBuf = new Float32Array(0); // context-rate float playback jitter buffer
    this._started = false;               // prebuffer gate
    this._lastVal = 0;                   // last output sample (click-free underrun)

    this._prebuffer = Math.round(0.09 * this._rate); // ~90 ms before playback starts
    this._targetFill = Math.round(0.15 * this._rate); // ~150 ms target after overrun trim
    this._maxFill = Math.round(0.25 * this._rate);    // ~250 ms hard cap

    this.port.onmessage = (e) => {
      const raw = e.data;
      if (!raw) return;
      const buf = raw instanceof ArrayBuffer ? raw : raw.buffer;
      const int16 = new Int16Array(buf);
      let f = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) f[i] = int16[i] / 32768;
      if (this._resample) f = this._playRs(f); // store in context-rate domain
      const next = new Float32Array(this._playBuf.length + f.length);
      next.set(this._playBuf);
      next.set(f, this._playBuf.length);
      this._playBuf = next;
      if (this._playBuf.length > this._maxFill) {
        this._playBuf = this._playBuf.slice(this._playBuf.length - this._targetFill);
      }
    };
  }

  process(inputs, outputs) {
    // ── Capture: context rate → 16 kHz → 960-sample int16 frames ──
    const input = inputs[0] && inputs[0][0];
    if (input && input.length) {
      const s = this._resample ? this._capRs(input) : input;
      if (s.length) {
        const merged = new Float32Array(this._capBuf.length + s.length);
        merged.set(this._capBuf);
        merged.set(s, this._capBuf.length);
        this._capBuf = merged;
        while (this._capBuf.length >= FRAME) {
          const frame = this._capBuf.subarray(0, FRAME);
          const int16 = new Int16Array(FRAME);
          for (let i = 0; i < FRAME; i++) {
            const x = frame[i] < -1 ? -1 : frame[i] > 1 ? 1 : frame[i];
            int16[i] = x < 0 ? x * 0x8000 : x * 0x7fff;
          }
          this._capBuf = this._capBuf.slice(FRAME);
          this.port.postMessage(int16.buffer, [int16.buffer]);
        }
      }
    }

    // ── Playback: jitter buffer (context rate) → output ──
    const out = outputs[0] && outputs[0][0];
    if (out) {
      if (!this._started) {
        if (this._playBuf.length >= this._prebuffer) this._started = true;
        else { out.fill(0); return true; }
      }
      if (this._playBuf.length >= out.length) {
        out.set(this._playBuf.subarray(0, out.length));
        this._lastVal = out[out.length - 1];
        this._playBuf = this._playBuf.slice(out.length);
      } else {
        // Underrun: conceal with a click-free ramp; keep _started so playback resumes
        // seamlessly when frames arrive (no re-prebuffer latency on transient hiccups).
        const have = this._playBuf.length;
        if (have > 0) {
          out.set(this._playBuf.subarray(0, have));
          this._playBuf = new Float32Array(0);
        }
        this._rampToZero(out, have);
      }
    }
    return true;
  }

  _rampToZero(out, from) {
    const start = from > 0 ? out[from - 1] : this._lastVal;
    const rem = out.length - from;
    for (let i = 0; i < rem; i++) out[from + i] = start * (1 - (i + 1) / rem);
    this._lastVal = 0;
  }
}

registerProcessor('pcm-processor', PcmProcessor);
