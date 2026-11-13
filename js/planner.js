/* Macro Meal Builder: pick a day of recipes (with portion sizes) that lands on a calorie + protein target. */
(function () {
  const { DATA, $, $$, esc, header, footer, reveal, countryBy } = MMEUI;
  header("planner"); footer();

  const PRESETS = { cut: [1600, 140], maintain: [2200, 160], build: [2800, 200] };
  const SLOTS = {
    3: [["breakfast", "Breakfast"], ["main", "Lunch"], ["main", "Dinner"]],
    4: [["breakfast", "Breakfast"], ["main", "Lunch"], ["snack", "Snack"], ["main", "Dinner"]],
    5: [["breakfast", "Breakfast"], ["snack", "Morning snack"], ["main", "Lunch"], ["snack", "Afternoon snack"], ["main", "Dinner"]],
  };
  const MAXP = { breakfast: 2, main: 2, snack: 1.5 };
  const LS = "mme-planner-v1";

  const form = $("#plannerForm"), cal = $("#cal"), calR = $("#calR"), pro = $("#pro"), proR = $("#proR");
  let plan = []; // [{slot, label, r, portion, locked}]
  let lastTargets = null;

  /* ---------- inputs ---------- */
  const link = (a, b) => { a.addEventListener("input", () => b.value = a.value); b.addEventListener("input", () => a.value = b.value); };
  link(cal, calR); link(pro, proR);
  const saveTargets = () => MMEUI.store.set("targets", { cal: Number(cal.value) || 0, p: Number(pro.value) || 0 });
  const setTargets = (c, p) => { cal.value = calR.value = c; pro.value = proR.value = p; saveTargets(); };
  [cal, calR, pro, proR].forEach(el => el.addEventListener("input", saveTargets));
  /* ---------- body calculator (Mifflin-St Jeor), updates live and stays open ---------- */
  const BODY = "mme-body";
  const GOAL = { cut: { adj: -0.2, ppl: 1.0, label: "lean out (about 20% under maintenance)" },
                 maintain: { adj: 0, ppl: 0.8, label: "maintain" },
                 build: { adj: 0.1, ppl: 1.0, label: "build muscle (about 10% over maintenance)" } };
  let goal = "maintain", units = "us";
  const r5 = (n, s) => Math.round(n / s) * s;
  function bodyStats() {
    const w = Number($("#weight").value), age = Number($("#age").value);
    const kg = units === "us" ? w * 0.453592 : w;
    const cm = units === "us" ? (Number($("#hFt").value) * 12 + Number($("#hIn").value || 0)) * 2.54 : Number($("#hCm").value);
    if (!(kg >= 30 && kg <= 320 && cm >= 100 && cm <= 250 && age >= 14 && age <= 100)) return null;
    return { kg, cm, age, sex: form.sex.value, act: Number($("#activity").value) };
  }
  function calcBody(fromUser) {
    const b = bodyStats(), out = $("#bcOut");
    if (!b) {
      if (fromUser) out.textContent = "Fill in your weight, height and age and your calories and protein update automatically.";
      return false;
    }
    const bmr = 10 * b.kg + 6.25 * b.cm - 5 * b.age + (b.sex === "m" ? 5 : -161);
    const tdee = bmr * b.act, g = GOAL[goal];
    const kcal = Math.max(1200, Math.min(5000, r5(tdee * (1 + g.adj), 50)));
    // Protein from body weight; above a BMI of 30, use the weight at BMI 27 so it isn't inflated
    const bmi = b.kg / (b.cm / 100) ** 2, refKg = bmi > 30 ? 27 * (b.cm / 100) ** 2 : b.kg;
    const prot = Math.max(40, Math.min(300, r5(refKg * 2.20462 * g.ppl, 5)));
    setTargets(kcal, prot);
    out.innerHTML = `Maintenance ≈ <b>${r5(tdee, 10).toLocaleString()}</b> cal/day. To ${g.label}: <b>${kcal.toLocaleString()} cal</b> and <b>${prot}g protein</b>.`;
    try { localStorage.setItem(BODY, JSON.stringify({ units, goal, w: $("#weight").value, ft: $("#hFt").value, inch: $("#hIn").value, cm: $("#hCm").value, age: $("#age").value, sex: form.sex.value, act: $("#activity").value })); } catch (e) { /* no storage */ }
    return true;
  }
  function setUnits(u) {
    if (u === units) return;
    const w = Number($("#weight").value);
    if (u === "metric") {
      if (w) $("#weight").value = Math.round(w * 0.453592);
      const inch = Number($("#hFt").value) * 12 + Number($("#hIn").value || 0);
      if (inch) $("#hCm").value = Math.round(inch * 2.54);
    } else {
      if (w) $("#weight").value = Math.round(w / 0.453592);
      const cm = Number($("#hCm").value);
      if (cm) { const t = Math.round(cm / 2.54); $("#hFt").value = Math.floor(t / 12); $("#hIn").value = t % 12; }
    }
    units = u;
    $("#wUnit").textContent = u === "us" ? "lb" : "kg";
    $$(".us-only").forEach(x => x.hidden = u !== "us"); $$(".metric-only").forEach(x => x.hidden = u === "us");
    $$("[data-units]").forEach(x => x.setAttribute("aria-pressed", x.dataset.units === u));
    calcBody(true);
  }
  $$("[data-units]").forEach(b => b.onclick = () => setUnits(b.dataset.units));
  $$("#bodyCalc input, #bodyCalc select").forEach(i => i.addEventListener("input", () => calcBody(true)));
  $$("[data-preset]").forEach(b => b.onclick = () => {
    goal = b.dataset.preset;
    $$("[data-preset]").forEach(x => x.setAttribute("aria-pressed", x === b));
    if (!calcBody(false)) setTargets(...PRESETS[goal]);
  });
  function restoreBody() {
    let v; try { v = JSON.parse(localStorage.getItem(BODY) || "null"); } catch (e) { v = null; }
    if (!v) return false;
    if (v.units === "metric") setUnits("metric");
    $("#weight").value = v.w || ""; $("#hFt").value = v.ft || ""; $("#hIn").value = v.inch || ""; $("#hCm").value = v.cm || "";
    $("#age").value = v.age || ""; form.sex.value = v.sex || "m"; $("#activity").value = v.act || "1.55";
    goal = GOAL[v.goal] ? v.goal : "maintain";
    $$("[data-preset]").forEach(x => x.setAttribute("aria-pressed", x.dataset.preset === goal));
    return true;
  }
  const readForm = () => ({
    cal: Math.max(1000, Math.min(5000, Number(cal.value) || 2000)),
    pro: Math.max(40, Math.min(350, Number(pro.value) || 150)),
    meals: Number(form.meals.value),
    diets: $$('input[name="diet"]:checked').map(i => i.value),
    src: form.src.value,
    avoid: $("#avoid").value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean),
  });
  const writeForm = s => {
    setTargets(s.cal, s.pro);
    form.meals.value = String(s.meals);
    $$('input[name="diet"]').forEach(i => i.checked = s.diets.includes(i.value));
    form.src.value = s.src;
    $("#avoid").value = (s.avoid || []).join(", ");
  };

  /* ---------- recipe pools ---------- */
  function pools(s) {
    const ok = r => {
      if (s.src !== "all" && r.src !== s.src) return false;
      for (const d of s.diets) if (!r.diets.includes(d)) return false;
      if (s.avoid.length) {
        const hay = (r.name + " " + r.ingredients.map(i => i.label).join(" ")).toLowerCase();
        if (s.avoid.some(a => hay.includes(a))) return false;
      }
      return true;
    };
    const all = DATA.recipes.filter(ok);
    const by = m => all.filter(r => r.meal === m);
    const p = { breakfast: by("breakfast").concat(by("smoothie")), main: by("main"), snack: by("snack").concat(by("dessert"), by("smoothie")) };
    // If a filter leaves a slot empty, fall back to anything that passes the filters
    for (const k in p) if (!p[k].length) p[k] = all;
    return { p, total: all.length };
  }

  /* ---------- scoring ---------- */
  const totalsOf = items => items.reduce((t, it) => {
    const m = it.r.macros, k = it.portion;
    t.cal += m.cal * k; t.p += m.p * k; t.c += m.c * k; t.f += m.f * k; return t;
  }, { cal: 0, p: 0, c: 0, f: 0 });
  function score(items, T) {
    const t = totalsOf(items);
    let s = Math.abs(t.cal - T.cal) / T.cal * 2;                          // calories close
    if (t.p < T.pro) s += (T.pro - t.p) / T.pro * 2.5;                   // protein short is worst
    else if (t.p > T.pro * 1.2) s += (t.p - T.pro * 1.2) / T.pro * 0.5;  // a bit over is fine
    items.forEach(it => s += (it.portion - 1) * 0.04);                     // prefer normal portions
    const ids = new Set(items.map(it => it.r.id));
    if (ids.size < items.length) s += 5;                                   // no repeats
    const cs = items.map(it => it.r.country).filter(Boolean);
    s -= (new Set(cs).size) * 0.01;                                        // a little world variety
    return s;
  }
  // Nudge portions (in 0.5 steps) toward the calorie target, favoring protein-dense meals
  function fitPortions(items, T) {
    items.forEach(it => { if (!it.locked) it.portion = 1; });
    for (let guard = 0; guard < 12; guard++) {
      const t = totalsOf(items);
      if (t.cal < T.cal * 0.96) {
        const cand = items.filter(it => !it.locked && it.portion + 0.5 <= MAXP[it.slot])
          .sort((a, b) => b.r.macros.p / b.r.macros.cal - a.r.macros.p / a.r.macros.cal)[0];
        if (!cand) break;
        cand.portion += 0.5;
      } else if (t.cal > T.cal * 1.05) {
        const cand = items.filter(it => !it.locked && it.portion > 1)
          .sort((a, b) => a.r.macros.p / a.r.macros.cal - b.r.macros.p / b.r.macros.cal)[0];
        if (!cand) break;
        cand.portion -= 0.5;
      } else break;
    }
    return items;
  }
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function build(s, keep = []) {
    const { p } = pools(s);
    const T = { cal: s.cal, pro: s.pro };
    const slots = SLOTS[s.meals];
    let best = [];
    for (let i = 0; i < 2500; i++) {
      const items = slots.map(([slot, label], n) => {
        const k = keep[n];
        if (k && k.locked && k.slot === slot) return { ...k };
        return { slot, label, r: pick(p[slot]), portion: 1, locked: false };
      });
      fitPortions(items, T);
      const sc = score(items, T);
      best.push([sc, items]);
      if (best.length > 40) { best.sort((a, b) => a[0] - b[0]); best = best.slice(0, 12); }
    }
    best.sort((a, b) => a[0] - b[0]);
    return pick(best.slice(0, 6))[1]; // one of the top few, so "shuffle" gives a different good day
  }

  function swap(n) {
    const s = readForm(), T = { cal: s.cal, pro: s.pro };
    const { p } = pools(s);
    const cur = plan[n];
    const cands = [];
    const others = plan.map((it, i) => i === n ? null : { ...it, locked: true });
    for (let i = 0; i < 600; i++) {
      const r = pick(p[cur.slot]);
      if (r.id === cur.r.id) continue;
      const items = others.map((it, i2) => i2 === n ? { ...cur, r, portion: 1, locked: false } : it);
      fitPortions(items, T);
      cands.push([score(items, T), items[n]]);
    }
    cands.sort((a, b) => a[0] - b[0]);
    const choice = pick(cands.slice(0, 6));
    if (choice) { plan[n] = { ...choice[1], label: cur.label }; render(); }
  }

  /* ======================================================================
     Two tabs:
       My day       starts empty. Search recipes and add them to meal slots; totals update live.
       Suggestions  we build a whole day that hits the numbers, with Shuffle / Swap / Lock,
                    and "Use this day" copies it into My day.
     ====================================================================== */
  let tab = "mine";
  let mine = []; // [{key, r, portion}]
  // My day has four sections; each holds as many recipes as you like
  const SECTIONS = [["breakfast", "Breakfast"], ["lunch", "Lunch"], ["dinner", "Dinner"], ["snack", "Snacks"]];
  const SLOT_MEAL = { breakfast: ["breakfast", "smoothie"], lunch: ["main"], dinner: ["main"], snack: ["snack", "smoothie", "dessert"] };
  const OLD_KEY = { snack1: "snack", snack2: "snack" }; // older share links had two snack rows
  const ORDER = SECTIONS.map(x => x[0]);
  const sortMine = () => mine.sort((x, y) => ORDER.indexOf(x.key) - ORDER.indexOf(y.key));
  let addingTo = "breakfast";
  let rsMeal = "slot", rsSort = "fit", rsLimit = 24;
  const slotsShown = () => SECTIONS;
  const labelOf = k => (SECTIONS.find(x => x[0] === k) || [, ""])[1];
  const current = () => tab === "mine" ? mine : plan;

  /* ---------- shared render bits ---------- */
  const fmtP = k => k === 1 ? "1 serving" : `${k} servings`;
  const pctBar = (label, val, target, unit, cls) => {
    const pct = target ? Math.round(val / target * 100) : 0;
    const ok = target ? Math.abs(val - target) / target <= 0.07 : true;
    return `<div class="tot ${cls}">
      <div class="tot-top"><span>${label}</span><b>${Math.round(val)}${unit}</b>${target ? `<small>of ${target}${unit}</small>` : ""}</div>
      <div class="track"><i style="width:${Math.min(100, pct)}%"></i></div>
      ${target ? (() => {
        const hit = ok || (cls === "p" && val >= target);
        const msg = val === 0 ? "Nothing added yet" : ok ? "On target" : hit ? `Goal hit (+${Math.round(val - target)}${unit})`
          : val < target ? `${Math.round(target - val)}${unit} to go` : `${Math.round(val - target)}${unit} over`;
        return `<div class="tot-flag ${hit && val ? "ok" : ""}">${msg}</div>`;
      })() : ""}
    </div>`;
  };
  const imgOf = r => r.img ? `<img src="${r.img}" alt="" loading="lazy">` : `<div class="ph" style="color:var(--yellow)">${MMEUI.ICON.fork}</div>`;
  const srcOf = r => r.src === "video" ? "MacrosMadeEz" : esc(countryBy[r.country]?.name || "World kitchen");
  const macrosOf = (m, k) => `<b>${Math.round(m.cal * k)}</b> cal · <b class="g">${Math.round(m.p * k)}g</b> protein · ${Math.round(m.c * k)}g carbs · ${Math.round(m.f * k)}g fat`;

  function render() {
    const s = readForm();
    const items = current();
    const t = totalsOf(items);
    $$("[data-ptab]").forEach(b => b.setAttribute("aria-selected", b.dataset.ptab === tab));
    $("#mineView").hidden = tab !== "mine";
    $("#suggestView").hidden = tab !== "suggest";
    const showTotals = tab === "mine" || plan.length;
    $("#totals").innerHTML = showTotals ? `
      ${pctBar("Calories", t.cal, s.cal, "", "cal")}
      ${pctBar("Protein", t.p, s.pro, "g", "p")}
      ${pctBar("Carbs", t.c, 0, "g", "c")}
      ${pctBar("Fat", t.f, 0, "g", "f")}
      ${tab === "suggest" && t.p < s.pro * 0.92 ? `<p class="plan-tip">Tough target with these filters. Try adding a snack, lowering protein a little, or adding a protein shake (about 25g).</p>` : ""}` : "";
    $("#planActions").hidden = !items.length;
    if (tab === "mine") renderMine(s, t); else renderSuggest();
    if (!$("#grocery").hidden) { if (items.length) renderGrocery(); else $("#grocery").hidden = true; }
    save();
  }

  /* ---------- My day ---------- */
  function renderMine(s, t) {
    const shown = slotsShown();
    if (!SLOT_MEAL[addingTo]) addingTo = "breakfast";
    $("#slots").innerHTML = shown.map(([key, label]) => {
      const its = mine.map((it, n) => ({ it, n })).filter(x => x.it.key === key);
      const st = totalsOf(its.map(x => x.it));
      return `<div class="slot ${addingTo === key ? "adding" : ""}">
        <div class="slot-head"><b>${esc(label)}</b><span>${its.length ? `${Math.round(st.cal)} cal · ${Math.round(st.p)}g protein` : ""}</span>
          <button type="button" class="btn btn-sm ${addingTo === key ? "btn-yellow" : "btn-ghost"}" data-add-to="${key}">${addingTo === key ? "Adding here ↓" : its.length ? "+ Add more" : "+ Add recipe"}</button></div>
        ${its.length ? `<ul class="slot-items">${its.map(({ it, n }) => `<li>
          <a class="meal-img" href="recipe/${it.r.id}/" target="_blank" rel="noopener">${imgOf(it.r)}</a>
          <div class="meal-body"><span class="card-src">${srcOf(it.r)}</span>
            <a class="meal-name" href="recipe/${it.r.id}/" target="_blank" rel="noopener">${esc(it.r.name)}</a>
            <div class="meal-macros">${macrosOf(it.r.macros, it.portion)}</div>
            <div class="portion" role="group" aria-label="Servings"><button type="button" data-m="less" data-n="${n}" aria-label="Fewer servings">−</button><span>${fmtP(it.portion)}</span><button type="button" data-m="more" data-n="${n}" aria-label="More servings">+</button></div>
          </div>
          <button type="button" class="slot-rm" data-m="rm" data-n="${n}" aria-label="Remove ${esc(it.r.name)}">${MMEUI.ICON.close}</button>
        </li>`).join("")}</ul>` : `<p class="slot-empty">${addingTo === key ? "Search below and tap <b>Add</b>. Add as many as you like." : "Nothing yet."}</p>`}
      </div>`;
    }).join("");
    const left = { cal: s.cal - t.cal, p: s.pro - t.p };
    const label = labelOf(addingTo);
    $("#rsLeft").innerHTML = mine.length
      ? (left.cal > 30 || left.p > 3
        ? `Left to hit your targets: <b>${Math.max(0, Math.round(left.cal))} cal</b> and <b>${Math.max(0, Math.round(left.p))}g protein</b>.`
        : `<b>You've hit your targets for the day.</b> Nice work.`)
      : `Pick a meal, add as many recipes as you like, then switch to the next meal. Your totals update as you go.`;
    $("#rsTo").textContent = label;
    $$("[data-sec]").forEach(b => {
      const n = mine.filter(it => it.key === b.dataset.sec).length;
      b.setAttribute("aria-pressed", b.dataset.sec === addingTo);
      b.querySelector("i").textContent = n || "";
    });
    renderResults(s, t);
  }

  function filterOk(s) {
    return r => {
      if (s.src !== "all" && r.src !== s.src) return false;
      for (const d of s.diets) if (!r.diets.includes(d)) return false;
      if (s.avoid.length) {
        const hay = (r.name + " " + r.ingredients.map(i => i.label).join(" ")).toLowerCase();
        if (s.avoid.some(a => hay.includes(a))) return false;
      }
      return true;
    };
  }
  function renderResults(s, t) {
    const q = $("#rsQ").value.trim().toLowerCase();
    const ok = filterOk(s);
    const meals = rsMeal === "slot" ? SLOT_MEAL[addingTo] : rsMeal === "all" ? null : [rsMeal];
    let list = DATA.recipes.filter(r => ok(r) && (!meals || meals.includes(r.meal)) &&
      (!q || (r.name + " " + (countryBy[r.country]?.name || "") + " " + r.ingredients.map(i => i.label).join(" ")).toLowerCase().includes(q)));
    // "Best fit": close to this meal's fair share of what's left, and protein-dense
    const emptySlots = Math.max(1, ["breakfast", "lunch", "dinner"].filter(k => !mine.some(it => it.key === k)).length);
    const share = Math.max(150, (s.cal - t.cal) / emptySlots);
    const dens = r => r.macros.p * 4 / Math.max(1, r.macros.cal);
    const sorters = {
      fit: (a, b) => (Math.abs(a.macros.cal - share) / share - dens(a)) - (Math.abs(b.macros.cal - share) / share - dens(b)),
      protein: (a, b) => b.macros.p - a.macros.p,
      light: (a, b) => a.macros.cal - b.macros.cal,
    };
    list.sort(sorters[rsSort]);
    const total = list.length;
    list = list.slice(0, rsLimit);
    $("#rsCount").textContent = `${total} recipe${total === 1 ? "" : "s"}`;
    $("#rsResults").innerHTML = list.length ? list.map(r => `<li>
        <a class="meal-img" href="recipe/${r.id}/" target="_blank" rel="noopener">${imgOf(r)}</a>
        <div class="meal-body"><span class="card-src">${srcOf(r)}</span>
          <a class="meal-name" href="recipe/${r.id}/" target="_blank" rel="noopener">${esc(r.name)}</a>
          <div class="meal-macros">${macrosOf(r.macros, 1)}</div></div>
        <button type="button" class="btn btn-green btn-sm" data-pick="${r.id}">Add</button>
      </li>`).join("") : `<li class="rs-none">No recipes match. Try another word or meal type.</li>`;
    $("#rsMore").hidden = total <= rsLimit;
  }

  $("#slots").addEventListener("click", e => {
    const a = e.target.closest("[data-add-to]");
    if (a) { pickSection(a.dataset.addTo); $("#rsQ").focus({ preventScroll: true }); $("#search").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const b = e.target.closest("[data-m]"); if (!b) return;
    const n = Number(b.dataset.n), it = mine[n];
    if (b.dataset.m === "more") it.portion = Math.min(3, it.portion + 0.5);
    if (b.dataset.m === "less") it.portion = Math.max(0.5, it.portion - 0.5);
    if (b.dataset.m === "rm") mine.splice(n, 1);
    render();
  });
  $("#rsResults").addEventListener("click", e => {
    const b = e.target.closest("[data-pick]"); if (!b) return;
    // Stay on the meal you picked; switch meals yourself with the buttons when you're done
    const same = mine.find(it => it.key === addingTo && it.r.id === b.dataset.pick);
    if (same) same.portion = Math.min(3, same.portion + 1); // tapping Add again = another serving
    else mine.push({ key: addingTo, r: MMEUI.recipeById[b.dataset.pick], portion: 1 });
    sortMine();
    const id = b.dataset.pick;
    render();
    const nb = $(`#rsResults [data-pick="${id}"]`);
    if (nb) { nb.textContent = "Added ✓"; nb.classList.add("added"); setTimeout(() => { nb.textContent = "Add"; nb.classList.remove("added"); }, 1400); }
  });
  const pickSection = k => { addingTo = k; rsMeal = "slot"; syncRsChips(); rsLimit = 24; $("#rsQ").value = ""; render(); };
  $$("[data-sec]").forEach(b => b.onclick = () => { pickSection(b.dataset.sec); $("#rsQ").focus({ preventScroll: true }); });
  const syncRsChips = () => $$("[data-rs-meal]").forEach(b => b.setAttribute("aria-pressed", b.dataset.rsMeal === rsMeal));
  $$("[data-rs-meal]").forEach(b => b.onclick = () => { rsMeal = b.dataset.rsMeal; rsLimit = 24; syncRsChips(); render(); });
  $("#rsQ").addEventListener("input", () => { rsLimit = 24; renderResults(readForm(), totalsOf(mine)); });
  $("#rsSort").onchange = e => { rsSort = e.target.value; render(); };
  $("#rsMore").onclick = () => { rsLimit += 24; renderResults(readForm(), totalsOf(mine)); };
  $("#clearDay").onclick = () => { mine = []; addingTo = "breakfast"; render(); };

  /* ---------- Suggestions ---------- */
  function renderSuggest() {
    $("#suggestEmpty").hidden = plan.length > 0;
    $("#regen").hidden = $("#useDay").hidden = !plan.length;
    $("#suggestGo").textContent = plan.length ? "New suggestion" : "Suggest a day";
    $("#suggestGo").hidden = plan.length > 0;
    $("#plan").innerHTML = plan.map((it, n) => {
      const r = it.r, k = it.portion;
      return `<li class="meal ${it.locked ? "locked" : ""}">
        <div class="meal-label">${esc(it.label)}</div>
        <a class="meal-img" href="recipe/${r.id}/" target="_blank" rel="noopener">${imgOf(r)}</a>
        <div class="meal-body">
          <span class="card-src">${srcOf(r)}</span>
          <a class="meal-name" href="recipe/${r.id}/" target="_blank" rel="noopener">${esc(r.name)}</a>
          <div class="meal-macros">${macrosOf(r.macros, k)}</div>
          <div class="portion" role="group" aria-label="Servings">
            <button type="button" data-act="less" data-n="${n}" aria-label="Fewer servings">−</button>
            <span>${fmtP(k)}</span>
            <button type="button" data-act="more" data-n="${n}" aria-label="More servings">+</button>
          </div>
        </div>
        <div class="meal-actions no-print">
          <button type="button" class="btn btn-ghost btn-sm" data-act="swap" data-n="${n}">Swap</button>
          <button type="button" class="btn btn-sm ${it.locked ? "btn-green" : "btn-ghost"}" data-act="lock" data-n="${n}" aria-pressed="${it.locked}">${it.locked ? "Locked" : "Lock"}</button>
        </div>
      </li>`;
    }).join("");
  }
  $("#plan").addEventListener("click", e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const n = Number(b.dataset.n), it = plan[n];
    if (b.dataset.act === "swap") swap(n);
    if (b.dataset.act === "lock") { it.locked = !it.locked; render(); }
    if (b.dataset.act === "more") { it.portion = Math.min(3, it.portion + 0.5); render(); }
    if (b.dataset.act === "less") { it.portion = Math.max(0.5, it.portion - 0.5); render(); }
  });
  function suggest(keepLocks) {
    const s = readForm();
    const { total } = pools(s);
    if (!total) {
      plan = []; render();
      $("#suggestEmpty").innerHTML = `<p class="h3">No recipes match those filters.</p><p>Try removing a diet filter or a skipped ingredient.</p>`;
      return;
    }
    plan = build(s, keepLocks ? plan : []);
    render();
  }
  $("#suggestGo").onclick = () => suggest(false);
  $("#regen").onclick = () => suggest(true);
  $("#useDay").onclick = () => {
    mine = plan.map(it => {
      const key = it.slot === "breakfast" ? "breakfast" : it.slot === "snack" ? "snack" : /dinner/i.test(it.label) ? "dinner" : "lunch";
      return { key, r: it.r, portion: it.portion };
    });
    sortMine();
    tab = "mine"; render();
    $("#useDay").textContent = "Copied to My day ✓";
    setTimeout(() => { $("#useDay").textContent = "Use this day"; }, 2500);
  };
  $$("[data-ptab]").forEach(b => b.onclick = () => {
    tab = b.dataset.ptab; render();
    if (tab === "suggest" && !plan.length) suggest(false);
  });

  /* ---------- grocery list (scales amounts by portion, merges same ingredient + unit) ---------- */
  const FR = { "½": .5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": .25, "¾": .75, "⅛": .125 };
  function parseAmt(a) {
    const s = String(a).trim();
    const m = s.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+|[½⅓⅔¼¾⅛])\s*(.*)$/);
    if (!m) return null;
    let q = m[1], n;
    if (FR[q]) n = FR[q];
    else if (q.includes(" ")) { const [w, f] = q.split(/\s+/); const [x, y] = f.split("/"); n = Number(w) + x / y; }
    else if (q.includes("/")) { const [x, y] = q.split("/"); n = x / y; }
    else n = Number(q);
    return { n, unit: m[2] };
  }
  function fmtQty(n) {
    const w = Math.floor(n), f = n - w;
    const fr = [[0, ""], [.25, "¼"], [1 / 3, "⅓"], [.5, "½"], [2 / 3, "⅔"], [.75, "¾"], [1, ""]]
      .reduce((a, b) => Math.abs(b[0] - f) < Math.abs(a[0] - f) ? b : a);
    const whole = fr[0] === 1 ? w + 1 : w;
    return (whole ? whole : "") + (fr[1] ? (whole ? " " : "") + fr[1] : "") || "¼";
  }
  function grocery() {
    const map = new Map();
    current().forEach(it => it.r.ingredients.forEach(i => {
      const pa = parseAmt(i.amt);
      const key = i.label.toLowerCase().replace(/,.*$/, "").trim() + "|" + (pa ? pa.unit.toLowerCase() : i.amt);
      const cur = map.get(key) || { label: i.label.replace(/,.*$/, ""), unit: pa ? pa.unit : "", n: 0, raw: [] };
      if (pa) cur.n += pa.n * it.portion; else cur.raw.push(i.amt);
      map.set(key, cur);
    }));
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }
  function renderGrocery() {
    const items = grocery();
    $("#grocery").innerHTML = `<div class="grocery-head"><h2 class="h3">Grocery list <small>${items.length} items</small></h2>
      <button class="btn btn-ghost btn-sm no-print" id="copyList" type="button">Copy list</button></div>
      <ul>${items.map(g => `<li><label><input type="checkbox"><span><b>${g.n ? fmtQty(g.n) + (g.unit ? " " + esc(g.unit) : "") : esc(g.raw.join(", "))}</b> ${esc(g.label)}</span></label></li>`).join("")}</ul>`;
    $("#copyList").onclick = async () => {
      const txt = items.map(g => `- ${g.n ? fmtQty(g.n) + (g.unit ? " " + g.unit : "") : g.raw.join(", ")} ${g.label}`).join("\n");
      try { await navigator.clipboard.writeText("MacrosMadeEz grocery list\n" + txt); $("#copyList").textContent = "Copied!"; } catch (e) { /* clipboard blocked */ }
    };
  }
  $("#groceryBtn").onclick = () => {
    const g = $("#grocery"); g.hidden = !g.hidden;
    $("#groceryBtn").textContent = g.hidden ? "Grocery list" : "Hide grocery list";
    if (!g.hidden) { renderGrocery(); g.scrollIntoView({ behavior: "smooth", block: "start" }); }
  };

  /* ---------- save / share ---------- */
  const encode = () => {
    const s = readForm();
    const p = new URLSearchParams({ cal: s.cal, p: s.pro, m: s.meals, src: s.src });
    if (s.diets.length) p.set("d", s.diets.join(","));
    if (s.avoid.length) p.set("x", s.avoid.join(","));
    if (mine.length) p.set("mine", mine.map(it => `${it.r.id}*${it.portion}*${it.key}`).join("~"));
    if (plan.length) p.set("plan", plan.map(it => `${it.r.id}*${it.portion}${it.locked ? "*L" : ""}`).join("~"));
    if (tab === "suggest") p.set("tab", "suggest");
    return p;
  };
  const decode = p => {
    const s = { cal: Number(p.get("cal")) || 2000, pro: Number(p.get("p")) || 150, meals: Number(p.get("m")) || 4,
      src: p.get("src") || "all", diets: (p.get("d") || "").split(",").filter(Boolean), avoid: (p.get("x") || "").split(",").filter(Boolean) };
    const slots = SLOTS[s.meals] || SLOTS[4];
    const items = (p.get("plan") || "").split("~").filter(Boolean).map((tok, n) => {
      const [id, por, L] = tok.split("*"); const r = MMEUI.recipeById[id];
      return r && slots[n] ? { slot: slots[n][0], label: slots[n][1], r, portion: Number(por) || 1, locked: L === "L" } : null;
    });
    const my = (p.get("mine") || "").split("~").filter(Boolean).map(tok => {
      const [id, por, key] = tok.split("*"); const r = MMEUI.recipeById[id];
      const k = OLD_KEY[key] || key;
      return r && SLOT_MEAL[k] ? { key: k, r, portion: Number(por) || 1 } : null;
    }).filter(Boolean);
    return { s, items: items.length === slots.length && items.every(Boolean) ? items : [], my, tab: p.get("tab") === "suggest" ? "suggest" : "mine" };
  };
  function save() {
    const q = encode().toString();
    history.replaceState(null, "", location.pathname + "?" + q + location.hash);
    try { localStorage.setItem(LS, q); } catch (e) { /* storage blocked: fine */ }
  }
  $("#shareBtn").onclick = async () => {
    const url = location.origin + location.pathname + "?" + encode();
    try {
      if (navigator.share) await navigator.share({ title: "My MacrosMadeEz meal plan", url });
      else { await navigator.clipboard.writeText(url); $("#shareBtn").textContent = "Link copied!"; }
    } catch (e) { /* cancelled */ }
  };
  $("#toWeekBtn").onclick = e => {
    let pop = $(".week-pop"); if (pop) { pop.remove(); return; }
    pop = document.createElement("div"); pop.className = "week-pop";
    pop.innerHTML = `<p>Put this day on…</p><div>${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => `<button type="button" data-day="${d}">${d}</button>`).join("")}</div>`;
    e.currentTarget.after(pop);
    pop.onclick = ev => {
      const d = ev.target.closest("[data-day]")?.dataset.day; if (!d) return;
      const w = MMEUI.store.get("week", {}); w[d] = current().map(it => it.r.id); MMEUI.store.set("week", w);
      pop.remove(); $("#toWeekBtn").textContent = `Saved to ${d} ✓`;
    };
  };
  $("#printBtn").onclick = () => { renderGrocery(); window.print(); };

  /* ---------- targets & filters update everything live ---------- */
  form.addEventListener("submit", e => { e.preventDefault(); tab = "suggest"; suggest(false); $("#out").scrollIntoView({ behavior: "smooth", block: "start" }); });
  form.addEventListener("input", () => { if (tab === "mine") render(); else { render(); } });
  form.addEventListener("change", () => render());
  form.addEventListener("click", e => { if (e.target.closest("[data-preset],[data-units]")) setTimeout(render, 0); });

  // Restore from the URL (shared plan) or the last visit; a first visit starts with an empty day
  let q = location.search.length > 1 ? new URLSearchParams(location.search) : null;
  if (!q) { try { const v = localStorage.getItem(LS); if (v) q = new URLSearchParams(v); } catch (e) { /* no storage */ } }
  if (q) {
    const d = decode(q);
    writeForm(d.s); lastTargets = d.s;
    plan = d.items; mine = d.my; tab = d.tab;
  } else {
    setTargets(2200, 160);
  }
  if (restoreBody() && !(location.search.length > 1)) calcBody(false);
  else if (bodyStats()) calcBody(false);
  // planner.html#lean-out / #maintain / #build-muscle (links from the home page) pick that goal
  const GOAL_HASH = { "lean-out": "cut", "maintain": "maintain", "build-muscle": "build" };
  const g = GOAL_HASH[location.hash.slice(1)];
  if (g) document.querySelector(`[data-preset="${g}"]`).click();
  sortMine();
  addingTo = (ORDER.find(k => !mine.some(it => it.key === k)) || "breakfast");
  render();
  reveal();
})();
