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
    a: 0,
    b: 0,
    gate: 'NAND'
  },
  lif: {
    rate: 50,
    vth: 1.0
  }
};

let bjtChartInstance = null;
let ceChartInstance = null;
let ceInputChartInstance = null;
let lifChartInstance = null;
let neuronChartInstance = null;
let renderGateGlobal = null;

/* Configure global chart defaults for oscilloscope instrument aesthetic */
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = '#475569';
  Chart.defaults.font.family = "'Ubuntu Mono', 'IBM Plex Mono', monospace";
  Chart.defaults.font.size = 11;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.95)';
  Chart.defaults.plugins.tooltip.titleColor = '#f8fafc';
  Chart.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
  Chart.defaults.plugins.tooltip.borderColor = '#cbd5e1';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 8;
  Chart.defaults.plugins.tooltip.cornerRadius = 4;
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
  initScrollEffects();
}

/* ============================================================
 * Theme Toggle & Navigation Scrollspy
 * ============================================================ */

function getThemeColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    isDark,
    gridColor: isDark ? '#1e293b' : 'rgba(203, 213, 225, 0.7)',
    tickColor: isDark ? '#94a3b8' : '#475569',
    axisTitleColor: isDark ? '#94a3b8' : '#334155',
    legendColor: isDark ? '#f1f5f9' : '#0f172a',
    ch1Color: isDark ? '#38bdf8' : '#0284c7', // Sky Blue
    ch2Color: isDark ? '#60a5fa' : '#2563eb', // Royal Blue
    ch1Fill: isDark ? 'rgba(56, 189, 248, 0.10)' : 'rgba(2, 132, 199, 0.08)',
    ch2Fill: isDark ? 'rgba(96, 165, 250, 0.08)' : 'rgba(37, 99, 235, 0.08)',
    refColor: '#94a3b8',
    opPointBg: isDark ? '#38bdf8' : '#1d4ed8',
    opPointBorder: '#ffffff'
  };
}

function updateChartsForTheme(theme) {
  const tc = getThemeColors();

  if (bjtChartInstance) {
    bjtChartInstance.data.datasets[0].borderColor = tc.ch2Color;
    bjtChartInstance.data.datasets[1].backgroundColor = tc.opPointBg;
    bjtChartInstance.data.datasets[1].borderColor = tc.opPointBorder;
    if (bjtChartInstance.options.scales?.x) {
      bjtChartInstance.options.scales.x.grid.color = tc.gridColor;
      bjtChartInstance.options.scales.x.ticks.color = tc.tickColor;
      bjtChartInstance.options.scales.x.title.color = tc.axisTitleColor;
    }
    if (bjtChartInstance.options.scales?.y) {
      bjtChartInstance.options.scales.y.grid.color = tc.gridColor;
      bjtChartInstance.options.scales.y.ticks.color = tc.tickColor;
      bjtChartInstance.options.scales.y.title.color = tc.ch2Color;
    }
    if (bjtChartInstance.options.plugins?.legend?.labels) {
      bjtChartInstance.options.plugins.legend.labels.color = tc.legendColor;
    }
    bjtChartInstance.update('none');
  }

  if (ceInputChartInstance) {
    ceInputChartInstance.data.datasets[0].borderColor = tc.ch1Color;
    ceInputChartInstance.data.datasets[0].backgroundColor = tc.ch1Fill;
    if (ceInputChartInstance.options.scales?.x) {
      ceInputChartInstance.options.scales.x.grid.color = tc.gridColor;
      ceInputChartInstance.options.scales.x.ticks.color = tc.tickColor;
    }
    if (ceInputChartInstance.options.scales?.y) {
      ceInputChartInstance.options.scales.y.grid.color = tc.gridColor;
      ceInputChartInstance.options.scales.y.ticks.color = tc.tickColor;
      ceInputChartInstance.options.scales.y.title.color = tc.ch1Color;
    }
    ceInputChartInstance.update('none');
  }

  if (ceChartInstance) {
    ceChartInstance.data.datasets[0].borderColor = tc.ch2Color;
    ceChartInstance.data.datasets[0].backgroundColor = tc.ch2Fill;
    if (ceChartInstance.options.scales?.x) {
      ceChartInstance.options.scales.x.grid.color = tc.gridColor;
      ceChartInstance.options.scales.x.ticks.color = tc.tickColor;
      ceChartInstance.options.scales.x.title.color = tc.axisTitleColor;
    }
    if (ceChartInstance.options.scales?.y) {
      ceChartInstance.options.scales.y.grid.color = tc.gridColor;
      ceChartInstance.options.scales.y.ticks.color = tc.tickColor;
      ceChartInstance.options.scales.y.title.color = tc.ch2Color;
    }
    if (ceChartInstance.options.plugins?.legend?.labels) {
      ceChartInstance.options.plugins.legend.labels.color = tc.legendColor;
    }
    ceChartInstance.update('none');
  }

  if (neuronChartInstance) {
    neuronChartInstance.data.datasets[0].borderColor = tc.ch2Color;
    neuronChartInstance.data.datasets[1].backgroundColor = tc.opPointBg;
    neuronChartInstance.data.datasets[1].borderColor = tc.opPointBorder;
    if (neuronChartInstance.options.scales?.x) {
      neuronChartInstance.options.scales.x.grid.color = tc.gridColor;
      neuronChartInstance.options.scales.x.ticks.color = tc.tickColor;
      neuronChartInstance.options.scales.x.title.color = tc.axisTitleColor;
    }
    if (neuronChartInstance.options.scales?.y) {
      neuronChartInstance.options.scales.y.grid.color = tc.gridColor;
      neuronChartInstance.options.scales.y.ticks.color = tc.tickColor;
      neuronChartInstance.options.scales.y.title.color = tc.ch2Color;
    }
    if (neuronChartInstance.options.plugins?.legend?.labels) {
      neuronChartInstance.options.plugins.legend.labels.color = tc.legendColor;
    }
    neuronChartInstance.update('none');
  }

  if (lifChartInstance) {
    lifChartInstance.data.datasets[0].borderColor = tc.ch2Color;
    lifChartInstance.data.datasets[0].backgroundColor = tc.ch2Fill;
    if (lifChartInstance.data.datasets[2]) {
      lifChartInstance.data.datasets[2].backgroundColor = tc.ch1Color;
    }
    if (lifChartInstance.options.scales?.x) {
      lifChartInstance.options.scales.x.grid.color = tc.gridColor;
      lifChartInstance.options.scales.x.ticks.color = tc.tickColor;
      lifChartInstance.options.scales.x.title.color = tc.axisTitleColor;
    }
    if (lifChartInstance.options.scales?.y) {
      lifChartInstance.options.scales.y.grid.color = tc.gridColor;
      lifChartInstance.options.scales.y.ticks.color = tc.tickColor;
      lifChartInstance.options.scales.y.title.color = tc.ch2Color;
    }
    if (lifChartInstance.options.plugins?.legend?.labels) {
      lifChartInstance.options.plugins.legend.labels.color = tc.legendColor;
    }
    lifChartInstance.update('none');
  }

  if (typeof renderGateGlobal === 'function') {
    renderGateGlobal();
  }
}

function initThemeAndNav() {
  const toggleBtn = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  // Default to White & Blue ('light') theme
  const savedTheme = localStorage.getItem('transistorlab-theme');
  let currentTheme = savedTheme || 'light';

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      if (themeIcon) themeIcon.textContent = '☼';
      if (themeText) themeText.textContent = 'Light';
    } else {
      if (themeIcon) themeIcon.textContent = '☽';
      if (themeText) themeText.textContent = 'Dark';
    }
    updateChartsForTheme(theme);
  };

  applyTheme(currentTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('transistorlab-theme', currentTheme);
      applyTheme(currentTheme);
    });
  }

  // Navigation scrollspy & smooth click navigation
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('#main-nav a');
  const allNavAnchors = document.querySelectorAll('#main-nav a, .pathway-step');

  // Smooth click handler with navbar offset
  allNavAnchors.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          const navbar = document.querySelector('.navbar');
          const navbarHeight = navbar ? navbar.offsetHeight : 60;
          const targetY = targetEl.getBoundingClientRect().top + window.scrollY - navbarHeight - 12;
          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth'
          });
          history.pushState(null, '', targetId);
          navLinks.forEach(l => {
            l.classList.toggle('active', l.getAttribute('href') === targetId);
          });
        }
      }
    });
  });

  const onScroll = () => {
    const navbar = document.querySelector('.navbar');
    const navbarHeight = navbar ? navbar.offsetHeight : 60;
    const scrollPos = window.scrollY + navbarHeight + 40;

    sections.forEach(section => {
      const top = section.getBoundingClientRect().top + window.scrollY;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });

    // The last section is too short to reach the top, so highlight it at the page bottom
    const atPageBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    if (atPageBottom && navLinks.length) {
      navLinks.forEach((link, i) => link.classList.toggle('active', i === navLinks.length - 1));
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ============================================================
 * Scroll Effects: growing titles + side section rail
 * ============================================================ */
function initScrollEffects() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const wideEnough = window.matchMedia('(min-width: 700px)');
  const navbarHeight = () => {
    const nav = document.querySelector('.navbar');
    return nav ? nav.offsetHeight : 60;
  };

  /* ---- 1. Titles grow as they reach the reading line, shrink as they leave ---- */
  const titles = Array.from(document.querySelectorAll(
    '.section-intro-block h2, .submodule-intro h3'
  ));
  titles.forEach(t => t.classList.add('scroll-title'));

  const MAX_GROW = { H2: 0.16, H3: 0.12 }; // +16% / +12% at the reading line

  const updateTitles = () => {
    if (reduceMotion.matches || !wideEnough.matches) {
      titles.forEach(t => {
        t.style.setProperty('--title-scale', '1');
        t.classList.remove('title-in-focus');
      });
      return;
    }
    const top = navbarHeight();
    const readingLine = top + (window.innerHeight - top) * 0.3; // 30% down the visible area
    const range = window.innerHeight * 0.35;
    titles.forEach(t => {
      const r = t.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - readingLine);
      let k = Math.max(0, 1 - d / range);
      k = k * k * (3 - 2 * k); // smoothstep, so it eases in and out
      t.style.setProperty('--title-scale', (1 + (MAX_GROW[t.tagName] || 0.1) * k).toFixed(3));
      t.classList.toggle('title-in-focus', k > 0.6);
    });
  };

  /* ---- 2. Side rail: one stop per section, fill shows progress, click or drag to jump ---- */
  const navLinks = Array.from(document.querySelectorAll('#main-nav a'));
  const stops = navLinks
    .map(a => ({ id: a.getAttribute('href').slice(1), label: a.textContent.trim() }))
    .filter(s => document.getElementById(s.id));

  const rail = document.createElement('nav');
  rail.className = 'section-rail';
  rail.setAttribute('aria-label', 'Jump to section');
  rail.innerHTML = `
    <div class="rail-track" aria-hidden="true"><div class="rail-fill"></div></div>
    <ol class="rail-stops">
      ${stops.map(s => `
        <li>
          <a class="rail-stop" href="#${s.id}" data-target="${s.id}" draggable="false">
            <span class="rail-label">${s.label}</span>
            <span class="rail-dot" aria-hidden="true"></span>
          </a>
        </li>`).join('')}
    </ol>`;
  document.body.appendChild(rail);

  const track = rail.querySelector('.rail-track');
  const fill = rail.querySelector('.rail-fill');
  const stopEls = Array.from(rail.querySelectorAll('.rail-stop'));
  const offset = () => navbarHeight() + 12;
  const sectionTops = () => stops.map(s =>
    document.getElementById(s.id).getBoundingClientRect().top + window.scrollY - offset()
  );
  const atBottom = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;

  // Scroll position -> rail fraction (0..1), piecewise so each dot lines up with its section
  const currentFraction = () => {
    const tops = sectionTops();
    const n = tops.length;
    if (n < 2) return 0;
    if (atBottom()) return 1;
    const y = window.scrollY + 1;
    if (y <= tops[0]) return 0;
    for (let i = 0; i < n - 1; i++) {
      if (y < tops[i + 1]) return (i + (y - tops[i]) / (tops[i + 1] - tops[i])) / (n - 1);
    }
    return 1;
  };

  // Rail fraction -> page scroll position (inverse of the above)
  const scrollForFraction = f => {
    const tops = sectionTops();
    const n = tops.length;
    const x = Math.min(Math.max(f, 0), 1) * (n - 1);
    const i = Math.min(Math.floor(x), n - 2);
    return tops[i] + (x - i) * (tops[i + 1] - tops[i]);
  };

  const updateRail = () => {
    const f = currentFraction();
    fill.style.height = `${(f * 100).toFixed(2)}%`;
    // Same rule as the top menu: the last section whose top has passed just below the navbar
    const probe = window.scrollY + navbarHeight() + 40;
    let active = 0;
    stops.forEach((s, i) => {
      const el = document.getElementById(s.id);
      if (el.getBoundingClientRect().top + window.scrollY <= probe) active = i;
    });
    if (atBottom()) active = stops.length - 1;
    stopEls.forEach((el, i) => {
      el.classList.toggle('active', i === active);
      if (i === active) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
  };

  let suppressClick = false; // set when a drag ends on a dot, so it doesn't also jump
  stopEls.forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      if (suppressClick) { suppressClick = false; return; }
      const target = document.getElementById(el.dataset.target);
      if (!target) return;
      window.scrollTo({
        top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset()),
        behavior: reduceMotion.matches ? 'auto' : 'smooth'
      });
      history.pushState(null, '', `#${el.dataset.target}`);
    });
  });

  // Click or drag along the track to scrub through the page
  const stopsList = rail.querySelector('.rail-stops');
  const fractionFromPointer = e => {
    const r = track.getBoundingClientRect();
    return (e.clientY - r.top) / r.height;
  };
  // 'instant' overrides the page's CSS smooth scrolling so the page follows the pointer
  const scrub = e => window.scrollTo({ top: Math.max(0, scrollForFraction(fractionFromPointer(e))), behavior: 'instant' });
  rail.addEventListener('dragstart', e => e.preventDefault()); // stop the browser dragging the link itself
  let pressed = false, dragging = false, startY = 0, onDot = false;
  stopsList.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    pressed = true; dragging = false; startY = e.clientY;
    onDot = !!e.target.closest('.rail-stop');
  });
  stopsList.addEventListener('pointermove', e => {
    if (!pressed) return;
    if (!dragging && Math.abs(e.clientY - startY) > 4) {
      dragging = true;
      rail.classList.add('dragging');
      stopsList.setPointerCapture(e.pointerId);
    }
    if (dragging) scrub(e);
  });
  const endDrag = e => {
    if (pressed && !dragging && !onDot && e.type === 'pointerup') scrub(e); // plain click on the track
    if (dragging && onDot) {
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0); // only swallow the click that ends this drag
    }
    pressed = false; dragging = false;
    rail.classList.remove('dragging');
  };
  stopsList.addEventListener('pointerup', endDrag);
  stopsList.addEventListener('pointercancel', endDrag);

  /* ---- shared scroll loop ---- */
  let ticking = false;
  const onFrame = () => { ticking = false; updateTitles(); updateRail(); };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  reduceMotion.addEventListener?.('change', request);
  wideEnough.addEventListener?.('change', request);
  onFrame();
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

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

      ctx.save();

      // Cutoff Region (0 to 0.70V)
      ctx.fillStyle = isDark ? 'rgba(100, 116, 139, 0.12)' : 'rgba(203, 213, 225, 0.25)';
      ctx.fillRect(x0, top, xCut - x0, height);

      // Active Region (0.70V to 1.18V)
      ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.10)' : 'rgba(37, 99, 235, 0.08)';
      ctx.fillRect(xCut, top, xSatPix - xCut, height);

      // Saturation Region (1.18V to 5.0V)
      ctx.fillStyle = isDark ? 'rgba(96, 165, 250, 0.08)' : 'rgba(2, 132, 199, 0.05)';
      ctx.fillRect(xSatPix, top, xEnd - xSatPix, height);

      // Region boundary dashed lines
      ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.6)';
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
      ctx.font = '600 10px "Ubuntu Mono", "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';

      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx.fillText('CUTOFF', (x0 + xCut) / 2, top + 15);
      ctx.fillText('0.70V', xCut, bottom - 6);

      ctx.fillStyle = isDark ? '#38bdf8' : '#2563eb';
      ctx.fillText('ACTIVE', (xCut + xSatPix) / 2, top + 15);
      ctx.fillText('1.18V', xSatPix, bottom - 6);

      ctx.fillStyle = isDark ? '#60a5fa' : '#0284c7';
      ctx.fillText('SATURATION', (xSatPix + xEnd) / 2, top + 15);

      ctx.restore();
    }
  };

  const tc = getThemeColors();
  const curveData = transfer.vin.map((v, i) => ({ x: v, y: transfer.vout[i] }));

  bjtChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Vout (Collector Voltage [V])',
          data: curveData,
          borderColor: tc.ch2Color,
          borderWidth: 2.2,
          pointRadius: 0,
          tension: 0.1,
          fill: false
        },
        {
          label: 'Operating Point',
          data: [{ x: 0, y: 5.0 }],
          backgroundColor: tc.opPointBg,
          borderColor: tc.opPointBorder,
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
      resizeDelay: 50,
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: 5.0,
          title: { display: true, text: 'Input Voltage Vin (V)', color: tc.axisTitleColor },
          grid: { color: tc.gridColor },
          ticks: {
            color: tc.tickColor,
            stepSize: 0.5,
            callback: (v) => Number(v).toFixed(1) + ' V'
          }
        },
        y: {
          min: 0,
          max: 5.5,
          title: { display: true, text: 'Output Voltage Vout (V)', color: tc.ch2Color },
          grid: { color: tc.gridColor },
          ticks: {
            color: tc.tickColor,
            stepSize: 1.0,
            callback: (v) => Number(v).toFixed(1) + ' V'
          }
        }
      },
      plugins: {
        legend: {
          labels: { color: tc.legendColor, boxWidth: 12 }
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
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const colorOn = isDark ? '#38bdf8' : '#2563eb';
    const colorOff = isDark ? '#475569' : '#94a3b8';
    const wireColor = isDark ? '#64748b' : '#64748b';
    const outColor = vout > 2.5 ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#64748b' : '#94a3b8');
    const railColor = isDark ? '#f1f5f9' : '#0f172a';
    const resFill = isDark ? '#1e293b' : '#f8fafc';
    const resStroke = isDark ? wireColor : '#cbd5e1';
    const labelColor = isDark ? '#94a3b8' : '#475569';

    if (type === 'NOT') {
      const qColor = q1On ? colorOn : colorOff;
      return `
        <svg viewBox="0 0 280 230" xmlns="http://www.w3.org/2000/svg">
          <!-- +5V Rail -->
          <text x="130" y="18" fill="${railColor}" font-size="11" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="middle">+5V</text>
          <line x1="130" y1="22" x2="130" y2="38" stroke="${wireColor}" stroke-width="2"/>
          
          <!-- Collector Resistor Rc (1k) -->
          <rect x="122" y="38" width="16" height="26" fill="${resFill}" stroke="${resStroke}" stroke-width="2"/>
          <text x="145" y="54" fill="${labelColor}" font-size="8" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace">Rc 1k</text>
          <line x1="130" y1="64" x2="130" y2="80" stroke="${wireColor}" stroke-width="2"/>
          
          <!-- OUT Node -->
          <circle cx="130" cy="80" r="3.5" fill="${outColor}"/>
          <line x1="130" y1="80" x2="190" y2="80" stroke="${outColor}" stroke-width="2"/>
          <circle cx="190" cy="80" r="3" fill="${outColor}"/>
          <text x="198" y="84" fill="${outColor}" font-size="10" font-weight="600" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace">OUT (${vout.toFixed(1)}V)</text>

          <!-- Drop to Q1 Collector -->
          <line x1="130" y1="80" x2="130" y2="108" stroke="${q1On ? colorOn : wireColor}" stroke-width="2"/>

          <!-- Input A and Rb -->
          <text x="36" y="130" fill="${a ? colorOn : labelColor}" font-size="10" font-weight="600" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="end">A (${a ? '5V' : '0V'})</text>
          <line x1="42" y1="126" x2="64" y2="126" stroke="${a ? colorOn : wireColor}" stroke-width="2"/>
          <rect x="64" y="119" width="24" height="14" fill="${resFill}" stroke="${a ? colorOn : resStroke}" stroke-width="2"/>
          <text x="76" y="113" fill="${labelColor}" font-size="7" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="middle">Rb 10k</text>
          <line x1="88" y1="126" x2="112" y2="126" stroke="${a ? colorOn : wireColor}" stroke-width="2"/>

          <!-- Transistor Q1 Symbol -->
          <line x1="112" y1="114" x2="112" y2="138" stroke="${qColor}" stroke-width="2.5"/>
          <line x1="112" y1="120" x2="130" y2="108" stroke="${qColor}" stroke-width="2"/>
          <line x1="112" y1="132" x2="130" y2="144" stroke="${qColor}" stroke-width="2"/>
          <!-- Emitter Arrow -->
          <polygon points="126,137 130,144 122,143" fill="${qColor}"/>
          <text x="145" y="129" fill="${qColor}" font-size="10" font-weight="600" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace">Q1 ${q1On ? 'ON' : 'OFF'}</text>

          <!-- Emitter to GND -->
          <line x1="130" y1="144" x2="130" y2="185" stroke="${q1On ? colorOn : wireColor}" stroke-width="2"/>
          <!-- GND Symbol -->
          <line x1="115" y1="185" x2="145" y2="185" stroke="${q1On ? colorOn : wireColor}" stroke-width="2"/>
          <line x1="120" y1="190" x2="140" y2="190" stroke="${q1On ? colorOn : wireColor}" stroke-width="2"/>
          <line x1="125" y1="195" x2="135" y2="195" stroke="${q1On ? colorOn : wireColor}" stroke-width="2"/>
          <text x="130" y="208" fill="${labelColor}" font-size="9" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="middle">GND</text>
        </svg>
      `;
    }

    if (type === 'NAND') {
      // Exactly matching RTL NAND Schematic: Q1 and Q2 in SERIES
      const q1Col = q1On ? colorOn : colorOff;
      const q2Col = q2On ? colorOn : colorOff;
      const isPathActive = q1On && q2On;

      return `
        <svg viewBox="0 0 280 270" xmlns="http://www.w3.org/2000/svg">
          <!-- +5V Rail -->
          <text x="130" y="18" fill="${railColor}" font-size="11" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="middle">+5V</text>
          <line x1="130" y1="22" x2="130" y2="38" stroke="${wireColor}" stroke-width="2"/>
          
          <!-- R3 Collector Pull-up (1k) -->
          <rect x="122" y="38" width="16" height="26" fill="${resFill}" stroke="${resStroke}" stroke-width="2"/>
          <text x="145" y="54" fill="${labelColor}" font-size="8" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace">R3 1k</text>
          <line x1="130" y1="64" x2="130" y2="80" stroke="${wireColor}" stroke-width="2"/>
          
          <!-- OUT Node -->
          <circle cx="130" cy="80" r="3.5" fill="${outColor}"/>
          <line x1="130" y1="80" x2="190" y2="80" stroke="${outColor}" stroke-width="2"/>
          <circle cx="190" cy="80" r="3" fill="${outColor}"/>
          <text x="198" y="84" fill="${outColor}" font-size="10" font-weight="600" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace">OUT (${vout.toFixed(1)}V)</text>

          <!-- Input A -> R1 10k -> Q1 Base -->
          <text x="36" y="104" fill="${a ? colorOn : labelColor}" font-size="10" font-weight="600" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="end">A (${a ? '5V' : '0V'})</text>
          <line x1="42" y1="100" x2="66" y2="100" stroke="${a ? colorOn : wireColor}" stroke-width="2"/>
          <rect x="66" y="93" width="24" height="14" fill="${resFill}" stroke="${a ? colorOn : resStroke}" stroke-width="2"/>
          <text x="78" y="87" fill="${labelColor}" font-size="7" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="middle">R1 10k</text>
          <line x1="90" y1="100" x2="115" y2="100" stroke="${a ? colorOn : wireColor}" stroke-width="2"/>

          <!-- Transistor Q1 (BC547B) -->
          <line x1="115" y1="88" x2="115" y2="112" stroke="${q1Col}" stroke-width="2.5"/>
          <line x1="115" y1="94" x2="130" y2="80" stroke="${q1Col}" stroke-width="2"/>
          <line x1="115" y1="106" x2="130" y2="120" stroke="${q1Col}" stroke-width="2"/>
          <polygon points="126,113 130,120 122,119" fill="${q1Col}"/>
          <text x="145" y="103" fill="${q1Col}" font-size="9" font-weight="600" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace">Q1 ${q1On ? 'ON' : 'OFF'}</text>

          <!-- Series Link: Q1 Emitter to Q2 Collector -->
          <line x1="130" y1="120" x2="130" y2="146" stroke="${q1On ? colorOn : wireColor}" stroke-width="2"/>

          <!-- Input B -> R2 10k -> Q2 Base -->
          <text x="36" y="170" fill="${b ? colorOn : labelColor}" font-size="10" font-weight="600" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="end">B (${b ? '5V' : '0V'})</text>
          <line x1="42" y1="166" x2="66" y2="166" stroke="${b ? colorOn : wireColor}" stroke-width="2"/>
          <rect x="66" y="159" width="24" height="14" fill="${resFill}" stroke="${b ? colorOn : resStroke}" stroke-width="2"/>
          <text x="78" y="153" fill="${labelColor}" font-size="7" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="middle">R2 10k</text>
          <line x1="90" y1="166" x2="115" y2="166" stroke="${b ? colorOn : wireColor}" stroke-width="2"/>

          <!-- Transistor Q2 (BC547B) -->
          <line x1="115" y1="154" x2="115" y2="178" stroke="${q2Col}" stroke-width="2.5"/>
          <line x1="115" y1="160" x2="130" y2="146" stroke="${q2Col}" stroke-width="2"/>
          <line x1="115" y1="172" x2="130" y2="186" stroke="${q2Col}" stroke-width="2"/>
          <polygon points="126,179 130,186 122,185" fill="${q2Col}"/>
          <text x="145" y="169" fill="${q2Col}" font-size="9" font-weight="600" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace">Q2 ${q2On ? 'ON' : 'OFF'}</text>

          <!-- Q2 Emitter to GND -->
          <line x1="130" y1="186" x2="130" y2="218" stroke="${isPathActive ? colorOn : wireColor}" stroke-width="2"/>
          <!-- GND Symbol -->
          <line x1="115" y1="218" x2="145" y2="218" stroke="${isPathActive ? colorOn : wireColor}" stroke-width="2"/>
          <line x1="120" y1="223" x2="140" y2="223" stroke="${isPathActive ? colorOn : wireColor}" stroke-width="2"/>
          <line x1="125" y1="228" x2="135" y2="228" stroke="${isPathActive ? colorOn : wireColor}" stroke-width="2"/>
          <text x="130" y="240" fill="${labelColor}" font-size="9" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="middle">GND</text>
        </svg>
      `;
    }

    // NOR: Q1 and Q2 in parallel
    const q1Col = q1On ? colorOn : colorOff;
    const q2Col = q2On ? colorOn : colorOff;
    const isEitherOn = q1On || q2On;

    return `
      <svg viewBox="0 0 340 235" xmlns="http://www.w3.org/2000/svg">
        <!-- +5V Rail -->
        <text x="170" y="18" fill="${railColor}" font-size="11" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="middle">+5V</text>
        <line x1="170" y1="22" x2="170" y2="38" stroke="${wireColor}" stroke-width="2"/>
        <rect x="162" y="38" width="16" height="26" fill="${resFill}" stroke="${resStroke}" stroke-width="2"/>
        <text x="184" y="54" fill="${labelColor}" font-size="8" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace">Rc 1k</text>
        <line x1="170" y1="64" x2="170" y2="80" stroke="${wireColor}" stroke-width="2"/>
        
        <!-- OUT Node -->
        <circle cx="170" cy="80" r="3.5" fill="${outColor}"/>
        <line x1="170" y1="80" x2="235" y2="80" stroke="${outColor}" stroke-width="2"/>
        <circle cx="235" cy="80" r="3" fill="${outColor}"/>
        <text x="242" y="84" fill="${outColor}" font-size="10" font-weight="600" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace">OUT (${vout.toFixed(1)}V)</text>

        <!-- Vertical connection from OUT node to parallel split bar -->
        <line x1="170" y1="80" x2="170" y2="94" stroke="${isEitherOn ? colorOn : wireColor}" stroke-width="2"/>

        <!-- Split to Parallel Q1 and Q2 Collectors -->
        <line x1="136" y1="94" x2="170" y2="94" stroke="${q1On ? colorOn : wireColor}" stroke-width="2"/>
        <line x1="170" y1="94" x2="204" y2="94" stroke="${q2On ? colorOn : wireColor}" stroke-width="2"/>
        <circle cx="170" cy="94" r="2.5" fill="${isEitherOn ? colorOn : wireColor}"/>

        <!-- Drops to Collectors -->
        <line x1="136" y1="94" x2="136" y2="108" stroke="${q1On ? colorOn : wireColor}" stroke-width="2"/>
        <line x1="204" y1="94" x2="204" y2="108" stroke="${q2On ? colorOn : wireColor}" stroke-width="2"/>

        <!-- Q1 Left (Input A) -->
        <text x="44" y="130" fill="${a ? colorOn : labelColor}" font-size="9" font-weight="600" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="end">A (${a ? '5V' : '0V'})</text>
        <line x1="48" y1="126" x2="72" y2="126" stroke="${a ? colorOn : wireColor}" stroke-width="2"/>
        <rect x="72" y="119" width="22" height="14" fill="${resFill}" stroke="${a ? colorOn : resStroke}" stroke-width="2"/>
        <text x="83" y="114" fill="${labelColor}" font-size="7" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="middle">R1 10k</text>
        <line x1="94" y1="126" x2="120" y2="126" stroke="${a ? colorOn : wireColor}" stroke-width="2"/>
        <line x1="120" y1="114" x2="120" y2="138" stroke="${q1Col}" stroke-width="2.5"/>
        <line x1="120" y1="120" x2="136" y2="108" stroke="${q1Col}" stroke-width="2"/>
        <line x1="120" y1="132" x2="136" y2="144" stroke="${q1Col}" stroke-width="2"/>
        <polygon points="132,137 136,144 128,143" fill="${q1Col}"/>
        <text x="110" y="152" fill="${q1Col}" font-size="9" font-weight="600" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="middle">Q1</text>

        <!-- Q2 Right (Input B) -->
        <text x="296" y="130" fill="${b ? colorOn : labelColor}" font-size="9" font-weight="600" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="start">B (${b ? '5V' : '0V'})</text>
        <line x1="268" y1="126" x2="292" y2="126" stroke="${b ? colorOn : wireColor}" stroke-width="2"/>
        <rect x="246" y="119" width="22" height="14" fill="${resFill}" stroke="${b ? colorOn : resStroke}" stroke-width="2"/>
        <text x="257" y="114" fill="${labelColor}" font-size="7" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="middle">R2 10k</text>
        <line x1="220" y1="126" x2="246" y2="126" stroke="${b ? colorOn : wireColor}" stroke-width="2"/>
        <line x1="220" y1="114" x2="220" y2="138" stroke="${q2Col}" stroke-width="2.5"/>
        <line x1="220" y1="120" x2="204" y2="108" stroke="${q2Col}" stroke-width="2"/>
        <line x1="220" y1="132" x2="204" y2="144" stroke="${q2Col}" stroke-width="2"/>
        <polygon points="208,137 204,144 212,143" fill="${q2Col}"/>
        <text x="230" y="152" fill="${q2Col}" font-size="9" font-weight="600" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="middle">Q2</text>

        <!-- Join Parallel Emitters to GND -->
        <line x1="136" y1="144" x2="136" y2="175" stroke="${q1On ? colorOn : wireColor}" stroke-width="2"/>
        <line x1="204" y1="144" x2="204" y2="175" stroke="${q2On ? colorOn : wireColor}" stroke-width="2"/>
        <line x1="136" y1="175" x2="170" y2="175" stroke="${q1On ? colorOn : wireColor}" stroke-width="2"/>
        <line x1="170" y1="175" x2="204" y2="175" stroke="${q2On ? colorOn : wireColor}" stroke-width="2"/>
        <circle cx="170" cy="175" r="2.5" fill="${isEitherOn ? colorOn : wireColor}"/>
        <line x1="170" y1="175" x2="170" y2="196" stroke="${isEitherOn ? colorOn : wireColor}" stroke-width="2"/>

        <!-- GND Symbol -->
        <line x1="155" y1="196" x2="185" y2="196" stroke="${isEitherOn ? colorOn : wireColor}" stroke-width="2"/>
        <line x1="160" y1="201" x2="180" y2="201" stroke="${isEitherOn ? colorOn : wireColor}" stroke-width="2"/>
        <line x1="165" y1="206" x2="175" y2="206" stroke="${isEitherOn ? colorOn : wireColor}" stroke-width="2"/>
        <text x="170" y="218" fill="${labelColor}" font-size="9" font-family="'Ubuntu Mono', 'IBM Plex Mono', monospace" text-anchor="middle">GND</text>
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

  renderGateGlobal = renderGate;
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

  const tc = getThemeColors();

  // Chart 1: Small-Signal AC Input Waveform in mV (CH1: Sky Blue)
  ceInputChartInstance = new Chart(inputCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Vin (Input AC [mV])',
          data: [],
          borderColor: tc.ch1Color,
          backgroundColor: tc.ch1Fill,
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
      resizeDelay: 50,
      scales: {
        x: {
          display: true,
          grid: { color: tc.gridColor },
          ticks: { color: tc.tickColor, maxTicksLimit: 6 }
        },
        y: {
          title: { display: true, text: 'Vin (mV)', color: tc.ch1Color },
          grid: { color: tc.gridColor },
          ticks: { color: tc.tickColor }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  // Chart 2: Output Waveform in V with Dashed Grey Reference Lines (CH2: Royal Blue)
  ceChartInstance = new Chart(outputCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Vout (Collector Waveform [V])',
          data: [],
          borderColor: tc.ch2Color,
          backgroundColor: tc.ch2Fill,
          borderWidth: 2.2,
          pointRadius: 0,
          tension: 0.3,
          fill: true
        },
        {
          label: 'Cutoff Ceiling (VCC)',
          data: [],
          borderColor: tc.refColor,
          borderWidth: 1.5,
          borderDash: [5, 4],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Saturation Floor (VCE,sat)',
          data: [],
          borderColor: tc.refColor,
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
      resizeDelay: 50,
      scales: {
        x: {
          title: { display: true, text: 'Time (ms)', color: tc.axisTitleColor },
          grid: { color: tc.gridColor },
          ticks: { color: tc.tickColor, maxTicksLimit: 6 }
        },
        y: {
          min: 0,
          max: 13.0,
          title: { display: true, text: 'Vout (V)', color: tc.ch2Color },
          grid: { color: tc.gridColor },
          ticks: { color: tc.tickColor }
        }
      },
      plugins: {
        legend: { labels: { color: tc.legendColor, boxWidth: 12 } }
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
 * Module 3.1: A Neuron as a Logic Gate (step-activation perceptron)
 * ============================================================ */
function initNeuronModule() {
  const tabs = document.querySelectorAll('#neuron-gate-tabs .tab-btn');
  const btnA = document.getElementById('neuron-a');
  const btnB = document.getElementById('neuron-b');
  const outEl = document.getElementById('neuron-out');
  const outLabel = document.getElementById('neuron-out-label');
  const weightsEl = document.getElementById('neuron-weights');
  const sumEl = document.getElementById('neuron-sum');
  const truthEl = document.getElementById('neuron-truth-table');
  if (!btnA || !btnB || !outEl) return;

  // Weights and bias that make one step-activation neuron behave like each gate
  const PRESETS = {
    AND:  { w: [1, 1],   b: -1.5 },
    OR:   { w: [1, 1],   b: -0.5 },
    NAND: { w: [-1, -1], b: 1.5 }
  };

  const fmt = n => (n < 0 ? `−${Math.abs(n)}` : `${n}`);          // proper minus sign
  const signed = n => (n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`);

  const render = () => {
    const { a, b, gate } = state.perceptron;
    const p = PRESETS[gate];
    const res = neuron([a, b], p.w, p.b, 'step');

    btnA.textContent = `${a}`;
    btnA.className = `bit-toggle ${a ? 'on' : 'off'}`;
    btnB.textContent = `${b}`;
    btnB.className = `bit-toggle ${b ? 'on' : 'off'}`;

    outEl.textContent = res.y;
    if (outLabel) outLabel.textContent = res.y ? 'fires' : 'stays quiet';

    if (weightsEl) {
      weightsEl.innerHTML = `
        <span class="neuron-chip">Weight A <strong>${fmt(p.w[0])}</strong></span>
        <span class="neuron-chip">Weight B <strong>${fmt(p.w[1])}</strong></span>
        <span class="neuron-chip">Bias <strong>${p.b > 0 ? '+' : ''}${fmt(p.b)}</strong></span>`;
    }

    if (sumEl) {
      sumEl.innerHTML = `Sum = (${fmt(p.w[0])} &times; ${a}) + (${fmt(p.w[1])} &times; ${b}) ${signed(p.b)}
        = <strong>${fmt(Number(res.z.toFixed(2)))}</strong>
        <span class="neuron-verdict">${res.z >= 0 ? '&ge; 0 → output 1' : '&lt; 0 → output 0'}</span>`;
    }

    if (truthEl) {
      const rows = [[0, 0], [0, 1], [1, 0], [1, 1]].map(([ra, rb]) => {
        const r = neuron([ra, rb], p.w, p.b, 'step');
        return `<tr class="${ra === a && rb === b ? 'active-row' : ''}">
            <td>${ra}</td><td>${rb}</td><td>${fmt(Number(r.z.toFixed(2)))}</td><td><strong>${r.y}</strong></td>
          </tr>`;
      }).join('');
      truthEl.innerHTML = `
        <table class="truth-table">
          <thead><tr><th>A</th><th>B</th><th>Sum</th><th>Output</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    }
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.perceptron.gate = tab.getAttribute('data-ngate');
      render();
    });
  });
  btnA.addEventListener('click', () => { state.perceptron.a ^= 1; render(); });
  btnB.addEventListener('click', () => { state.perceptron.b ^= 1; render(); });
  render();
}

/* ============================================================
 * Module 3.2: Leaky Integrate-and-Fire (LIF) Dynamics
 * ============================================================ */
function initLIFModule() {
  const rateSlider = document.getElementById('lif-rate');
  const rateDisp = document.getElementById('lif-rate-disp');
  const canvas = document.getElementById('lifChart');
  if (!canvas || !rateSlider) return;

  const ctx = canvas.getContext('2d');

  const tc = getThemeColors();

  lifChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Capacitor voltage V(t) [V]',
          data: [],
          borderColor: tc.ch2Color,
          backgroundColor: tc.ch2Fill,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.05,
          fill: true
        },
        {
          label: 'Threshold (1 V)',
          data: [],
          borderColor: tc.refColor,
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Spikes',
          data: [],
          backgroundColor: tc.ch1Color,
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
      resizeDelay: 50,
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: 500, // Clean time axis in milliseconds
          title: { display: true, text: 'Time (ms)', color: tc.axisTitleColor },
          grid: { color: tc.gridColor },
          ticks: {
            color: tc.tickColor,
            stepSize: 100,
            callback: (v) => v + ' ms'
          }
        },
        y: {
          min: 0,
          max: 2.2,
          title: { display: true, text: 'Voltage (V)', color: tc.ch2Color },
          grid: { color: tc.gridColor },
          ticks: { color: tc.tickColor, stepSize: 0.5 }
        }
      },
      plugins: {
        legend: { labels: { color: tc.legendColor, boxWidth: 12 } }
      }
    }
  });

  const updateLIF = () => {
    const rate = parseFloat(rateSlider.value);
    const vth = state.lif.vth; // fixed 1 V threshold
    state.lif.rate = rate;
    if (rateDisp) rateDisp.textContent = `${rate} Hz`;

    const res = lif(1e-6, 100e3, vth, rate, { mode: 'pulses' });

    const spikesEl = document.getElementById('lif-spikes');
    const rateEl = document.getElementById('lif-firing-rate');
    if (spikesEl) spikesEl.textContent = res.spikes.length;
    if (rateEl) rateEl.textContent = `${res.outputRate.toFixed(0)}`;

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
 * Auto-initialization
 * ============================================================ */
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
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
  initLightboxModal,
  initScrollEffects
};
