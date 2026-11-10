/*
 * TransistorLab models
 * ---------------------------------------------------------------
 * Six functions the website calls. All maths, no UI.
 *
 *   bjtSwitch(vin)            -> BJT inverter: vout, currents, region
 *   bjtTransfer(from,to,n)    -> arrays for the transfer-curve plot
 *   gate(type, a, b)          -> NOT / NAND / NOR built from bjtSwitch
 *   add4(a, b)                -> 4-bit ripple adder built only from NAND gates
 *   ceBias(), ceAmp(amp,gain) -> common-emitter amplifier: bias point, waveforms
 *   neuron(x, w, b, act)      -> artificial neuron
 *   lif(C, R, vth, rate)      -> leaky integrate-and-fire spiking neuron
 *   lifPeriod(C, R, vth, I)   -> analytic firing period (for validation)
 *
 * Usage in the browser:
 *   <script type="module">
 *     import { bjtSwitch, gate, add4, ceAmp, neuron, lif } from './js/models.js';
 *     // or import by domain modules:
 *     import { Digital, Analog, Neural } from './js/models.js';
 *     // or import from the barrel entry point:
 *     import * as TransistorLab from './js/index.js';
 *   </script>
 *
 * Units: volts, amps, ohms, farads, seconds, hertz.
 */

// ---------------------------------------------------------------
// Shared circuit values (the same ones LTspice and the breadboard use)
// ---------------------------------------------------------------
export const SWITCH = {
  VCC: 5,         // supply, V
  RB: 10e3,       // base resistor, ohm
  RC: 1e3,        // collector resistor, ohm
  BETA: 100,      // current gain
  VBE_ON: 0.7,    // base-emitter turn-on voltage, V
  VCE_SAT: 0.2,   // collector-emitter voltage in saturation, V
};

// ---------------------------------------------------------------
// 1. BJT switch (inverter): piecewise model
//    cutoff:     vin <= 0.7 V           -> no current, vout = VCC
//    active:     IC = beta * IB         -> vout = VCC - IC*RC
//    saturation: VCE would drop below 0.2 V -> vout = 0.2 V
// ---------------------------------------------------------------
export function bjtSwitch(vin, p = SWITCH) {
  checkNumber(vin, 'vin');
  if (vin <= p.VBE_ON) {
    return { vin, vout: p.VCC, ib: 0, ic: 0, region: 'cutoff' };
  }
  const ib = (vin - p.VBE_ON) / p.RB;
  const icActive = p.BETA * ib;
  const vceActive = p.VCC - icActive * p.RC;
  if (vceActive > p.VCE_SAT) {
    return { vin, vout: vceActive, ib, ic: icActive, region: 'active' };
  }
  const icSat = (p.VCC - p.VCE_SAT) / p.RC;
  return { vin, vout: p.VCE_SAT, ib, ic: icSat, region: 'saturation' };
}

/** Input voltage where the transistor starts to saturate. */
export function saturationVin(p = SWITCH) {
  const icSat = (p.VCC - p.VCE_SAT) / p.RC;
  return p.VBE_ON + (icSat / p.BETA) * p.RB;
}

/** Arrays for plotting the transfer curve (vin on x, vout on y). */
export function bjtTransfer(from = 0, to = SWITCH.VCC, n = 101, p = SWITCH) {
  const vin = [], vout = [], region = [];
  for (let i = 0; i < n; i++) {
    const v = from + ((to - from) * i) / (n - 1);
    const r = bjtSwitch(v, p);
    vin.push(v); vout.push(r.vout); region.push(r.region);
  }
  return { vin, vout, region };
}

// ---------------------------------------------------------------
// 2. Logic gates (resistor-transistor logic)
//    Logic 1 = VCC on the base, logic 0 = 0 V.
//    NOT : one transistor pulls the output low.
//    NAND: two transistors in SERIES; output low only if both are on.
//    NOR : two transistors in PARALLEL; output low if either is on.
//    The output bit is read from the output voltage, not a lookup table.
// ---------------------------------------------------------------
export function gate(type, a, b = 0, p = SWITCH) {
  const t = String(type).toUpperCase();
  checkBit(a, 'a');
  if (t !== 'NOT') checkBit(b, 'b');

  const q1 = bjtSwitch(a * p.VCC, p);
  const on1 = q1.region === 'saturation';
  let vout, transistors;

  if (t === 'NOT') {
    vout = on1 ? p.VCE_SAT : p.VCC;
    transistors = [{ name: 'Q1', input: a, on: on1, region: q1.region }];
  } else {
    const q2 = bjtSwitch(b * p.VCC, p);
    const on2 = q2.region === 'saturation';
    if (t === 'NAND') {
      vout = on1 && on2 ? 2 * p.VCE_SAT : p.VCC;
    } else if (t === 'NOR') {
      vout = on1 || on2 ? p.VCE_SAT : p.VCC;
    } else {
      throw new Error(`gate type must be NOT, NAND or NOR, got "${type}"`);
    }
    transistors = [
      { name: 'Q1', input: a, on: on1, region: q1.region },
      { name: 'Q2', input: b, on: on2, region: q2.region },
    ];
  }
  const out = vout > p.VCC / 2 ? 1 : 0;
  return { type: t, inputs: t === 'NOT' ? [a] : [a, b], out, vout, transistors };
}

// ---------------------------------------------------------------
// 3. Adders built only from NAND gates
//    Full adder = 9 NANDs (18 transistors); 4-bit adder = 36 NANDs (72 transistors).
// ---------------------------------------------------------------
export function fullAdder(a, b, cin, stage = 0) {
  const gates = [];
  const nand = (id, x, y) => {
    const g = gate('NAND', x, y);
    gates.push({ id: `s${stage}_${id}`, inputs: [x, y], out: g.out });
    return g.out;
  };
  const n1 = nand('n1', a, b);
  const n2 = nand('n2', a, n1);
  const n3 = nand('n3', b, n1);
  const x1 = nand('x1', n2, n3);      // a XOR b
  const n5 = nand('n5', x1, cin);
  const n6 = nand('n6', x1, n5);
  const n7 = nand('n7', cin, n5);
  const sum = nand('sum', n6, n7);     // a XOR b XOR cin
  const cout = nand('cout', n5, n1);   // carry out
  return { sum, cout, gates };
}

export function add4(a, b) {
  checkNibble(a, 'a');
  checkNibble(b, 'b');
  const stages = [];
  let carry = 0;
  for (let i = 0; i < 4; i++) {            // bit 0 (least significant) first
    const ai = (a >> i) & 1;
    const bi = (b >> i) & 1;
    const fa = fullAdder(ai, bi, carry, i);
    stages.push({ bit: i, a: ai, b: bi, cin: carry, sum: fa.sum, cout: fa.cout, gates: fa.gates });
    carry = fa.cout;
  }
  const sumBits = stages.map(s => s.sum);   // LSB first
  const sum4 = sumBits.reduce((acc, bit, i) => acc | (bit << i), 0);
  return {
    a, b,
    aBinary: toBinary(a), bBinary: toBinary(b),
    sum: sum4,                       // 4-bit result (0-15)
    carryOut: carry,                 // fifth bit
    total: sum4 + 16 * carry,        // the full answer (0-30)
    totalBinary: carry + toBinary(sum4),
    carries: stages.map(s => s.cout),// carry out of each stage, bit 0 first
    stages,
    gateCount: 36,
    transistorCount: 72,
  };
}

// ---------------------------------------------------------------
// 4. Common-emitter amplifier (voltage-divider bias, small-signal transconductance & rail clipping)
// ---------------------------------------------------------------
export const AMP = {
  VCC: 5, R1: 33e3, R2: 10e3, RC: 4.7e3, RE: 1e3,
  BETA: 100, VBE_ON: 0.7, VCE_SAT: 0.2,
};

export const AMP_CIRCUITS = {
  'default-5v': {
    id: 'default-5v',
    name: '5V Standard Bench (Degenerated)',
    VCC: 5, R1: 33e3, R2: 10e3, RC: 4.7e3, RE: 1e3, RL: Infinity,
    BETA: 100, VBE_ON: 0.7, VCE_SAT: 0.2, bypassed: false
  },
  'ltspice-12v': {
    id: 'ltspice-12v',
    name: 'LTspice Bench (12V Supply, Bypassed)',
    VCC: 12, R1: 47e3, R2: 10e3, RC: 4.7e3, RE: 1e3, RL: 10e3,
    BETA: 100, VBE_ON: 0.7, VCE_SAT: 0.2, bypassed: true
  }
};

/**
 * DC operating point, transconductance (gm), effective load impedance, and voltage gain.
 * Governed by:
 *   gm = Ic / Vt (where Vt ≈ 25.85 mV at 300K)
 *   rL = Rc || RL
 *   Av = -gm * rL (when emitter bypassed) or -(rL) / (RE + re) (unbypassed)
 */
export function ceBias(p = AMP) {
  const vth = (p.VCC * p.R2) / (p.R1 + p.R2);      // Thevenin base voltage
  const rth = (p.R1 * p.R2) / (p.R1 + p.R2);       // Thevenin base resistance
  const ie = Math.max(0, (vth - p.VBE_ON) / (p.RE + rth / (p.BETA + 1)));
  const ic = (p.BETA / (p.BETA + 1)) * ie;
  const ve = ie * p.RE;
  const vc = p.VCC - ic * p.RC;

  const VT = 0.02585; // thermal voltage at 300K (~26 mV)
  const gm = ic > 0 ? ic / VT : 0; // Transconductance in S (A/V)
  const re = ie > 0 ? VT / ie : Infinity; // dynamic emitter resistance
  const rl = Number.isFinite(p.RL) && p.RL > 0 ? p.RL : Infinity;
  const effectiveLoad = Number.isFinite(rl) ? (p.RC * rl) / (p.RC + rl) : p.RC;

  const isBypassed = Boolean(p.bypassed);
  const gainBypassed = -(gm * effectiveLoad);
  const gainUnbypassed = -effectiveLoad / (p.RE + (re < Infinity ? re : 0));
  
  // Default unbypassed textbook formula matches -Rc/Re for default AMP
  const gain = isBypassed ? gainBypassed : (p === AMP || !Number.isFinite(rl) ? -p.RC / p.RE : gainUnbypassed);

  return {
    vb: ve + p.VBE_ON, ve, vc, vce: vc - ve, ic, ie,
    gm,                // Transconductance (S)
    effectiveLoad,     // Effective load impedance (Ohms)
    re,                // Dynamic emitter resistance (Ohms)
    gain,              // Dynamic voltage gain Av
    nominalGain: -p.RC / p.RE,
    isBypassed,
    region: vc - ve > p.VCE_SAT && ic > 0 ? 'active' : ic > 0 ? 'saturation' : 'cutoff',
    p
  };
}

/**
 * Output waveform for a sine input.
 * amp  = input peak voltage (V)
 * gain = voltage gain magnitude (the output is inverted)
 * The collector cannot rise above VCC (cutoff) or fall below VE + VCE_SAT (saturation),
 * resulting in non-linear waveform distortion known as rail clipping.
 */
export function ceAmp(amp, gain = null, opts = {}) {
  checkNumber(amp, 'amp');
  const p = opts.preset && AMP_CIRCUITS[opts.preset] 
    ? { ...AMP_CIRCUITS[opts.preset], ...(opts.circuit || {}) }
    : { ...AMP, ...(opts.circuit || {}) };
  
  if (typeof opts.bypassed === 'boolean') {
    p.bypassed = opts.bypassed;
  }

  const bias = ceBias(p);
  const effectiveGain = typeof gain === 'number' && Number.isFinite(gain) ? gain : Math.abs(bias.gain);
  const { freq = 1000, cycles = 2, points = 200 } = opts;
  const vq = opts.vq ?? bias.vc;
  const vmax = p.VCC;
  const vmin = opts.vmin ?? Math.max(0, bias.ve + p.VCE_SAT);

  const t = [], vin = [], vout = [];
  let clipTop = false, clipBottom = false;
  for (let i = 0; i < points; i++) {
    const ti = (cycles / freq) * (i / (points - 1));
    const x = amp * Math.sin(2 * Math.PI * freq * ti);
    let y = vq - effectiveGain * x;
    if (y >= vmax) { y = vmax; clipTop = true; }
    if (y <= vmin) { y = vmin; clipBottom = true; }
    t.push(ti); vin.push(x); vout.push(y);
  }
  const ppIn = Math.max(...vin) - Math.min(...vin);
  const ppOut = Math.max(...vout) - Math.min(...vout);
  return {
    t, vin, vout, vq, vmax, vmin,
    gain: effectiveGain,
    gm: bias.gm,
    effectiveLoad: bias.effectiveLoad,
    bias,
    circuit: p,
    clipped: clipTop || clipBottom,
    clipTop,        // output hit VCC: transistor in cutoff (ceiling)
    clipBottom,     // output hit saturation limit: transistor in saturation (floor)
    measuredGain: ppIn > 0 ? ppOut / ppIn : 0,
    maxUnclippedAmp: effectiveGain > 0 ? Math.min(vmax - vq, vq - vmin) / effectiveGain : 0,
  };
}

// ---------------------------------------------------------------
// 5. Artificial neuron: y = f(sum(w_i * x_i) + b)
// ---------------------------------------------------------------
export function neuron(x, w, b = 0, act = 'sigmoid') {
  if (!Array.isArray(x) || !Array.isArray(w) || x.length !== w.length) {
    throw new Error('x and w must be arrays of the same length');
  }
  x.forEach((v, i) => checkNumber(v, `x[${i}]`));
  w.forEach((v, i) => checkNumber(v, `w[${i}]`));
  checkNumber(b, 'b');
  const z = x.reduce((acc, xi, i) => acc + w[i] * xi, 0) + b;
  const f = ACTIVATIONS[act];
  if (!f) throw new Error(`act must be one of ${Object.keys(ACTIVATIONS).join(', ')}`);
  return { z, y: f(z), act };
}

export const ACTIVATIONS = {
  step: z => (z >= 0 ? 1 : 0),
  sigmoid: z => 1 / (1 + Math.exp(-z)),
  relu: z => Math.max(0, z),
};

export const ACTIVATION_META = {
  step: {
    id: 'step',
    name: 'Step',
    formula: 'H(z) = 1 (if z ≥ 0), 0 (if z < 0)',
    displayFormula: 'H(z) = 1 (z ≥ 0), 0 (z < 0)',
    description: 'outputs 1 if z ≥ 0, otherwise 0. A hard yes/no, like a logic gate.'
  },
  sigmoid: {
    id: 'sigmoid',
    name: 'Sigmoid',
    formula: 'σ(z) = 1 / (1 + e^-z)',
    displayFormula: 'σ(z) = 1 / (1 + e^-z)',
    description: 'a smooth S-curve from 0 to 1. At z = 0 the output is exactly 0.5.'
  },
  relu: {
    id: 'relu',
    name: 'ReLU',
    formula: 'f(z) = max(0, z)',
    displayFormula: 'f(z) = max(0, z)',
    description: 'outputs 0 for negative z, otherwise z itself.'
  }
};

// ---------------------------------------------------------------
// 6. Leaky integrate-and-fire neuron
//    C dV/dt = I(t) - V/R ; when V >= vth: spike, V -> vreset
//    Default input: current pulses at `rate` Hz.
// ---------------------------------------------------------------
export function lif(C = 1e-6, R = 100e3, vth = 1, rate = 50, opts = {}) {
  [C, R, vth, rate].forEach((v, i) => checkNumber(v, ['C', 'R', 'vth', 'rate'][i]));
  const {
    mode = 'pulses',      // 'pulses' or 'constant'
    I = mode === 'pulses' ? 100e-6 : 20e-6, // input current, A
    pulseWidth = 5e-3,    // s
    duration = 0.5,       // s
    dt = 1e-4,            // s
    vreset = 0,
    maxPoints = 1000,     // returned arrays are thinned to about this many points
  } = opts;

  const steps = Math.round(duration / dt);
  const every = Math.max(1, Math.ceil(steps / maxPoints));
  const period = rate > 0 ? 1 / rate : Infinity;
  const t = [], v = [], input = [], spikes = [];
  let V = vreset;

  for (let k = 0; k <= steps; k++) {
    const tk = k * dt;
    const Ik = mode === 'constant' ? I : (rate > 0 && (tk % period) < pulseWidth ? I : 0);
    if (k % every === 0) { t.push(tk); v.push(V); input.push(Ik); }
    V += (dt / C) * (Ik - V / R);
    if (V >= vth) {
      spikes.push(tk + dt);
      // always draw the spike, even when the trace is thinned
      t.push(tk + dt, tk + dt); v.push(vth, vreset); input.push(Ik, Ik);
      V = vreset;
    }
  }
  return {
    t, v, input, spikes,
    tau: R * C,
    outputRate: spikes.length / duration,   // spikes per second
  };
}

/** Exact firing period for a constant input current (validation). */
export function lifPeriod(C, R, vth, I, vreset = 0) {
  const vinf = I * R;
  if (vinf <= vth) return Infinity;          // never reaches threshold
  return R * C * Math.log((vinf - vreset) / (vinf - vth));
}

// ---------------------------------------------------------------
// helpers
// ---------------------------------------------------------------
function checkNumber(v, name) {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${name} must be a number`);
}
function checkBit(v, name) {
  if (v !== 0 && v !== 1) throw new Error(`${name} must be 0 or 1`);
}
function checkNibble(v, name) {
  if (!Number.isInteger(v) || v < 0 || v > 15) throw new Error(`${name} must be a whole number from 0 to 15`);
}
function toBinary(n) {
  return n.toString(2).padStart(4, '0');
}

// ---------------------------------------------------------------
// Domain module grouped exports
// ---------------------------------------------------------------
export const Digital = {
  SWITCH,
  bjtSwitch,
  saturationVin,
  bjtTransfer,
  gate,
  fullAdder,
  add4
};

export const Analog = {
  AMP,
  AMP_CIRCUITS,
  ceBias,
  ceAmp
};

export const Neural = {
  neuron,
  ACTIVATIONS,
  ACTIVATION_META,
  lif,
  lifPeriod
};

// ---------------------------------------------------------------
// Default export consolidating all models and modules
// ---------------------------------------------------------------
export default {
  Digital,
  Analog,
  Neural,
  SWITCH,
  bjtSwitch,
  saturationVin,
  bjtTransfer,
  gate,
  fullAdder,
  add4,
  AMP,
  AMP_CIRCUITS,
  ceBias,
  ceAmp,
  neuron,
  ACTIVATIONS,
  ACTIVATION_META,
  lif,
  lifPeriod
};
