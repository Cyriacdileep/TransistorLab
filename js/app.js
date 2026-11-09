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
    amp: 0.010, // Default 10 mV to match LTspice capture
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
let neuronChartInstance = null;

/* Configure global chart defaults for oscilloscope instrument aesthetic */
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'IBM Plex Mono', monospace";
  Chart.defaults.font.size = 11;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(9, 14, 23, 0.95)';
  Chart.defaults.plugins.tooltip.titleColor = '#f1f5f9';
  Chart.defaults.plugins.tooltip.bodyColor = '#94a3b8';
  Chart.defaults.plugins.tooltip.borderColor = '#1e293b';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 8;
  Chart.defaults.plugins.tooltip.cornerRadius = 4;
}

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
  initThemeAndNav();
  initBJTModule();
  initGateModule();
  initAdderModule();
  initAmpModule();
  initNeuronModule();
  initLIFModule();
  initLightboxModal();
}

/* ============================================================
 * Theme Toggle & Navigation Scrollspy
 * ============================================================ */
function initThemeAndNav() {
  const toggleBtn = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  // Determine initial theme
  const savedTheme = localStorage.getItem('transistorlab-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  let currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      if (themeIcon) themeIcon.textContent = '☼';
      if (themeText) themeText.textContent = 'Light';
    } else {
      if (themeIcon) themeIcon.textContent = '☽';
      if (themeText) themeText.textContent = 'Dark';
    }
  };

  applyTheme(currentTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('transistorlab-theme', currentTheme);
      applyTheme(currentTheme);
      // Redraw charts
      [bjtChartInstance, ceChartInstance, ceInputChartInstance, lifChartInstance, neuronChartInstance].forEach(chart => {
        if (chart) chart.update('none');
      });
    });
  }

  // Navigation scrollspy
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('#main-nav a');

  const onScroll = () => {
    const scrollPos = window.scrollY + 120;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ============================================================
 * Module 1.1: BJT Inverter & Transfer Curve
 * ============================================================ */
function initBJTModule() {
  const slider = document.getElementById('vin-slider');
  const vinDisp = document.getElementById('vin-display');
  const canvas = document.getElementById('bjtChart');
  if (!slider || !canvas) return;
  const ctx = canvas.getContext('2d');

  // Generate transfer curve points
  const transfer = bjtTransfer(0, 5, 101);
  const vCutoff = 0.70;
  const vSat = 1.18;

  // Custom plugin to shade Cutoff, Active, and Saturation regions
  const bjtRegionsPlugin = {
    id: 'bjtRegions',
    beforeDraw: (chart) => {
      const { ctx, chartArea, scales: { x } } = chart;
      if (!chartArea || !x) return;

      const top = chartArea.top;
      const bottom = chartArea.bottom;
      const height = bottom - top;

      const x0 = x.getPixelForValue(0);
      const xCut = x.getPixelForValue(vCutoff);
      const xSatPix = x.getPixelForValue(vSat);
      const xEnd = x.getPixelForValue(5.0);

      ctx.save();

      // Cutoff Region (0 to 0.70V)
      ctx.fillStyle = 'rgba(100, 116, 139, 0.12)';
      ctx.fillRect(x0, top, xCut - x0, height);

      // Active Region (0.70V to 1.18V)
      ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
      ctx.fillRect(xCut, top, xSatPix - xCut, height);

      // Saturation Region (1.18V to 5.0V)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.fillRect(xSatPix, top, xEnd - xSatPix, height);

      // Region boundary dashed lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(xCut, top);
      ctx.lineTo(xCut, bottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(xSatPix, top);
      ctx.lineTo(xSatPix, bottom);
      ctx.stroke();

      // Region labels at top
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';

      ctx.fillStyle = '#94a3b8';
      ctx.fillText('CUTOFF', (x0 + xCut) / 2, top + 15);
      ctx.fillText('0.70V', xCut, bottom - 6);

      ctx.fillStyle = '#f59e0b';
      ctx.fillText('ACTIVE', (xCut + xSatPix) / 2, top + 15);
      ctx.fillText('1.18V', xSatPix, bottom - 6);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText('SATURATION', (xSatPix + xEnd) / 2, top + 15);

      ctx.restore();
    }
  };

  const curveData = transfer.vin.map((v, i) => ({ x: v, y: transfer.vout[i] }));

  bjtChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Vout (Collector Voltage [V])',
          data: curveData,
          borderColor: '#06b6d4', // CH2: Cyan
          borderWidth: 2.2,
          pointRadius: 0,
          tension: 0.1,
          fill: false
        },
        {
          label: 'Operating Point',
          data: [{ x: 0, y: 5.0 }],
          backgroundColor: '#06b6d4',
          borderColor: '#ffffff',
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: false
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
          max: 5.0,
          title: { display: true, text: 'Input Voltage Vin (V)', color: '#94a3b8' },
          grid: { color: '#1e293b' },
          ticks: {
            color: '#94a3b8',
            stepSize: 0.5,
            callback: (v) => Number(v).toFixed(1) + ' V'
          }
        },
        y: {
          min: 0,
          max: 5.5,
          title: { display: true, text: 'Output Voltage Vout (V)', color: '#06b6d4' },
          grid: { color: '#1e293b' },
          ticks: {
            color: '#94a3b8',
            stepSize: 1.0,
            callback: (v) => Number(v).toFixed(1) + ' V'
          }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#f1f5f9', boxWidth: 12 }
        }
      }
    },
    plugins: [bjtRegionsPlugin]
  });

  const updateBJT = () => {
    state.vin = parseFloat(slider.value);
    vinDisp.textContent = `${state.vin.toFixed(2)} V`;

    const res = bjtSwitch(state.vin);
    const regionBadge = document.getElementById('bjt-region');
    if (regionBadge) {
      regionBadge.textContent = res.region.toUpperCase();
      regionBadge.className = `status-badge ${res.region}`;
    }

    const voutEl = document.getElementById('bjt-vout');
    const ibEl = document.getElementById('bjt-ib');
    const icEl = document.getElementById('bjt-ic');

    if (voutEl) voutEl.textContent = `${res.vout.toFixed(2)} V`;
    if (ibEl) ibEl.textContent = `${(res.ib * 1e6).toFixed(1)} µA`;
    if (icEl) icEl.textContent = `${(res.ic * 1e3).toFixed(2)} mA`;

    // Update marker on plot
    bjtChartInstance.data.datasets[1].data = [{
      x: state.vin,
      y: res.vout
    }];
    bjtChartInstance.update('none');
  };

  slider.addEventListener('input', updateBJT);
  updateBJT();
}

/* ============================================================
 * Module 1.2: Logic Gates (RTL) & Inline Dynamic SVG Schematic
 * ============================================================ */
function initGateModule() {
  const tabs = document.querySelectorAll('#gate-tabs .tab-btn');
  const btnA = document.getElementById('btn-toggle-a');
  const btnB = document.getElementById('btn-toggle-b');
  const inputBContainer = document.getElementById('input-b-container');
  const svgContainer = document.getElementById('gate-schematic-svg');
  const truthContainer = document.getElementById('gate-truth-table-container');

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

  if (btnA) {
    btnA.addEventListener('click', () => {
      state.gateA = state.gateA === 1 ? 0 : 1;
      btnA.textContent = `${state.gateA} (${state.gateA ? '5V' : '0V'})`;
      btnA.className = `bit-toggle ${state.gateA ? 'on' : 'off'}`;
      renderGate();
    });
  }

  if (btnB) {
    btnB.addEventListener('click', () => {
      state.gateB = state.gateB === 1 ? 0 : 1;
      btnB.textContent = `${state.gateB} (${state.gateB ? '5V' : '0V'})`;
      btnB.className = `bit-toggle ${state.gateB ? 'on' : 'off'}`;
      renderGate();
    });
  }

  const renderSVG = (type, a, b, q1On, q2On, vout) => {
    const colorOn = '#f59e0b';
    const colorOff = '#475569';
    const wireColor = '#64748b';
    const outColor = vout > 2.5 ? '#06b6d4' : '#64748b';

    if (type === 'NOT') {
      const qColor = q1On ? colorOn : colorOff;
      return `
        <svg viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg">
          <!-- +5V Rail -->
          <text x="120" y="20" fill="#f1f5f9" font-size="11" font-family="'IBM Plex Mono', monospace" text-anchor="middle">+5V</text>
          <line x1="120" y1="24" x2="120" y2="45" stroke="${wireColor}" stroke-width="2"/>
          <!-- Collector Resistor Rc (1k) -->
          <rect x="112" y="45" width="16" height="30" fill="#1e293b" stroke="${wireColor}" stroke-width="2"/>
          <text x="135" y="64" fill="#94a3b8" font-size="9" font-family="'IBM Plex Mono', monospace">Rc 1k</text>
          <line x1="120" y1="75" x2="120" y2="105" stroke="${wireColor}" stroke-width="2"/>
          
          <!-- OUT Node -->
          <circle cx="120" cy="100" r="4" fill="${outColor}"/>
          <line x1="120" y1="100" x2="185" y2="100" stroke="${outColor}" stroke-width="2"/>
          <circle cx="185" cy="100" r="3" fill="${outColor}"/>
          <text x="195" y="104" fill="${outColor}" font-size="11" font-weight="600" font-family="'IBM Plex Mono', monospace">OUT (${vout.toFixed(1)}V)</text>

          <!-- Input A and Rb -->
          <text x="20" y="128" fill="${a ? colorOn : '#94a3b8'}" font-size="11" font-weight="600" font-family="'IBM Plex Mono', monospace">A (${a ? '5V' : '0V'})</text>
          <line x1="55" y1="125" x2="70" y2="125" stroke="${a ? colorOn : wireColor}" stroke-width="2"/>
          <rect x="70" y="117" width="25" height="16" fill="#1e293b" stroke="${a ? colorOn : wireColor}" stroke-width="2"/>
          <text x="82" y="110" fill="#94a3b8" font-size="8" font-family="'IBM Plex Mono', monospace" text-anchor="middle">Rb 10k</text>
          <line x1="95" y1="125" x2="110" y2="125" stroke="${a ? colorOn : wireColor}" stroke-width="2"/>

          <!-- Transistor Q1 Symbol -->
          <circle cx="125" cy="125" r="18" fill="none" stroke="${qColor}" stroke-width="1.5" stroke-dasharray="${q1On ? 'none' : '3,2'}"/>
          <line x1="110" y1="112" x2="110" y2="138" stroke="${qColor}" stroke-width="3"/>
          <line x1="110" y1="118" x2="120" y2="105" stroke="${qColor}" stroke-width="2"/>
          <line x1="110" y1="132" x2="120" y2="145" stroke="${qColor}" stroke-width="2"/>
          <!-- Emitter Arrow -->
          <polygon points="118,142 122,147 115,147" fill="${qColor}"/>
          <text x="148" y="129" fill="${qColor}" font-size="10" font-weight="600" font-family="'IBM Plex Mono', monospace">Q1 ${q1On ? 'ON' : 'OFF'}</text>

          <!-- Emitter to GND -->
          <line x1="120" y1="145" x2="120" y2="185" stroke="${wireColor}" stroke-width="2"/>
          <!-- GND Symbol -->
          <line x1="105" y1="185" x2="135" y2="185" stroke="${wireColor}" stroke-width="2"/>
          <line x1="110" y1="190" x2="130" y2="190" stroke="${wireColor}" stroke-width="2"/>
          <line x1="115" y1="195" x2="125" y2="195" stroke="${wireColor}" stroke-width="2"/>
          <text x="120" y="208" fill="#94a3b8" font-size="9" font-family="'IBM Plex Mono', monospace" text-anchor="middle">GND</text>
        </svg>
      `;
    }

    if (type === 'NAND') {
      // Exactly matching the user's uploaded RTL NAND Schematic (Q1 and Q2 in SERIES)
      const q1Col = q1On ? colorOn : colorOff;
      const q2Col = q2On ? colorOn : colorOff;

      return `
        <svg viewBox="0 0 260 270" xmlns="http://www.w3.org/2000/svg">
          <!-- +5V Rail -->
          <text x="130" y="18" fill="#f1f5f9" font-size="11" font-family="'IBM Plex Mono', monospace" text-anchor="middle">+5V</text>
          <line x1="130" y1="22" x2="130" y2="38" stroke="${wireColor}" stroke-width="2"/>
          
          <!-- R3 Collector Pull-up (1k) -->
          <rect x="122" y="38" width="16" height="26" fill="#1e293b" stroke="${wireColor}" stroke-width="2"/>
          <text x="145" y="54" fill="#94a3b8" font-size="8" font-family="'IBM Plex Mono', monospace">R3 1k</text>
          <line x1="130" y1="64" x2="130" y2="82" stroke="${wireColor}" stroke-width="2"/>
          
          <!-- OUT Node -->
          <circle cx="130" cy="78" r="4" fill="${outColor}"/>
          <line x1="130" y1="78" x2="200" y2="78" stroke="${outColor}" stroke-width="2"/>
          <circle cx="200" cy="78" r="3" fill="${outColor}"/>
          <text x="208" y="82" fill="${outColor}" font-size="11" font-weight="600" font-family="'IBM Plex Mono', monospace">OUT (${vout.toFixed(1)}V)</text>

          <!-- Input A -> R1 10k -> Q1 Base -->
          <text x="10" y="104" fill="${a ? colorOn : '#94a3b8'}" font-size="10" font-weight="600" font-family="'IBM Plex Mono', monospace">A (${a ? '5V' : '0V'})</text>
          <line x1="48" y1="100" x2="62" y2="100" stroke="${a ? colorOn : wireColor}" stroke-width="2"/>
          <rect x="62" y="93" width="22" height="14" fill="#1e293b" stroke="${a ? colorOn : wireColor}" stroke-width="2"/>
          <text x="73" y="88" fill="#94a3b8" font-size="7" font-family="'IBM Plex Mono', monospace" text-anchor="middle">R1 10k</text>
          <line x1="84" y1="100" x2="115" y2="100" stroke="${a ? colorOn : wireColor}" stroke-width="2"/>

          <!-- Transistor Q1 (BC547B) -->
          <line x1="115" y1="88" x2="115" y2="112" stroke="${q1Col}" stroke-width="3"/>
          <line x1="115" y1="94" x2="130" y2="82" stroke="${q1Col}" stroke-width="2"/>
          <line x1="115" y1="106" x2="130" y2="118" stroke="${q1Col}" stroke-width="2"/>
          <polygon points="127,115 131,120 125,120" fill="${q1Col}"/>
          <text x="145" y="102" fill="${q1Col}" font-size="9" font-weight="600" font-family="'IBM Plex Mono', monospace">Q1 ${q1On ? 'ON' : 'OFF'}</text>

          <!-- Series Link: Q1 Emitter to Q2 Collector -->
          <line x1="130" y1="118" x2="130" y2="148" stroke="${q1On ? colorOn : wireColor}" stroke-width="2"/>

          <!-- Input B -> R2 10k -> Q2 Base -->
          <text x="10" y="170" fill="${b ? colorOn : '#94a3b8'}" font-size="10" font-weight="600" font-family="'IBM Plex Mono', monospace">B (${b ? '5V' : '0V'})</text>
          <line x1="48" y1="166" x2="62" y2="166" stroke="${b ? colorOn : wireColor}" stroke-width="2"/>
          <rect x="62" y="159" width="22" height="14" fill="#1e293b" stroke="${b ? colorOn : wireColor}" stroke-width="2"/>
          <text x="73" y="154" fill="#94a3b8" font-size="7" font-family="'IBM Plex Mono', monospace" text-anchor="middle">R2 10k</text>
          <line x1="84" y1="166" x2="115" y2="166" stroke="${b ? colorOn : wireColor}" stroke-width="2"/>

          <!-- Transistor Q2 (BC547B) -->
          <line x1="115" y1="154" x2="115" y2="178" stroke="${q2Col}" stroke-width="3"/>
          <line x1="115" y1="160" x2="130" y2="148" stroke="${q2Col}" stroke-width="2"/>
          <line x1="115" y1="172" x2="130" y2="184" stroke="${q2Col}" stroke-width="2"/>
          <polygon points="127,181 131,186 125,186" fill="${q2Col}"/>
          <text x="145" y="168" fill="${q2Col}" font-size="9" font-weight="600" font-family="'IBM Plex Mono', monospace">Q2 ${q2On ? 'ON' : 'OFF'}</text>

          <!-- Q2 Emitter to GND -->
          <line x1="130" y1="184" x2="130" y2="218" stroke="${wireColor}" stroke-width="2"/>
          <!-- GND Symbol -->
          <line x1="115" y1="218" x2="145" y2="218" stroke="${wireColor}" stroke-width="2"/>
          <line x1="120" y1="223" x2="140" y2="223" stroke="${wireColor}" stroke-width="2"/>
          <line x1="125" y1="228" x2="135" y2="228" stroke="${wireColor}" stroke-width="2"/>
          <text x="130" y="240" fill="#94a3b8" font-size="9" font-family="'IBM Plex Mono', monospace" text-anchor="middle">GND</text>
        </svg>
      `;
    }

    // NOR: Q1 and Q2 in parallel
    const q1Col = q1On ? colorOn : colorOff;
    const q2Col = q2On ? colorOn : colorOff;

    return `
      <svg viewBox="0 0 280 240" xmlns="http://www.w3.org/2000/svg">
        <!-- +5V Rail -->
        <text x="140" y="18" fill="#f1f5f9" font-size="11" font-family="'IBM Plex Mono', monospace" text-anchor="middle">+5V</text>
        <line x1="140" y1="22" x2="140" y2="38" stroke="${wireColor}" stroke-width="2"/>
        <rect x="132" y="38" width="16" height="26" fill="#1e293b" stroke="${wireColor}" stroke-width="2"/>
        <text x="154" y="54" fill="#94a3b8" font-size="8" font-family="'IBM Plex Mono', monospace">Rc 1k</text>
        <line x1="140" y1="64" x2="140" y2="80" stroke="${wireColor}" stroke-width="2"/>
        
        <!-- OUT Node -->
        <circle cx="140" cy="80" r="4" fill="${outColor}"/>
        <line x1="140" y1="80" x2="225" y2="80" stroke="${outColor}" stroke-width="2"/>
        <circle cx="225" cy="80" r="3" fill="${outColor}"/>
        <text x="232" y="84" fill="${outColor}" font-size="10" font-weight="600" font-family="'IBM Plex Mono', monospace">OUT (${vout.toFixed(1)}V)</text>

        <!-- Split to Parallel Q1 and Q2 Collectors -->
        <line x1="100" y1="92" x2="180" y2="92" stroke="${wireColor}" stroke-width="2"/>
        <line x1="100" y1="92" x2="100" y2="105" stroke="${wireColor}" stroke-width="2"/>
        <line x1="180" y1="92" x2="180" y2="105" stroke="${wireColor}" stroke-width="2"/>

        <!-- Q1 Left (Input A) -->
        <text x="10" y="128" fill="${a ? colorOn : '#94a3b8'}" font-size="9" font-weight="600" font-family="'IBM Plex Mono', monospace">A (${a ? '5V' : '0V'})</text>
        <line x1="45" y1="125" x2="58" y2="125" stroke="${a ? colorOn : wireColor}" stroke-width="2"/>
        <rect x="58" y="119" width="18" height="12" fill="#1e293b" stroke="${a ? colorOn : wireColor}" stroke-width="2"/>
        <line x1="76" y1="125" x2="90" y2="125" stroke="${a ? colorOn : wireColor}" stroke-width="2"/>
        <line x1="90" y1="115" x2="90" y2="135" stroke="${q1Col}" stroke-width="2.5"/>
        <line x1="90" y1="120" x2="100" y2="108" stroke="${q1Col}" stroke-width="2"/>
        <line x1="90" y1="130" x2="100" y2="142" stroke="${q1Col}" stroke-width="2"/>
        <polygon points="98,139 101,144 95,144" fill="${q1Col}"/>
        <text x="92" y="156" fill="${q1Col}" font-size="8" font-family="'IBM Plex Mono', monospace">Q1</text>

        <!-- Q2 Right (Input B) -->
        <text x="205" y="128" fill="${b ? colorOn : '#94a3b8'}" font-size="9" font-weight="600" font-family="'IBM Plex Mono', monospace">B (${b ? '5V' : '0V'})</text>
        <line x1="202" y1="125" x2="188" y2="125" stroke="${b ? colorOn : wireColor}" stroke-width="2"/>
        <rect x="170" y="119" width="18" height="12" fill="#1e293b" stroke="${b ? colorOn : wireColor}" stroke-width="2"/>
        <line x1="170" y1="125" x2="155" y2="125" stroke="${b ? colorOn : wireColor}" stroke-width="2"/>
        <line x1="155" y1="115" x2="155" y2="135" stroke="${q2Col}" stroke-width="2.5"/>
        <line x1="155" y1="120" x2="145" y2="108" stroke="${q2Col}" stroke-width="2"/>
        <line x1="155" y1="130" x2="145" y2="142" stroke="${q2Col}" stroke-width="2"/>
        <polygon points="147,139 150,144 144,144" fill="${q2Col}"/>
        <text x="142" y="156" fill="${q2Col}" font-size="8" font-family="'IBM Plex Mono', monospace">Q2</text>

        <!-- Join Emitters to GND -->
        <line x1="100" y1="142" x2="100" y2="175" stroke="${wireColor}" stroke-width="2"/>
        <line x1="145" y1="142" x2="145" y2="175" stroke="${wireColor}" stroke-width="2"/>
        <line x1="100" y1="175" x2="145" y2="175" stroke="${wireColor}" stroke-width="2"/>
        <line x1="122" y1="175" x2="122" y2="195" stroke="${wireColor}" stroke-width="2"/>
        <!-- GND Symbol -->
        <line x1="110" y1="195" x2="135" y2="195" stroke="${wireColor}" stroke-width="2"/>
        <line x1="115" y1="200" x2="130" y2="200" stroke="${wireColor}" stroke-width="2"/>
        <line x1="119" y1="205" x2="126" y2="205" stroke="${wireColor}" stroke-width="2"/>
        <text x="122" y="217" fill="#94a3b8" font-size="9" font-family="'IBM Plex Mono', monospace" text-anchor="middle">GND</text>
      </svg>
    `;
  };

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

    // Render transistor channels list
    const nodes = document.getElementById('transistor-nodes');
    if (nodes) {
      nodes.innerHTML = '';
      res.transistors.forEach(t => {
        const card = document.createElement('div');
        card.className = `transistor-card ${t.on ? 'on' : 'off'}`;
        card.innerHTML = `
          <span><strong>${t.name}</strong> (Base: ${t.input ? '5V' : '0V'})</span>
          <span class="status-badge ${t.region}">${t.region.toUpperCase()} (${t.on ? 'ON' : 'OFF'})</span>
        `;
        nodes.appendChild(card);
      });
    }

    // Render inline dynamic SVG schematic
    if (svgContainer) {
      const q1On = res.transistors[0]?.on || false;
      const q2On = res.transistors[1]?.on || false;
      svgContainer.innerHTML = renderSVG(state.activeGate, state.gateA, state.gateB, q1On, q2On, res.vout);
    }

    // Render Live Truth Table
    if (truthContainer) {
      if (state.activeGate === 'NOT') {
        const rows = [
          { a: 0, out: 1 },
          { a: 1, out: 0 }
        ];
        truthContainer.innerHTML = `
          <table class="truth-table">
            <thead><tr><th>Input A</th><th>Output Y</th></tr></thead>
            <tbody>
              ${rows.map(r => `
                <tr class="${state.gateA === r.a ? 'active-row' : ''}">
                  <td>${r.a} (${r.a ? '5V' : '0V'})</td>
                  <td><strong>${r.out}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        const rows = [
          { a: 0, b: 0, out: state.activeGate === 'NAND' ? 1 : 1 },
          { a: 0, b: 1, out: state.activeGate === 'NAND' ? 1 : 0 },
          { a: 1, b: 0, out: state.activeGate === 'NAND' ? 1 : 0 },
          { a: 1, b: 1, out: state.activeGate === 'NAND' ? 0 : 0 }
        ];
        truthContainer.innerHTML = `
          <table class="truth-table">
            <thead><tr><th>Input A</th><th>Input B</th><th>Output Y</th></tr></thead>
            <tbody>
              ${rows.map(r => `
                <tr class="${state.gateA === r.a && state.gateB === r.b ? 'active-row' : ''}">
                  <td>${r.a}</td>
                  <td>${r.b}</td>
                  <td><strong>${r.out}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }
  };

  renderGate();
}

/* ============================================================
 * Module 1.3: 4-Bit Ripple Carry Adder
 * ============================================================ */
function initAdderModule() {
  const containerA = document.getElementById('operand-a-bits');
  const containerB = document.getElementById('operand-b-bits');
  if (!containerA || !containerB) return;

  containerA.innerHTML = '';
  containerB.innerHTML = '';

  // Build bit buttons for 4 bits: MSB(3) down to LSB(0)
  for (let i = 3; i >= 0; i--) {
    const btnA = document.createElement('button');
    btnA.type = 'button';
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
    btnB.type = 'button';
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

    // Render stages (Display Stage 3 MSB down to Stage 0 LSB)
    const stagesContainer = document.getElementById('stages-container');
    if (stagesContainer) {
      stagesContainer.innerHTML = '';
      for (let i = 3; i >= 0; i--) {
        const st = res.stages[i];
        const hasCarry = st.cout === 1;
        const card = document.createElement('div');
        card.className = `stage-card ${hasCarry ? 'carry-active' : ''}`;
        card.innerHTML = `
          <div class="stage-header">Stage ${st.bit} (Bit ${st.bit})</div>
          <div class="stage-bits">
            <span>A: <strong>${st.a}</strong> &bull; B: <strong>${st.b}</strong></span>
            <span>Cin: <strong style="color:${st.cin ? 'var(--trace-ch1)' : 'var(--text-dim)'}">${st.cin}</strong></span>
          </div>
          <div class="stage-output">
            <span class="sum-indicator">Sum: <strong>${st.sum}</strong></span>
            <span class="carry-indicator ${hasCarry ? 'active' : ''}">Cout: <strong>${st.cout}</strong></span>
          </div>
        `;
        stagesContainer.appendChild(card);
      }
    }

    document.getElementById('adder-calc-text').textContent =
      `A (${state.adderA}) + B (${state.adderB}) = ${res.total}`;
    document.getElementById('adder-cout').textContent = res.carryOut;
    document.getElementById('adder-sum-bin').textContent = res.sum.toString(2).padStart(4, '0');
    document.getElementById('adder-total-dec').textContent = res.total;
  };

  renderAdder();
}

/* ============================================================
 * Module 2: Common-Emitter Amplifier & Dual Stacked Scope
 * ============================================================ */
function initAmpModule() {
  const presetSelect = document.getElementById('ce-preset-select');
  const bypassBtn = document.getElementById('btn-toggle-bypass');
  const ampSlider = document.getElementById('amp-slider');
  const gainSlider = document.getElementById('gain-slider');
  const ampDisp = document.getElementById('amp-display');
  const gainDisp = document.getElementById('gain-display');
  const inputCanvas = document.getElementById('ceInputChart');
  const outputCanvas = document.getElementById('ceChart');

  if (!inputCanvas || !outputCanvas) return;

  const inputCtx = inputCanvas.getContext('2d');
  const outputCtx = outputCanvas.getContext('2d');

  let currentPreset = 'ltspice-12v';
  let isBypassed = true;

  // Chart 1: Small-Signal AC Input Waveform in mV (CH1: Amber)
  ceInputChartInstance = new Chart(inputCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Vin (Input AC [mV])',
          data: [],
          borderColor: '#f59e0b', // CH1 Amber
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
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
          grid: { color: '#1e293b' },
          ticks: { color: '#94a3b8', maxTicksLimit: 6 }
        },
        y: {
          title: { display: true, text: 'Vin (mV)', color: '#f59e0b' },
          grid: { color: '#1e293b' },
          ticks: { color: '#94a3b8' }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  // Chart 2: Output Waveform in V with Dashed Grey Reference Lines (CH2: Cyan)
  ceChartInstance = new Chart(outputCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Vout (Collector Waveform [V])',
          data: [],
          borderColor: '#06b6d4', // CH2 Cyan
          backgroundColor: 'rgba(6, 182, 212, 0.06)',
          borderWidth: 2.2,
          pointRadius: 0,
          tension: 0.3,
          fill: true
        },
        {
          label: 'Cutoff Ceiling (VCC)',
          data: [],
          borderColor: '#64748b', // Dashed Grey Ref Line
          borderWidth: 1.5,
          borderDash: [5, 4],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Saturation Floor (VCE,sat)',
          data: [],
          borderColor: '#64748b', // Dashed Grey Ref Line
          borderWidth: 1.5,
          borderDash: [5, 4],
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
          grid: { color: '#1e293b' },
          ticks: { color: '#94a3b8', maxTicksLimit: 6 }
        },
        y: {
          min: 0,
          max: 13.0,
          title: { display: true, text: 'Vout (V)', color: '#06b6d4' },
          grid: { color: '#1e293b' },
          ticks: { color: '#94a3b8' }
        }
      },
      plugins: {
        legend: { labels: { color: '#f1f5f9', boxWidth: 12 } }
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
                                res.clipTop ? 'CLIPPED (VCC CEILING)' : 'CLIPPED (SATURATION)';
        clipBadge.className = 'status-badge clipped';
      } else {
        clipBadge.textContent = 'UNCLIPPED (LINEAR)';
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

    // Plot input on its own dedicated top chart in mV (CH1: Amber)
    ceInputChartInstance.data.labels = timeLabels;
    ceInputChartInstance.data.datasets[0].data = res.vin.map(v => v * 1000);
    const inPeakMv = Math.max(5, Math.ceil(state.amp * 1000 * 1.3));
    ceInputChartInstance.options.scales.y.min = -inPeakMv;
    ceInputChartInstance.options.scales.y.max = inPeakMv;
    ceInputChartInstance.update('none');

    // Plot output waveform on bottom chart in V with supply rail reference lines
    ceChartInstance.data.labels = timeLabels;
    ceChartInstance.data.datasets[0].data = res.vout;
    ceChartInstance.data.datasets[1].data = res.t.map(() => res.vmax); // VCC Ceiling
    ceChartInstance.data.datasets[2].data = res.t.map(() => res.vmin); // Saturation Floor
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
 * Module 3.1: Artificial Perceptron & Activation Plot
 * ============================================================ */
function initNeuronModule() {
  const inputs = ['x1', 'x2', 'x3'].map(id => document.getElementById(id));
  const weights = ['w1', 'w2', 'w3'].map(id => document.getElementById(id));
  const biasInput = document.getElementById('bias');
  const actSelect = document.getElementById('activation-select');
  const actBadge = document.getElementById('activation-description-badge');
  const canvas = document.getElementById('neuronChart');

  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Build activation curve [-5, 5]
  const zPoints = [];
  for (let z = -5; z <= 5; z += 0.2) {
    zPoints.push(parseFloat(z.toFixed(2)));
  }

  neuronChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Activation Function f(z)',
          data: [],
          borderColor: '#06b6d4', // CH2: Cyan
          borderWidth: 2.2,
          pointRadius: 0,
          tension: 0.1,
          fill: false
        },
        {
          label: 'Operating Point',
          data: [{ x: 0, y: 0.5 }],
          backgroundColor: '#06b6d4',
          borderColor: '#ffffff',
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          min: -5,
          max: 5,
          title: { display: true, text: 'Affine Sum z = wTx + b', color: '#94a3b8' },
          grid: { color: '#1e293b' },
          ticks: { color: '#94a3b8', stepSize: 1.0 }
        },
        y: {
          min: -0.2,
          max: 1.2,
          title: { display: true, text: 'Output y = f(z)', color: '#06b6d4' },
          grid: { color: '#1e293b' },
          ticks: { color: '#94a3b8', stepSize: 0.2 }
        }
      },
      plugins: {
        legend: { labels: { color: '#f1f5f9', boxWidth: 12 } }
      }
    }
  });

  const updateNeuron = () => {
    const x = inputs.map(el => (el ? parseFloat(el.value) || 0 : 0));
    const w = weights.map(el => (el ? parseFloat(el.value) || 0 : 0));
    const b = biasInput ? parseFloat(biasInput.value) || 0 : 0;
    const act = actSelect ? actSelect.value : 'sigmoid';

    // Update slider readouts
    ['x1', 'x2', 'x3'].forEach((id, i) => {
      const disp = document.getElementById(`${id}-disp`);
      if (disp) disp.textContent = x[i].toFixed(2);
    });
    ['w1', 'w2', 'w3'].forEach((id, i) => {
      const disp = document.getElementById(`${id}-disp`);
      if (disp) disp.textContent = w[i].toFixed(2);
    });
    const bDisp = document.getElementById('bias-disp');
    if (bDisp) bDisp.textContent = b.toFixed(2);

    const res = neuron(x, w, b, act);
    const zEl = document.getElementById('neuron-z');
    const yEl = document.getElementById('neuron-y');
    if (zEl) zEl.textContent = res.z.toFixed(4);
    if (yEl) yEl.textContent = res.y.toFixed(4);

    if (actBadge && ACTIVATION_META[act]) {
      actBadge.textContent = `${ACTIVATION_META[act].name}: ${ACTIVATION_META[act].description}`;
    }

    // Update activation curve data
    const fn = ACTIVATIONS[act] || ACTIVATIONS.sigmoid;
    const curve = zPoints.map(zv => ({ x: zv, y: fn(zv) }));

    if (act === 'relu') {
      neuronChartInstance.options.scales.y.max = 5.2;
    } else {
      neuronChartInstance.options.scales.y.max = 1.2;
    }

    neuronChartInstance.data.datasets[0].data = curve;
    neuronChartInstance.data.datasets[1].data = [{ x: res.z, y: res.y }];
    neuronChartInstance.update('none');
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
 * Module 3.2: Leaky Integrate-and-Fire (LIF) Dynamics
 * ============================================================ */
function initLIFModule() {
  const rateSlider = document.getElementById('lif-rate');
  const vthSlider = document.getElementById('lif-vth');
  const modeSelect = document.getElementById('lif-mode');
  const rateDisp = document.getElementById('lif-rate-disp');
  const vthDisp = document.getElementById('lif-vth-disp');
  const canvas = document.getElementById('lifChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  lifChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Membrane Potential V(t) [V]',
          data: [],
          borderColor: '#06b6d4', // CH2 Cyan
          backgroundColor: 'rgba(6, 182, 212, 0.08)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.05,
          fill: true
        },
        {
          label: 'Threshold Vth [V]',
          data: [],
          borderColor: '#64748b', // Dashed Grey Ref Line
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Action Potential Spikes (δ)',
          data: [],
          backgroundColor: '#f59e0b',
          borderColor: '#ffffff',
          borderWidth: 1.5,
          pointStyle: 'triangle',
          pointRadius: 5,
          pointHoverRadius: 7,
          showLine: false
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
          max: 500, // Clean time axis in milliseconds
          title: { display: true, text: 'Time (ms)', color: '#94a3b8' },
          grid: { color: '#1e293b' },
          ticks: {
            color: '#94a3b8',
            stepSize: 100,
            callback: (v) => v + ' ms'
          }
        },
        y: {
          min: 0,
          max: 2.2,
          title: { display: true, text: 'Membrane Potential (V)', color: '#06b6d4' },
          grid: { color: '#1e293b' },
          ticks: { color: '#94a3b8', stepSize: 0.5 }
        }
      },
      plugins: {
        legend: { labels: { color: '#f1f5f9', boxWidth: 12 } }
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

    // Time in milliseconds (0 to 500 ms)
    lifChartInstance.data.datasets[0].data = res.t.map((ti, idx) => ({
      x: ti * 1000,
      y: res.v[idx]
    }));

    // Dashed threshold line at Vth across 0 to 500 ms
    lifChartInstance.data.datasets[1].data = [
      { x: 0, y: vth },
      { x: 500, y: vth }
    ];

    // Spike markers at top
    lifChartInstance.data.datasets[2].data = res.spikes.map(spkTime => ({
      x: spkTime * 1000,
      y: vth
    }));

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
  neuronChartInstance,
  initApp,
  initThemeAndNav,
  initBJTModule,
  initGateModule,
  initAdderModule,
  initAmpModule,
  initNeuronModule,
  initLIFModule,
  initLightboxModal
};
