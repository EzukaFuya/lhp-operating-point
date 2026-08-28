---
title: Loop heat pipe operating point
toc: false
---

```js
import {solve, solveOperatingPoint} from "./components/model/solve.js";
import {DEF, REF_TCC, RNG, CV, clampInput} from "./components/model/constants.js";
import {verdict, warning} from "./components/verdict.js";
import {readHash, writeHash} from "./components/url.js";
import {exportCsv, exportPng, copyLink} from "./components/exports.js";
import {createSelection, attachSelection} from "./components/selection.js";
import {resultCards, statePointTable, selectionBar, legend} from "./components/ui.js";
import {PROCESSES} from "./components/model/processes.js";
import {asCelsius, REFERENCE_FLUID} from "./components/model/scale.js";
import {schematic} from "./components/charts/schematic.js";
import {ptDetail} from "./components/charts/ptDetail.js";
import {ptGlobal} from "./components/charts/ptGlobal.js";
import {tsChart} from "./components/charts/tsChart.js";
import {profChart} from "./components/charts/profChart.js";
import {condBar} from "./components/charts/condBar.js";
import {wickTradeoff} from "./components/charts/wickTradeoff.js";
```

<div class="masthead">
  <div class="eyebrow">Loop heat pipe · interactive study model</div>
  <h1>How the compensation chamber sets the loop operating point</h1>
  <p class="lede">
    The CC is the only saturated volume in the loop, so its temperature fixes the pressure level
    everything else hangs from. Move the inputs and watch where the cycle sits on the saturation
    curve, how much capillary head is left, and whether the returning liquid can carry the
    parasitic heat leak away. The fourth input is the wick itself: shrinking the pores buys
    capillary head as 1/r<sub>p</sub> but costs permeability as 1/r<sub>p</sub>², so there is an
    optimum rather than a monotone improvement.
  </p>
  <p class="lede">
    The page runs in two modes. <strong>Prescribed CC</strong> — the default — treats
    <i>T</i><sub>r,cc</sub> as an input you set, and reports the CC energy-balance residual
    <i>R</i><sub>cc</sub> left over: the heat a chamber held at that temperature would need
    removing by other means. <strong>Solve passive point</strong> instead searches for the
    <i>T</i><sub>r,cc</sub> where <i>R</i><sub>cc</sub> = 0, which is where a loop with no CC
    heater or cooler actually settles.
  </p>
  <div class="caveat" role="note">
    <span class="caveat-tag">Qualitative</span>
    <span class="caveat-tag">Dimensionless</span>
    <span class="caveat-tag">Not validated against experiment</span>
    <span class="caveat-text">
      A teaching model. The closure is a set of shape functions with the right trends, not a fit to
      any real fluid, and no result here has been checked against test data or a high-fidelity
      code. Trends are meaningful; absolute numbers are not. Do not use it for design.
    </span>
  </div>
</div>

```js
// The operating point, restored from the URL hash so a calculation can be
// shared as a link. Everything below is recomputed from this one value.
const restored = readHash();

const start = {
  tcc: restored.tcc ?? DEF.tcc,
  q: restored.q ?? DEF.q,
  tsink: restored.tsink ?? DEF.tsink,
  rp: restored.rp ?? DEF.rp
};

const inputs = Mutable(start);
const ghost = Mutable(restored.ghost ?? true);
// Set when a typed value had to be pulled back into range.
const clamped = Mutable(null);

function setInput(k, raw) {
  const v = parseFloat(raw);
  if (!isFinite(v)) return;
  const c = clampInput(k, v);
  clamped.value = Math.abs(c - v) > 1e-9
    ? `${k} = ${v} is outside [${RNG[k][0]}, ${RNG[k][1]}] and was clamped to ${c.toFixed(3)}.`
    : null;
  inputs.value = {...inputs.value, [k]: c};
}

function resetInputs() {
  clamped.value = null;
  solveNote.value = null;
  inputs.value = {...DEF};
}

// Set when the passive search says something the user needs to know.
const solveNote = Mutable(null);

// Search for the CC temperature at which the chamber balances on its own, and
// move the slider there. Q* and the sink temperature are held fixed — they are
// the boundary conditions the loop responds to.
function solvePassive() {
  const {q, tsink, rp} = inputs.value;
  const op = solveOperatingPoint(q, tsink, rp);

  // No root at all: nothing to move to.
  if (op.tcc === null) {
    solveNote.value = {kind: "none", text: op.note};
    return;
  }

  clamped.value = null;
  inputs.value = {...inputs.value, tcc: op.tcc};

  // A root of the energy balance is only an operating point if the loop can
  // actually run there. Moving the slider either way is useful — the figures
  // then show why it fails — but it must not be called a passive point.
  solveNote.value = op.converged
    ? {
        kind: "ok",
        text: `Passive operating point: T_r,cc = ${op.tcc.toFixed(4)} — |R_cc| = ${op.residual.toExponential(1)} after ${op.iterations} bisection steps.`
      }
    : {kind: "warn", text: op.note};
}

function setGhost(on) {
  ghost.value = on;
}
```

```js
// The controls are built once and then kept in step imperatively. Rebuilding
// them whenever the value changes would tear the slider out from under a
// drag, so the element stays put and only its value is pushed back in.
const f3 = (v) => v.toFixed(3);
const f2 = (v) => v.toFixed(2);

const fields = {};

function control({key, id, label, ariaLabel, step, fmt, definition, readout}) {
  const [min, max] = RNG[key];
  const value = start[key];

  const number = html`<input type="number" id="${id}" min="${min}" max="${max}"
    step="${step}" value="${value}" aria-label="${ariaLabel}">`;
  const slider = html`<input type="range" min="${min}" max="${max}"
    step="${step}" value="${value}" aria-label="${ariaLabel} slider">`;

  number.oninput = (e) => setInput(key, e.target.value);
  slider.oninput = (e) => setInput(key, e.target.value);

  // A secondary reading in real units, for the quantities where the model is
  // faithful enough to print one. It never replaces the dimensionless value.
  const readoutEl = readout ? html`<span class="control-readout">${readout(value)}</span>` : null;
  fields[key] = {number, slider, readoutEl, readout};

  return html`<div class="control">
    <div class="control-head"><label for="${id}">${label}</label>${number}</div>
    ${slider}
    <div class="control-scale">
      <span>${fmt(min)}</span><span class="def">${definition}</span><span>${fmt(max)}</span>
    </div>
    ${readoutEl ?? ""}
  </div>`;
}

const controlsEl = html`<div class="controls">
  ${control({
    key: "tcc", id: "in-tcc", step: 0.005, fmt: f3,
    label: html`CC temperature &nbsp;<i>T</i><sub>r,cc</sub>`,
    ariaLabel: "CC temperature, reduced",
    definition: html`T / T<sub>c</sub> — dimensionless`,
    readout: asCelsius
  })}
  ${control({
    key: "q", id: "in-q", step: 0.05, fmt: f2,
    label: html`Heat load &nbsp;<i>Q</i>*`,
    ariaLabel: "Heat load, reduced",
    definition: html`Q / (ṁ<sub>ref</sub> h<sub>fg,ref</sub>) — dimensionless`
  })}
  ${control({
    key: "tsink", id: "in-ts", step: 0.005, fmt: f3,
    label: html`Sink temperature &nbsp;<i>T</i><sub>r,sink</sub>`,
    ariaLabel: "Sink temperature, reduced",
    definition: html`must stay below T<sub>r,cc</sub>`,
    readout: asCelsius
  })}
  ${control({
    key: "rp", id: "in-rp", step: 0.05, fmt: f2,
    label: html`Pore radius &nbsp;<i>r</i><sub>p</sub>*`,
    ariaLabel: "Effective pore radius, reduced",
    definition: html`head ∝ 1/r<sub>p</sub>, wick loss ∝ 1/r<sub>p</sub>²`
  })}
</div>`;

display(controlsEl);
```

```js
// Overlay switch, reset, and the share / export group — also built once.
const switchEl = html`<div class="switch" role="switch" tabindex="0">
  <span class="switch-track"><span class="switch-knob"></span></span>
  <span>Reference overlay &nbsp;T<sub>r,cc</sub> = ${REF_TCC.toFixed(3)}</span>
</div>`;
switchEl.onclick = () => setGhost(switchEl.getAttribute("aria-checked") !== "true");
switchEl.onkeydown = (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); switchEl.onclick(); }
};

const solveBtn = html`<button type="button" class="btn-solve">Solve passive point</button>`;
solveBtn.onclick = solvePassive;

const resetBtn = html`<button type="button" class="btn-reset">Reset to default</button>`;
resetBtn.onclick = resetInputs;

const linkBtn = html`<button type="button" class="btn-export">Copy link</button>`;
const csvBtn = html`<button type="button" class="btn-export">CSV</button>`;
const pngBtn = html`<button type="button" class="btn-export">Chart PNG</button>`;
pngBtn.onclick = () => exportPng();

display(html`<div class="toolbar">
  <div class="live"><span class="live-dot"></span>live — recomputed on every input</div>
  ${solveBtn}
  ${switchEl}
  ${resetBtn}
  <div class="exports">
    <span class="exports-label">Share / export</span>${linkBtn}${csvBtn}${pngBtn}
  </div>
</div>`);
```

```js
// The solution, the reference overlay, and the judgement drawn from them.
// Everything downstream is a pure function of these.
const r = solve(inputs.tcc, inputs.q, inputs.tsink, inputs.rp);
const g = ghost ? solve(REF_TCC, inputs.q, inputs.tsink, inputs.rp) : null;
const v = verdict(inputs, r);
const warn = warning(inputs, r, v, clamped);
```

```js
// Push state back into the controls that own it, and into the URL.
for (const [key, {number, slider, readoutEl, readout}] of Object.entries(fields)) {
  const value = String(inputs[key]);
  if (number.value !== value) number.value = value;
  if (slider.value !== value) slider.value = value;
  if (readoutEl) readoutEl.textContent = readout(inputs[key]);
}
switchEl.setAttribute("aria-checked", String(ghost));
writeHash({...inputs, ghost});

// These two act on the current point, so they are rebound as it changes.
csvBtn.onclick = () => exportCsv(inputs, r);
linkBtn.onclick = () => {
  writeHash({...inputs, ghost});
  copyLink();
  linkBtn.textContent = "✓ Copied";
  setTimeout(() => { linkBtn.textContent = "Copy link"; }, 1800);
};
```

```js
display(html`<div>
  ${warn ? html`<div class="warning" role="status">${warn}</div>` : ""}
  ${solveNote
    ? html`<div class="note note-${solveNote.kind}" role="status">${solveNote.text}</div>`
    : ""}
</div>`);
```

```js
display(resultCards(r, v));
```

```js
// The shared selection, created once. One delegated listener high up the
// tree covers every figure and the table, so redrawing a figure under the
// pointer cannot lose the hover it is showing.
const selection = createSelection();
const detach = attachSelection(document.body, selection);
invalidation.then(detach);

const sel = Generators.observe((notify) => {
  notify(selection.get());
  return selection.subscribe(notify);
});
```

```js
// The point to draw highlighted: a live hover preview, else the pin.
const active = sel.hi ?? sel.sel;

// The process blocks carry TeX source; Framework's `tex` renders it. Passing
// the renderer in keeps the model and UI modules free of any dependency on it.
const renderTex = (src) => tex`${src}`;
```

<div class="section">
  <h2>The loop, and where the nine states sit in it</h2>
  <p>
    One evaporator with a wick, a compensation chamber holding the only free liquid surface, a
    vapour line, a condenser that splits itself into a two-phase and a subcooled length, and a
    liquid line back to the CC. The same hover and pin selection works here.
  </p>
  <div class="scroll-x"><div class="fig-wide" id="slot-schematic"></div></div>
</div>

<div class="section">
  <div class="section-head">
    <div>
      <h2>The cycle on the P–T plane</h2>
      <p>
        Axes are linear and magnified about the operating point, so the pressure drops that the
        log-scale plane hides become visible. Hover a state point to preview it, or click, tap or
        tab-and-press-Enter to pin it — the selection follows through every figure and the table.
      </p>
    </div>
    <div id="slot-legend"></div>
  </div>
  <div class="scroll-x"><div class="fig-wide" id="slot-ptdetail"></div></div>
  <div id="slot-selbar"></div>
</div>

<div class="grid-2">
  <div>
    <h2>State points</h2>
    <p>Hover a row to preview it; click or press Enter to pin that point across every figure.</p>
    <div class="scroll-x"><div id="slot-table"></div></div>
  </div>
  <div>
    <h2>Pressure around the loop</h2>
    <p>The step at the meniscus is the capillary head; everything else is a loss that head has to pay for.</p>
    <div class="scroll-x"><div class="fig-prof" id="slot-prof"></div></div>
  </div>
  <div>
    <h2>The cycle on the T–s plane</h2>
    <p>Raising T<sub>r,cc</sub> lifts the cycle and narrows it: the latent heat falls, so the 9→1 crossing of the dome gets shorter.</p>
    <p>
      The enclosed area is not output work — an LHP produces none. But it is not nothing either:
      since <i>h</i> is a state function, ∮d<i>h</i> = 0 gives ∮<i>T</i>d<i>s</i> = −∮<i>v</i>d<i>P</i>,
      so the area is the driving work the loop generates and immediately dissipates in its own
      flow losses. The pressure budget above and this area are the same statement, read through
      pressure and through energy. (The drawn polygon is schematic, so it is not a faithful
      ∮<i>T</i>d<i>s</i>.)
    </p>
    <div class="fig-narrow" id="slot-ts"></div>
  </div>
  <div>
    <h2>Where the cycle sits, and where the interface is</h2>
    <p>The whole cycle is a small box sliding along the saturation line. The condenser splits itself into a two-phase and a subcooled length to absorb the load.</p>
    <div class="fig-narrow" id="slot-global"></div>
    <div class="fig-narrow" id="slot-condbar" style="margin-top: 16px;"></div>
  </div>
  <div>
    <h2>The wick trade-off</h2>
    <p>
      Shrinking the pores buys capillary head as 1/r<sub>p</sub> but costs permeability as
      1/r<sub>p</sub>², so the wick's own loss grows faster than the head it is paying for. There is
      an optimum, not a monotone improvement. Load and sink temperature are held where they are, so
      this is the trade-off at the current operating point.
    </p>
    <div class="fig-narrow" id="slot-wick"></div>
  </div>
</div>

```js
// The slots above are static page elements that outlive every redraw, which
// is what keeps the delegated selection listener valid.
//
// Redrawing replaces the marks wholesale, so a mark that had keyboard focus
// would lose it. Focus is carried across to the mark for the same state
// point, which is what lets a point be tabbed to and held.
function fill(id, node) {
  const slot = document.getElementById(id);
  if (!slot) return;

  const focused = document.activeElement;
  const keep = focused && slot.contains(focused) ? focused.getAttribute("data-pt") : null;

  slot.replaceChildren(node);

  if (keep !== null) {
    const next = slot.querySelector(`[data-pt="${CSS.escape(keep)}"][tabindex]`);
    if (next) next.focus({preventScroll: true});
  }
}

fill("slot-schematic", schematic(r, active));
fill("slot-ptdetail", ptDetail(r, active));
fill("slot-prof", profChart(r, active));
fill("slot-ts", tsChart(r, g, active));
fill("slot-global", ptGlobal(r, g));
fill("slot-condbar", condBar(r, active));
fill("slot-wick", wickTradeoff(r));
fill("slot-table", statePointTable(r, active, sel.sel));
fill("slot-selbar", selectionBar(r, active, sel.sel, sel.hi, () => selection.clearPin(), renderTex));
```

```js
fill("slot-legend", legend());
```

<details class="relations">
<summary>Physical scale — what real numbers look like</summary>

<p class="closure">
Everything the model computes is dimensionless. These are not model output: they are real
dimensional values for one real fluid, put here so the dimensionless numbers above have something
to be anchored against. <strong>Nothing in this table comes from the model, and no value here
should be read as a prediction of it.</strong> They are computed by
<code>scripts/physical-scale.mjs</code> from standard saturation data (NIST Webbook /
CoolProp-grade) so they are reproducible.
</p>

<h3 class="sublabel">Reading the model as ammonia</h3>

<p class="closure">
Temperature and pressure are reduced by the critical point, so one fluid's critical constants turn
them back into real units — nothing else has to be assumed. The page prints these beside the
dimensionless values, under the temperature sliders and in the selection bar.
</p>

<div class="constants">
  <div class="constant"><span>T<sub>c</sub></span><span>405.4 K</span></div>
  <div class="constant"><span>P<sub>c</sub></span><span>11.333 MPa</span></div>
  <div class="constant"><span>T<sub>r</sub> = 0.580 → </span><span>−38.0 °C</span></div>
  <div class="constant"><span>T<sub>r</sub> = 0.720 → </span><span>18.7 °C</span></div>
  <div class="constant"><span>T<sub>r</sub> = 0.920 → </span><span>99.8 °C</span></div>
</div>

<p class="closure">
The saturation correlation ln P<sub>r</sub> = A(1 − 1/T<sub>r</sub>) with a single constant
A = 7 runs about 4–11 % below real ammonia across that range — good enough to print, and stated
rather than hidden. A test checks the model still sits inside that band, so changing A fails the
build rather than quietly making this claim false.
</p>

<p class="closure">
<strong>Pressure drops are deliberately not converted.</strong> Scaled by P<sub>c</sub> the
capillary maximum would read about 620 kPa, against 4–42 kPa for a real ammonia wick at 1–10 µm
pores. The loss coefficients were chosen to put the dry-out boundary somewhere useful in the
dimensionless range, not to match any loop geometry — so reading them as kPa would be inventing a
design. Making them real would mean committing to roughly eight loop dimensions and recalibrating
against them, which this model has not done.
</p>

<h3 class="sublabel">Ammonia (R-717) at 300 K</h3>

<div class="constants">
  <div class="constant"><span>P<sub>sat</sub></span><span>1.062 MPa</span></div>
  <div class="constant"><span>h<sub>fg</sub></span><span>1165 kJ/kg</span></div>
  <div class="constant"><span>σ</span><span>21.2 mN/m</span></div>
  <div class="constant"><span>dP<sub>sat</sub>/dT</span><span>28.2 kPa/K</span></div>
</div>

<h3 class="sublabel">What that buys you</h3>

<div class="constants">
  <div class="constant"><span>10 kPa condenser loss costs</span><span>0.36 K of T<sub>sat</sub></span></div>
  <div class="constant"><span>ΔP<sub>cap,max</sub>, r<sub>p</sub> = 1 µm</span><span>42.4 kPa</span></div>
  <div class="constant"><span>ΔP<sub>cap,max</sub>, r<sub>p</sub> = 5 µm</span><span>8.5 kPa</span></div>
  <div class="constant"><span>ΔP<sub>cap,max</sub>, r<sub>p</sub> = 10 µm</span><span>4.2 kPa</span></div>
  <div class="constant"><span>liquid (dT/dP)<sub>h</sub></span><span>−0.098 K/MPa</span></div>
  <div class="constant"><span>…over a 20 kPa liquid line</span><span>−0.002 K</span></div>
</div>

<p class="closure">
The last two are the reason the liquid line is modelled with an ambient-gain term and no
Joule–Thomson term at all: the thermodynamic effect is four orders of magnitude below the
parasitic one at these pressures.
</p>

<p class="closure">
<strong>References.</strong> Fluid properties are standard saturation data as above.
LHP-specific design values — wick pore radii and permeabilities, loop pressure budgets,
measured operating curves — are <em>not</em> cited here, because this page has none to cite:
add them from your own source material rather than trusting an uncited number.
</p>

</details>

<details class="relations">
<summary>Governing relations and assumptions</summary>
<div id="slot-eqs"></div>

<h3 class="sublabel">What each quantity is scaled against</h3>

<p class="closure">
Temperature and pressure are genuinely reduced by their critical-point values. The interfacial and
transport properties are <strong>not</strong> — dividing the latent heat or the surface tension by
its critical value is meaningless, since both vanish there. They are normalised at a reference
state instead, and every starred quantity equals one at that state.
</p>

<div class="constants">
  <div class="constant"><span>T<sub>r</sub></span><span>T / T<sub>c</sub></span></div>
  <div class="constant"><span>P<sub>r</sub></span><span>P / P<sub>c</sub></span></div>
  <div class="constant"><span>reference state</span><span>T<sub>r,ref</sub> = 0.700</span></div>
  <div class="constant"><span>h<sub>fg</sub>*</span><span>h<sub>fg</sub> / h<sub>fg</sub>(T<sub>r,ref</sub>)</span></div>
  <div class="constant"><span>σ*</span><span>σ / σ(T<sub>r,ref</sub>)</span></div>
  <div class="constant"><span>ρ<sub>l</sub>*, ρ<sub>v</sub>*</span><span>ρ / ρ(T<sub>r,ref</sub>)</span></div>
  <div class="constant"><span>μ<sub>l</sub>*</span><span>μ<sub>l</sub> / μ<sub>l</sub>(T<sub>r,ref</sub>)</span></div>
  <div class="constant"><span>Q*, R<sub>cc</sub></span><span>Q / (ṁ<sub>ref</sub> h<sub>fg,ref</sub>)</span></div>
</div>

<h3 class="sublabel">Model constants</h3>
<div id="slot-constants"></div>

<p class="closure">
Closure: ρ<sub>v</sub>* ∝ P<sub>r</sub>/T<sub>r</sub> (ideal gas), μ<sub>l</sub>* = exp[2.5(1/T<sub>r</sub> − 1/0.7)],
all Δ<i>P</i> laminar (∝ ṁμ/ρ). Segments 2–3 and 3–4 carry vapour superheat; 5–6 and 6–7 carry liquid
subcooling. Gravity, non-condensable gas, transient charge redistribution and wick deprime hysteresis
are all omitted. The pressure and temperature scales of the main P–T figure are magnified about the
operating point, following the standard schematic construction. This is a study aid: trends are
meaningful, absolute numbers are not.
</p>
</details>

```js
// The closure, set as real mathematics rather than as marked-up text.
// These are the relations as implemented. Where a dimensionless form differs
// from the textbook physical one — the capillary limit especially — both are
// shown, because quoting the physical form alone would misrepresent what the
// code computes.
const EQUATIONS = [
  [tex`\ln P_r = A\!\left(1 - \frac{1}{T_r}\right), \quad A = 7`, null],
  [tex`P_{7,8} = P_{\mathrm{sat}}(T_8)`, "the CC fixes the loop pressure level"],
  [tex`P_1 - P_9 = \Delta P_{GV} + \Delta P_{VL} + \Delta P_{COND} + \Delta P_{LL} + \Delta P_{WICK}`, null],
  [tex`\Delta P_{r,\mathrm{cap}} \le \Delta P_{r,\mathrm{cap,max}} = C_a\,\frac{\sigma^{*}(T_8)}{r_p^{*}}, \quad C_a = 0.06`,
   "as implemented — the dimensionless form of 2σcosθ/r_p, with C_a lumping the reference pressure, reference surface tension and pore geometry into one calibration constant. It is chosen to place the dry-out boundary in a useful part of the range, not measured."],
  [tex`T_1 = T_{\mathrm{sat}}(P_1), \quad T_1 - T_8 \approx \Delta P_{\mathrm{ext}}\left(\frac{dT}{dP}\right)_{\mathrm{sat}}`, null],
  [tex`\dot m = \frac{Q}{h_{fg}}, \quad \Delta P_v \propto \frac{\dot m}{\rho_v(T_8)}`, null],
  [tex`f = \frac{L_{2\phi}}{L_c} = \min\!\left(1, \frac{Q}{UA_{2\phi}\,(T_8 - T_{\mathrm{sink}})}\right)`,
   "f < 1 is variable conductance; f = 1 is fixed conductance"],
  [tex`\Delta T_{\mathrm{sub,av}} = \left(T_5 - T_{\mathrm{sink}}\right)\left[1 - e^{-\mathrm{NTU}_{\mathrm{sub}}}\right], \quad T_6 = T_5 - \Delta T_{\mathrm{sub,av}}`,
   "the subcooler delivers what ε–NTU allows, and T₇ then picks up ambient heat along the liquid line"],
  [tex`R_{cc} = Q_{\mathrm{leak}} - \dot m\, c_{p,l}\,(T_8 - T_7)`,
   "CC energy-balance residual. Nothing is adjusted to force it to zero; R_cc = 0 defines the passive operating point"],
  [tex`h_{fg}^{*} = \theta^{0.38}, \;\; \sigma^{*} = \theta^{1.26}, \;\; \rho_l^{*} = \theta^{0.28}, \;\; \theta = \frac{1 - T_r}{0.3}`,
   "shape functions, normalised to 1 at T_r = 0.7 — see the reference quantities below"]
];

fill("slot-eqs", html`<div class="eqs">
  ${EQUATIONS.map(([eq, note], i) => html`<div class="eq">
    <span class="eq-no">(${i + 1})</span>
    <span class="eq-body">${eq}${note ? html` <span class="eq-note">— ${note}</span>` : ""}</span>
  </div>`)}
</div>`);

fill("slot-constants", html`<div class="constants">
  ${[
    [html`c<sub>p,l</sub>*`, CV.cpl.toFixed(2)],
    [html`c<sub>p,v</sub>*`, CV.cpv.toFixed(2)],
    ["evaporator G*", CV.Ge.toFixed(1)],
    ["wick leak G*", CV.Gw.toFixed(2)],
    [html`ambient T<sub>r</sub>`, CV.tamb.toFixed(3)],
    ["condenser UA*", CV.Kc.toFixed(1)],
    ["subcooler NTU coeff.", CV.Ks.toFixed(2)]
  ].map(([label, value]) => html`<div class="constant"><span>${label}</span><span>${value}</span></div>`)}
</div>`);
```
