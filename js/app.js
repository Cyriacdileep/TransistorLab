import {
  SWITCH,
  bjtSwitch,
  bjtTransfer,
  saturationVin,
  gate,
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
  ce: {
    preset: 'ltspice-12v',
    bypassed: true,
    amp: 0.010,
    gain: 159.1
  },
  amp: 0.010,
  gain: 159.1,
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
let ceInputChartInstance = null;
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
  initLightboxModal();
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
 * Module 2: Common-Emitter Amplifier & Rail Clipping
 * ============================================================ */
function initAmpModule() {
  const presetSelect = document.getElementById('ce-preset-select');
  const bypassBtn = document.getElementById('btn-toggle-bypass');
  const ampSlider = document.getElementById('amp-slider');
  const gainSlider = document.getElementById('gain-slider');
  const ampDisp = document.getElementById('amp-display');
  const gainDisp = document.getElementById('gain-display');
  const inputCtx = document.getElementById('ceInputChart').getContext('2d');
  const outputCtx = document.getElementById('ceChart').getContext('2d');

  let currentPreset = 'ltspice-12v';
  let isBypassed = true;

  // Chart 1: Small-Signal AC Input Waveform in mV (own focused scale)
  ceInputChartInstance = new Chart(inputCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Vin (Input AC [mV])',
          data: [],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          display: true,
          title: { display: false },
          grid: { color: '#243048' },
          ticks: { color: '#94a3b8', maxTicksLimit: 8 }
        },
        y: {
          title: { display: true, text: 'Vin (mV)', color: '#10b981' },
          grid: { color: '#243048' },
          ticks: { color: '#94a3b8' }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  // Chart 2: Collector Output Waveform in V with Cutoff & Saturation Rail Indicators
  ceChartInstance = new Chart(outputCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Vout (Collector Waveform [V])',
          data: [],
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.06)',
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.3,
          fill: true
        },
        {
          label: 'Cutoff Ceiling (Vcc)',
          data: [],
          borderColor: 'rgba(244, 63, 94, 0.75)',
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Saturation Floor (Vce,sat)',
          data: [],
          borderColor: 'rgba(244, 63, 94, 0.75)',
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
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
          max: 13.0,
          title: { display: true, text: 'Vout (V)', color: '#f59e0b' },
          grid: { color: '#243048' },
          ticks: { color: '#94a3b8' }
        }
      },
      plugins: {
        legend: { labels: { color: '#e2e8f0', boxWidth: 14 } }
      }
    }
  });

  const syncControlsForPreset = () => {
    if (currentPreset === 'ltspice-12v') {
      if (isBypassed) {
        ampSlider.min = '0.002';
        ampSlider.max = '0.050';
        ampSlider.step = '0.002';
        ampSlider.value = '0.010'; // default 10 mV matching LTspice
        gainSlider.min = '10';
        gainSlider.max = '250';
        gainSlider.step = '1';
        gainSlider.value = '159.1';
      } else {
        ampSlider.min = '0.05';
        ampSlider.max = '2.00';
        ampSlider.step = '0.05';
        gainSlider.min = '1';
        gainSlider.max = '15';
        gainSlider.step = '0.1';
        gainSlider.value = '3.2';
      }
      ceChartInstance.options.scales.y.max = 13.0;
    } else {
      ampSlider.min = '0.05';
      ampSlider.max = '1.50';
      ampSlider.step = '0.05';
      ampSlider.value = '0.20';
      gainSlider.min = '1.0';
      gainSlider.max = '10.0';
      gainSlider.step = '0.1';
      gainSlider.value = '4.70';
      ceChartInstance.options.scales.y.max = 5.5;
    }
  };

  const updateAmp = () => {
    const circuitBase = currentPreset === 'ltspice-12v' 
      ? AMP_CIRCUITS['ltspice-12v'] 
      : AMP_CIRCUITS['default-5v'];
    const circuit = { ...circuitBase, bypassed: isBypassed };

    const bias = ceBias(circuit);
    state.amp = parseFloat(ampSlider.value);
    state.gain = parseFloat(gainSlider.value);

    // Format display string cleanly
    if (state.amp < 0.1) {
      ampDisp.textContent = `${(state.amp * 1000).toFixed(0)} mV (${state.amp.toFixed(3)} V)`;
    } else {
      ampDisp.textContent = `${state.amp.toFixed(2)} V`;
    }
    gainDisp.textContent = state.gain.toFixed(1);

    const res = ceAmp(state.amp, state.gain, { circuit, preset: currentPreset, bypassed: isBypassed });

    // Update readouts
    const vqEl = document.getElementById('ce-vq');
    if (vqEl) vqEl.textContent = `${res.vq.toFixed(2)} V`;

    const gmEl = document.getElementById('ce-gm');
    if (gmEl) gmEl.textContent = `${(bias.gm * 1000).toFixed(1)} mS`;

    const rloadEl = document.getElementById('ce-rload');
    if (rloadEl) rloadEl.textContent = `${(bias.effectiveLoad / 1000).toFixed(2)} kΩ`;

    const avCalcEl = document.getElementById('ce-av-calc');
    if (avCalcEl) avCalcEl.textContent = `${bias.gain.toFixed(1)} (Inv 180°)`;

    const clipBadge = document.getElementById('ce-clipping');
    if (clipBadge) {
      if (res.clipped) {
        clipBadge.textContent = res.clipTop && res.clipBottom ? 'CLIPPED (BOTH RAILS)' :
                                res.clipTop ? 'CLIPPED (TOP VCC CEILING)' : 'CLIPPED (BOTTOM SATURATION FLOOR)';
        clipBadge.className = 'status-badge clipped';
      } else {
        clipBadge.textContent = 'UNCLIPPED (LINEAR REGIME)';
        clipBadge.className = 'status-badge normal';
      }
    }

    const maxAmpEl = document.getElementById('ce-max-amp');
    if (maxAmpEl) {
      maxAmpEl.textContent = res.maxUnclippedAmp < 0.1 
        ? `±${(res.maxUnclippedAmp * 1000).toFixed(1)} mV`
        : `±${res.maxUnclippedAmp.toFixed(3)} V`;
    }

    const measGainEl = document.getElementById('ce-measured-gain');
    if (measGainEl) measGainEl.textContent = res.measuredGain.toFixed(1);

    const timeLabels = res.t.map(ti => (ti * 1000).toFixed(2));

    // Plot input on its own dedicated small chart in mV
    ceInputChartInstance.data.labels = timeLabels;
    ceInputChartInstance.data.datasets[0].data = res.vin.map(v => v * 1000);
    const inPeakMv = Math.max(5, Math.ceil(state.amp * 1000 * 1.3));
    ceInputChartInstance.options.scales.y.min = -inPeakMv;
    ceInputChartInstance.options.scales.y.max = inPeakMv;
    ceInputChartInstance.update('none');

    // Plot output waveform on 0-13V scale with supply rail limits
    ceChartInstance.data.labels = timeLabels;
    ceChartInstance.data.datasets[0].data = res.vout;
    ceChartInstance.data.datasets[1].data = res.t.map(() => res.vmax); // Cutoff ceiling Vcc
    ceChartInstance.data.datasets[2].data = res.t.map(() => res.vmin); // Saturation floor
    ceChartInstance.update('none');
  };

  if (presetSelect) {
    presetSelect.addEventListener('change', () => {
      currentPreset = presetSelect.value;
      if (currentPreset === 'ltspice-12v') {
        isBypassed = true;
        if (bypassBtn) {
          bypassBtn.textContent = 'Emitter Bypass (Ce): ENABLED';
          bypassBtn.classList.add('active');
        }
      } else {
        isBypassed = false;
        if (bypassBtn) {
          bypassBtn.textContent = 'Emitter Bypass (Ce): DISABLED';
          bypassBtn.classList.remove('active');
        }
      }
      syncControlsForPreset();
      updateAmp();
    });
  }

  if (bypassBtn) {
    bypassBtn.addEventListener('click', () => {
      isBypassed = !isBypassed;
      bypassBtn.textContent = isBypassed 
        ? 'Emitter Bypass (Ce): ENABLED' 
        : 'Emitter Bypass (Ce): DISABLED';
      bypassBtn.classList.toggle('active', isBypassed);
      syncControlsForPreset();
      updateAmp();
    });
  }

  ampSlider.addEventListener('input', updateAmp);
  gainSlider.addEventListener('input', updateAmp);

  syncControlsForPreset();
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
  const actBadge = document.getElementById('activation-description-badge');

  const updateNeuron = () => {
    const x = inputs.map(el => (el ? parseFloat(el.value) || 0 : 0));
    const w = weights.map(el => (el ? parseFloat(el.value) || 0 : 0));
    const b = biasInput ? parseFloat(biasInput.value) || 0 : 0;
    const act = actSelect ? actSelect.value : 'sigmoid';

    const res = neuron(x, w, b, act);
    const zEl = document.getElementById('neuron-z');
    const yEl = document.getElementById('neuron-y');
    if (zEl) zEl.textContent = res.z.toFixed(4);
    if (yEl) yEl.textContent = res.y.toFixed(4);

    if (actBadge && ACTIVATION_META[act]) {
      actBadge.textContent = `${ACTIVATION_META[act].name}: ${ACTIVATION_META[act].description}`;
    }
  };

  [...inputs, ...weights, biasInput, actSelect].filter(Boolean).forEach(el => {
    el.addEventListener('input', updateNeuron);
    if (el.tagName === 'SELECT') {
      el.addEventListener('change', updateNeuron);
    }
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
      datasets: [
        {
          label: 'Membrane Potential V(t) [V]',
          data: [],
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.08)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.05,
          fill: true
        },
        {
          label: 'Threshold Vth [V]',
          data: [],
          borderColor: '#f43f5e',
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: 0.5,
          title: { display: true, text: 'Time (s)', color: '#94a3b8' },
          grid: { color: '#243048' },
          ticks: {
            color: '#94a3b8',
            stepSize: 0.05,
            callback: (v) => Number(v).toFixed(2) + ' s'
          }
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
        legend: { labels: { color: '#e2e8f0', boxWidth: 14 } }
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

    // Map time cleanly to {x, y} for linear scale with tidy step ticks
    lifChartInstance.data.datasets[0].data = res.t.map((ti, idx) => ({ x: ti, y: res.v[idx] }));
    // Dashed threshold line at Vth across 0 to 0.5 s
    lifChartInstance.data.datasets[1].data = [
      { x: 0, y: vth },
      { x: 0.5, y: vth }
    ];
    lifChartInstance.update('none');
  };

  rateSlider.addEventListener('input', updateLIF);
  vthSlider.addEventListener('input', updateLIF);
  modeSelect.addEventListener('change', updateLIF);
  updateLIF();
}

/* ============================================================
 * Modal Lightbox Controller
 * ============================================================ */
function initLightboxModal() {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-img');
  const modalCaption = document.getElementById('modal-caption');
  const closeBtn = document.getElementById('modal-close-btn');

  if (!modal || !modalImg) return;

  const openModal = (src, caption, alt) => {
    modalImg.src = src;
    modalImg.alt = alt || 'Enlarged circuit visual';
    if (modalCaption) modalCaption.textContent = caption || '';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('[data-lightbox]').forEach(card => {
    card.addEventListener('click', () => {
      const src = card.getAttribute('data-lightbox');
      const caption = card.getAttribute('data-caption');
      const img = card.querySelector('img');
      const alt = img ? img.alt : '';
      openModal(src, caption, alt);
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });
}

/* ============================================================
 * Module Exports
 * ============================================================ */
export {
  state,
  bjtChartInstance,
  ceChartInstance,
  ceInputChartInstance,
  lifChartInstance,
  initBJTModule,
  initGateModule,
  initAdderModule,
  initAmpModule,
  initNeuronModule,
  initLIFModule,
  initLightboxModal
};
