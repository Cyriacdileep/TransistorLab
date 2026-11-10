# TransistorLab: From Silicon to Intelligence

An interactive, web-based educational simulator demonstrating how fundamental solid-state transistor switching connects to digital logic gates, binary arithmetic, analog signal amplification, and biophysical/artificial neural computation.

---

## 🏛️ Architectural Foundation

Modern computing architectures originate from the precise manipulation of solid-state semiconductor physics. By leveraging the fundamental threshold characteristics of a single transistor, we synthesize elementary logic gates that aggregate to execute binary arithmetic. Remarkably, this exact physical substrate—when appropriately biased—operates interchangeably as a linear signal amplifier and a biological neuron emulator:

1. **Digital Logic & Arithmetic:**
   * **BJT Switching Dynamics:** Piecewise modeling across Cutoff ($V_{in} \le 0.7\text{ V}$), Active ($I_C = \beta I_B$), and Saturation ($V_{CE} \approx 0.2\text{ V}$) regimes, verified against LTspice DC sweep simulations (`bjt-vtc-simulation.jpeg`).
   * **Boolean Computation:** Inverting BJT (NOT), series transistors (NAND), and parallel transistors (NOR).
   * **Cascaded 4-Bit Binary Adder:** Chained 9-NAND full-adder cells (36 NAND gates, 72 transistors total) demonstrating temporal carry-ripple propagation.
2. **Module 2: Analog Common-Emitter Amplifier:**
   * **Title:** *Transistor Small-Signal Amplification & Non-Linear Rail Clipping*
   * **Small-Signal Voltage Gain ($A_v$):** Governed by the transconductance ($g_m = \frac{I_C}{V_T}$) of the BJT and the effective load impedance ($R_C \parallel R_L$), determining the dynamic scaling factor applied to input signal oscillations.
   * **Saturation & Cutoff Limits:** Physical supply boundaries ($V_{CC}$ and GND) constrain the maximum output excursion. Driving the base beyond linear operating limits forces the collector voltage into saturation or cutoff, resulting in non-linear waveform distortion known as rail clipping.
   * **Bench Verification:** LTspice schematic (`ce-amplifier-schematic.jpeg`), input sine wave (`ce-input-waveform.jpeg`), and $180^\circ$ phase-inverted amplified output waveform (`ce-output-waveform.jpeg`) demonstrating $A_v \approx -150$.
3. **Module 3: Neural & Biophysical Models:**
   * **Title:** *Static Artificial Abstractions vs. Biophysical LIF Dynamics*
   * **Artificial Neuron (Static Rate Model):** Evaluates an affine transformation ($z = \mathbf{w}^T \mathbf{x} + b$) projected through a deterministic activation function.
     * *Step Function:* Implements a discrete Heaviside threshold, modeling ideal binary firing behavior.
     * *Sigmoid Function:* Maps inputs onto a continuous open interval $(0, 1)$, modeling normalized activation rates.
   * **Leaky Integrate-and-Fire (LIF Model):** Models the sub-threshold membrane dynamics of a biological neuron using an equivalent RC circuit. Integrated via Euler steps ($v(t+\Delta t) = v(t) + \frac{\Delta t}{C}(I(t) - \frac{v(t)}{R})$), the membrane potential ($v$) continuously dissipates charge through passive leakage while integrating input currents. When potential reaches the threshold voltage ($v_{th}$), the system fires a discrete action potential and resets to baseline.

---

## 🚀 Modules Overview

| Module | Core Physics & Math | Visualization & Benchmarks |
| :--- | :--- | :--- |
| **Module 1: Digital** | BJT piecewise inverter, NOT/NAND/NOR resistor-transistor logic, 4-bit ripple adder | $V_{in}$ slider, dynamic transfer curve, physical transistor states, live carry-ripple pipeline, LTspice DC Sweep (`bjt-vtc-simulation.jpeg`) |
| **Module 2: Analog Common-Emitter Amplifier** | Small-signal transconductance $g_m$, effective load $R_C \parallel R_L$, gain $A_v = -g_m (R_C \parallel R_L)$, supply rail clipping | Dual-trace oscilloscope comparing $v_{in}(t)$ and inverted $v_{out}(t)$, clipping state indicators, LTspice schematic & transient captures (`ce-amplifier-schematic.jpeg`, `ce-output-waveform.jpeg`) |
| **Module 3: Neural & Biophysical Models** | Affine transform $z = \mathbf{w}^T \mathbf{x} + b$, Step & Sigmoid functions; LIF leaky RC membrane Euler integration | Perceptron activation response, continuous vs. discrete thresholding, temporal membrane potential trace with spike markers |

---

## 📂 Project Structure

```
ANALOG/
├── index.html           # Main application entry point & semantic markup
├── css/
│   └── style.css        # Responsive styling, design tokens, gallery & lightbox
├── js/
│   ├── index.js         # JavaScript package barrel entry point
│   ├── app.js           # UI controller, lightbox modal & Chart.js logic
│   └── models.js        # Semiconductor, gate, amplifier, perceptron & LIF models
├── assets/
│   ├── favicon.ico                   # Site favicon
│   ├── favicon.png                   # Application branding logo
│   ├── 2n3904-transistor.jpg         # Discrete TO-92 NPN BJT hardware component
│   ├── bjt-inverter-schematic.jpeg   # LTspice BJT inverter schematic
│   ├── bjt-vtc-simulation.jpeg       # LTspice BJT VTC transfer curve
│   ├── ce-amplifier-schematic.jpeg   # LTspice CE amplifier schematic
│   ├── ce-input-waveform.jpeg        # LTspice input sine waveform
│   └── ce-output-waveform.jpeg       # LTspice amplified inverted waveform
├── docs/
│   └── TransistorLab_Final_Project_Report.pdf # Comprehensive project report
├── package.json         # Module definition & modern subpath exports mapping
├── .gitignore           # Git ignore configuration
└── README.md            # Architecture, models & project documentation
```

---

## 💻 Tech Stack

* **Frontend:** Semantic HTML5, CSS Grid & Modern Dark Theme, Vanilla JavaScript (ES6+ Native Modules).
* **Plotting & Waveforms:** Chart.js (v4.x).
* **Execution:** Pure client-side in the browser (zero backend required).
* **Deployment:** GitHub Pages / Netlify.

---

## 👥 Project Team & Responsibilities

* **Melvin Dileep (125EI0015)** — Role: Team Lead / Modeling & Validation
* **Arnab Naskar (125EI0009)** — Role: Web Developer
* **Thushan Mohanraj (125EI0007)** — Role: LTspice & Hardware Bench
* **CH. Lokhesh (125EI0047)** — Role: Documentation & Presentation
* **Abhishek Singh (125EI0013)** — Testing, Math & Report
