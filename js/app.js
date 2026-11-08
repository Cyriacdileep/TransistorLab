import {
  SWITCH,
  bjtSwitch,
  bjtTransfer,
  saturationVin,
  gate,
  add4,
  AMP,
  ceBias,
  ceAmp,
  neuron,
  lif,
  lifPeriod
} from './models.js';

/* ============================================================
 * State Management
 * ============================================================ */
const state = {
  // Module 1
  vin: 0.0,
  activeGate: 'NOT',
  gateA: 0,
  gateB: 0,
  adderA: 5,
  adderB: 9,
  // Module 2
  amp: 0.20,
  gain: 4.70,
  // Module 3
  perceptron: {
    x: [1.0, 0.5, 0.2],
    w: [0.8, -0.5, 1.2],
    b: -0.3,
    act: 'sigmoid'
  },
  lif: {
    rate: 50,
    vth: 1.0,
    mode: 'pulses'
  }
};

let bjtChartInstance = null;
let ceChartInstance = null;
let lifChartInstance = null;

/* ============================================================
 * Initialization
 * ============================================================ */
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}

function initApp() {
  initBJTModule();
  initGateModule();
  initAdderModule();
  initAmpModule();
  initNeuronModule();
  initLIFModule();
}

/* ============================================================
 * Module 1.1: BJT Inverter
 * ============================================================ */
function initBJTModule() {
  const slider = document.getElementById('vin-slider');
  const vinDisp = document.getElementById('vin-display');
  const ctx = document.getElementById('bjtChart').getContext('2d');

  // Generate full transfer curve points
  const transfer = bjtTransfer(0, 5, 101);

  bjtChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: transfer.vin.map(v => v.toFixed(2)),
      datasets: [
        {
          label: 'Vout (V)',
          data: transfer.vout,
          borderColor: '#38bdf8',
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.1,
          fill: false
        },
        {
          label: 'Operating Point',
          data: [{ x: (0).toFixed(2), y: 5 }],
          backgroundColor: '#f43f5e',
          borderColor: '#ffffff',
          borderWidth: 2,
          pointRadius: 7,
          pointHoverRadius: 9,
          showLine: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Input Voltage Vin (V)', color: '#94a3b8' },
          grid: { color: '#243048' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          min: 0,
          max: 5.5,
          title: { display: true, text: 'Output Voltage Vout (V)', color: '#94a3b8' },
          grid: { color: '#243048' },
          ticks: { color: '#94a3b8' }
        }
      },
      plugins: {
        legend: { labels: { color: '#e2e8f0' } }
      }
    }
  });

  const updateBJT = () => {
    state.vin = parseFloat(slider.value);
    vinDisp.textContent = `${state.vin.toFixed(2)} V`;

    const res = bjtSwitch(state.vin);
    const regionBadge = document.getElementById('bjt-region');
    regionBadge.textContent = res.region.toUpperCase();
    regionBadge.className = `status-badge ${res.region}`;

    document.getElementById('bjt-vout').textContent = `${res.vout.toFixed(2)} V`;
    document.getElementById('bjt-ib').textContent = `${(res.ib * 1e6).toFixed(1)} µA`;
    document.getElementById('bjt-ic').textContent = `${(res.ic * 1e3).toFixed(2)} mA`;

    // Update marker on plot
    bjtChartInstance.data.datasets[1].data = [{
      x: state.vin.toFixed(2),
      y: res.vout
    }];
    bjtChartInstance.update('none');
  };

  slider.addEventListener('input', updateBJT);
  updateBJT();
}

/* ============================================================
 * Module 1.2: Logic Gates (RTL)
 * ============================================================ */
function initGateModule() {
  const tabs = document.querySelectorAll('#gate-tabs .tab-btn');
  const btnA = document.getElementById('btn-toggle-a');
  const btnB = document.getElementById('btn-toggle-b');
  const inputBContainer = document.getElementById('input-b-container');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeGate = tab.getAttribute('data-gate');

      if (state.activeGate === 'NOT') {
        inputBContainer.style.display = 'none';
      } else {
        inputBContainer.style.display = 'flex';
      }
      renderGate();
    });
  });

  btnA.addEventListener('click', () => {
    state.gateA = state.gateA === 1 ? 0 : 1;
    btnA.textContent = `${state.gateA} (${state.gateA ? '5V' : '0V'})`;
    btnA.className = `bit-toggle ${state.gateA ? 'on' : 'off'}`;
    renderGate();
  });

  btnB.addEventListener('click', () => {
    state.gateB = state.gateB === 1 ? 0 : 1;
    btnB.textContent = `${state.gateB} (${state.gateB ? '5V' : '0V'})`;
    btnB.className = `bit-toggle ${state.gateB ? 'on' : 'off'}`;
    renderGate();
  });

  const renderGate = () => {
    const res = gate(state.activeGate, state.gateA, state.gateB);
    const formulaDisp = document.getElementById('gate-formula');
    if (state.activeGate === 'NOT') {
      formulaDisp.textContent = `Y = NOT(${state.gateA})`;
    } else if (state.activeGate === 'NAND') {
      formulaDisp.textContent = `Y = NOT(${state.gateA} AND ${state.gateB})`;
    } else {
      formulaDisp.textContent = `Y = NOT(${state.gateA} OR ${state.gateB})`;
    }

    document.getElementById('gate-out-bit').textContent = res.out;
    document.getElementById('gate-out-volt').textContent = `Vout = ${res.vout.toFixed(2)} V`;

    // Render transistor channels
    const nodes = document.getElementById('transistor-nodes');
    nodes.innerHTML = '';
    res.transistors.forEach(t => {
      const card = document.createElement('div');
      card.className = `transistor-card ${t.on ? 'on' : 'off'}`;
      card.innerHTML = `
        <div>
          <span class="transistor-state-led"></span>
          <strong>${t.name} (Base: ${t.input ? '5V' : '0V'})</strong>
        </div>
        <span class="status-badge ${t.region}">${t.region.toUpperCase()} (${t.on ? 'ON' : 'OFF'})</span>
      `;
      nodes.appendChild(card);
    });
  };

  renderGate();
}

/* ============================================================
 * Module 1.3: 4-Bit Ripple Carry Adder
 * ============================================================ */
function initAdderModule() {
  const containerA = document.getElementById('operand-a-bits');
  const containerB = document.getElementById('operand-b-bits');

  // Build bit buttons for 4 bits: MSB(3) down to LSB(0)
  for (let i = 3; i >= 0; i--) {
    const btnA = document.createElement('button');
    btnA.className = 'bit-btn';
    btnA.dataset.bit = i;
    btnA.textContent = (state.adderA >> i) & 1;
    if ((state.adderA >> i) & 1) btnA.classList.add('active');
    btnA.addEventListener('click', () => {
      state.adderA ^= (1 << i);
      renderAdder();
    });
    containerA.appendChild(btnA);

    const btnB = document.createElement('button');
    btnB.className = 'bit-btn';
    btnB.dataset.bit = i;
    btnB.textContent = (state.adderB >> i) & 1;
    if ((state.adderB >> i) & 1) btnB.classList.add('active');
    btnB.addEventListener('click', () => {
      state.adderB ^= (1 << i);
      renderAdder();
    });
    containerB.appendChild(btnB);
  }

  const renderAdder = () => {
    // Update bit buttons
    for (let i = 3; i >= 0; i--) {
      const btnA = containerA.children[3 - i];
      const valA = (state.adderA >> i) & 1;
      btnA.textContent = valA;
      btnA.className = `bit-btn ${valA ? 'active' : ''}`;

      const btnB = containerB.children[3 - i];
      const valB = (state.adderB >> i) & 1;
      btnB.textContent = valB;
      btnB.className = `bit-btn ${valB ? 'active' : ''}`;
    }

    document.getElementById('operand-a-dec').textContent = `= ${state.adderA}`;
    document.getElementById('operand-b-dec').textContent = `= ${state.adderB}`;

    const res = add4(state.adderA, state.adderB);

    // Render stages (Display Stage 3 to Stage 0)
    const stagesContainer = document.getElementById('stages-container');
    stagesContainer.innerHTML = '';
    // Display MSB first down to LSB
    for (let i = 3; i >= 0; i--) {
      const st = res.stages[i];
      const card = document.createElement('div');
      card.className = 'stage-card';
      card.innerHTML = `
        <div class="stage-header">Stage ${st.bit} (Bit ${st.bit})</div>
        <div class="stage-bits">
          <span>A: <strong>${st.a}</strong> | B: <strong>${st.b}</strong></span>
          <span>Cin: <strong style="color:var(--accent-amber)">${st.cin}</strong></span>
        </div>
        <div class="stage-output">
          <span class="sum-indicator">Sum: ${st.sum}</span>
          <span class="carry-indicator">Cout: ${st.cout}</span>
        </div>
      `;
      stagesContainer.appendChild(card);
    }

    document.getElementById('adder-calc-text').textContent = 
      `A (${state.adderA}) + B (${state.adderB}) = ${res.total}`;
    document.getElementById('adder-cout').textContent = res.carryOut;
    document.getElementById('adder-sum-bin').textContent = res.aBinary;
    document.getElementById('adder-sum-bin').textContent = res.sum.toString(2).padStart(4, '0');
    document.getElementById('adder-total-dec').textContent = res.total;
  };

  renderAdder();
}

/* ============================================================
 * Module 2: Common-Emitter Amplifier
 * ============================================================ */
function initAmpModule() {
  const ampSlider = document.getElementById('amp-slider');
  const gainSlider = document.getElementById('gain-slider');
  const ampDisp = document.getElementById('amp-display');
  const gainDisp = document.getElementById('gain-display');
  const ctx = document.getElementById('ceChart').getContext('2d');

  const bias = ceBias();
  document.getElementById('ce-vq').textContent = `${bias.vc.toFixed(2)} V`;

  ceChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Vin (Input)',
          data: [],
          borderColor: '#10b981',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3
        },
        {
          label: 'Vout (Amplified & Inverted)',
          data: [],
          borderColor: '#f59e0b',
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Time (ms)', color: '#94a3b8' },
          grid: { color: '#243048' },
          ticks: { color: '#94a3b8', maxTicksLimit: 8 }
        },
        y: {
          min: 0,
          max: 5.5,
          title: { display: true, text: 'Voltage (V)', color: '#94a3b8' },
          grid: { color: '#243048' },
          ticks: { color: '#94a3b8' }
        }
      },
      plugins: {
        legend: { labels: { color: '#e2e8f0' } }
      }
    }
  });

  const updateAmp = () => {
    state.amp = parseFloat(ampSlider.value);
    state.gain = parseFloat(gainSlider.value);
    ampDisp.textContent = `${state.amp.toFixed(2)} V`;
    gainDisp.textContent = state.gain.toFixed(2);

    const res = ceAmp(state.amp, state.gain);

    const clipBadge = document.getElementById('ce-clipping');
    if (res.clipped) {
      clipBadge.textContent = res.clipTop && res.clipBottom ? 'CLIPPED (BOTH RAILS)' :
                              res.clipTop ? 'CLIPPED (TOP VCC)' : 'CLIPPED (BOTTOM VCE_SAT)';
      clipBadge.className = 'status-badge clipped';
    } else {
      clipBadge.textContent = 'UNCLIPPED (LINEAR)';
      clipBadge.className = 'status-badge normal';
    }

    document.getElementById('ce-max-amp').textContent = `±${res.maxUnclippedAmp.toFixed(3)} V`;
    document.getElementById('ce-measured-gain').textContent = res.measuredGain.toFixed(2);

    ceChartInstance.data.labels = res.t.map(ti => (ti * 1000).toFixed(2));
    ceChartInstance.data.datasets[0].data = res.vin.map(v => v + bias.vb); // biased input display
    ceChartInstance.data.datasets[1].data = res.vout;
    ceChartInstance.update('none');
  };

  ampSlider.addEventListener('input', updateAmp);
  gainSlider.addEventListener('input', updateAmp);
  updateAmp();
}

/* ============================================================
 * Module 3.1: Artificial Perceptron
 * ============================================================ */
function initNeuronModule() {
  const inputs = ['x1', 'x2', 'x3'].map(id => document.getElementById(id));
  const weights = ['w1', 'w2', 'w3'].map(id => document.getElementById(id));
  const biasInput = document.getElementById('bias');
  const actSelect = document.getElementById('activation-select');

  const updateNeuron = () => {
    const x = inputs.map(el => parseFloat(el.value) || 0);
    const w = weights.map(el => parseFloat(el.value) || 0);
    const b = parseFloat(biasInput.value) || 0;
    const act = actSelect.value;

    const res = neuron(x, w, b, act);
    document.getElementById('neuron-z').textContent = res.z.toFixed(4);
    document.getElementById('neuron-y').textContent = res.y.toFixed(4);
  };

  [...inputs, ...weights, biasInput, actSelect].forEach(el => {
    el.addEventListener('input', updateNeuron);
  });
  updateNeuron();
}

/* ============================================================
 * Module 3.2: Leaky Integrate-and-Fire
 * ============================================================ */
function initLIFModule() {
  const rateSlider = document.getElementById('lif-rate');
  const vthSlider = document.getElementById('lif-vth');
  const modeSelect = document.getElementById('lif-mode');
  const rateDisp = document.getElementById('lif-rate-disp');
  const vthDisp = document.getElementById('lif-vth-disp');
  const ctx = document.getElementById('lifChart').getContext('2d');

  lifChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Membrane Potential V(t) [V]',
          data: [],
          borderColor: '#a855f7',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Time (s)', color: '#94a3b8' },
          grid: { color: '#243048' },
          ticks: { color: '#94a3b8', maxTicksLimit: 10 }
        },
        y: {
          min: 0,
          max: 2.2,
          title: { display: true, text: 'Membrane Potential (V)', color: '#94a3b8' },
          grid: { color: '#243048' },
          ticks: { color: '#94a3b8' }
        }
      },
      plugins: {
        legend: { labels: { color: '#e2e8f0' } }
      }
    }
  });

  const updateLIF = () => {
    const rate = parseFloat(rateSlider.value);
    const vth = parseFloat(vthSlider.value);
    const mode = modeSelect.value;

    rateDisp.textContent = `${rate} Hz`;
    vthDisp.textContent = `${vth.toFixed(2)} V`;

    const res = lif(1e-6, 100e3, vth, rate, { mode });

    document.getElementById('lif-tau').textContent = `${(res.tau * 1000).toFixed(0)} ms`;
    document.getElementById('lif-spikes').textContent = res.spikes.length;
    document.getElementById('lif-firing-rate').textContent = `${res.outputRate.toFixed(1)} Hz`;

    lifChartInstance.data.labels = res.t.map(ti => ti.toFixed(3));
    lifChartInstance.data.datasets[0].data = res.v;
    lifChartInstance.update('none');
  };

  rateSlider.addEventListener('input', updateLIF);
  vthSlider.addEventListener('input', updateLIF);
  modeSelect.addEventListener('change', updateLIF);
  updateLIF();
}

/* ============================================================
 * Module Exports
 * ============================================================ */
export {
  state,
  bjtChartInstance,
  ceChartInstance,
  lifChartInstance,
  initBJTModule,
  initGateModule,
  initAdderModule,
  initAmpModule,
  initNeuronModule,
  initLIFModule
};
