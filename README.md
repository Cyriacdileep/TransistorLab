# TransistorLab: From Silicon to Intelligence

An interactive, web-based educational simulator demonstrating how fundamental solid-state transistor switching connects to digital logic gates, binary arithmetic, analog signal amplification, and biophysical/artificial neural computation.

---

## 🏛️ Architectural Foundation

Modern computing architectures originate from the precise manipulation of solid-state semiconductor physics. By leveraging the fundamental threshold characteristics of a single transistor, we synthesize elementary logic gates that aggregate to execute binary arithmetic. Remarkably, this exact physical substrate—when appropriately biased—operates interchangeably as a linear signal amplifier and a biological neuron emulator:

1. **Digital Logic & Arithmetic:**
   * **BJT Switching Dynamics:** Piecewise modeling across Cutoff ($V_{in} \le 0.7\text{ V}$), Active ($I_C = \beta I_B$), and Saturation ($V_{CE} \approx 0.2\text{ V}$) regions.
   * **Boolean Computation:** Inverting BJT (NOT), series transistors (NAND), and parallel transistors (NOR).
   * **Cascaded 4-Bit Binary Adder:** Chained 9-NAND full-adder cells (36 NAND gates, 72 transistors total) demonstrating temporal carry-ripple propagation.
2. **Analog Amplification:**
   * **Common-Emitter Amplifier:** Dual-trace sinusoidal amplification displaying phase inversion ($180^\circ$) and ceiling/floor supply rail clipping.
3. **Neural Computing:**
   * **Artificial Perceptron:** Configurable weights, bias, and step/sigmoid/ReLU activation functions.
   * **Leaky Integrate-and-Fire (LIF):** Euler numerical integration of $C \frac{dV}{dt} = I(t) - \frac{V}{R}$ with dynamic threshold resetting and spike train generation.

---

## 🚀 Modules Overview

| Module | Core Physics & Math | Visualization |
| :--- | :--- | :--- |
| **Module 1: Digital** | BJT piecewise inverter, NOT/NAND/NOR resistor-transistor logic, 4-bit ripple adder | $V_{in}$ slider, dynamic transfer curve, transistor ON/OFF states, live carry-ripple pipeline |
| **Module 2: Analog** | Common-emitter amplifier, voltage divider bias, $-R_C/R_E$ gain, supply clipping | Real-time dual-trace oscilloscope comparing $v_{in}(t)$ and inverted $v_{out}(t)$ |
| **Module 3: Neural** | Perceptron dot-product + activation; LIF RC membrane charging equation | Perceptron activation response, membrane potential trace with spike event markers |

---

## 📂 Project Structure

```
ANALOG/
├── index.html           # Main application entry point & semantic markup
├── css/
│   └── style.css        # Responsive styling, design tokens & breakpoint system
├── js/
│   ├── index.js         # JavaScript package barrel entry point
│   ├── app.js           # UI controller & interactive DOM/Chart logic
│   └── models.js        # Semiconductor, gate, amplifier & neural math models
├── assets/
│   ├── favicon.ico      # Site favicon
│   └── favicon.png      # Application branding logo
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

## 👥 Team & Responsibilities

* **Person A:** Team Lead / Modeling & Validation (Physics models in JavaScript, validation synthesis).
* **Person B:** Web Developer (Front-end interface, interactive visualizations, deployment).
* **Person C:** Helper A (LTspice simulation & hardware breadboard bench).
* **Person D:** Helper B (Section copy, educational narrative, slide deck).
* **Person E:** Helper C (Testing, mathematical verification, written report).
