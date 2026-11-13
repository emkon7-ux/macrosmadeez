/* My Kitchen: saved recipes, meal plan with check-offs (+ grocery list), food passport. All stored on this device. */
(function () {
  const { DATA, $, $$, esc, card, header, footer, reveal, globe, favs, cooked, store, recipeById, countryBy, parseAmt, fmtQty, onChange, ICON } = MMEUI;
  header("kitchen"); footer();
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  /* ---------- tabs (hash: #saved / #week / #grocery / #passport) ---------- */
  const TABS = ["saved", "week", "grocery", "passport"];
  function show(tab) {
    if (!TABS.includes(tab)) tab = "saved";
    $$("[data-tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === tab));
    TABS.forEach(t => $("#tab-" + t).hidden = t !== tab);
    if (location.hash.slice(1) !== tab) history.replaceState(null, "", "#" + tab);
    ({ saved: renderSaved, week: renderWeek, grocery: renderGrocery, passport: renderPassport })[tab]();
  }
  $$("[data-tab]").forEach(b => b.onclick = () => show(b.dataset.tab));
  addEventListener("hashchange", () => show(location.hash.slice(1)));
  const counts = () => {
    const n = favs.all().length, s = cooked.countries().length;
    $("#nSaved").textContent = n || ""; $("#nStamps").textContent = s || "";
    const w = getWeek(), ids = DAYS.flatMap(d => w[d]), extra = store.get("grocery-extra", []).length;
    const done = new Set(store.get("grocery-checked", []));
    const left = (ids.length ? groceryItems(ids).filter(g => !done.has(g.key)).length : 0) + extra;
    $("#nGrocery").textContent = left || "";
  };

  /* ---------- saved ---------- */
  function renderSaved() {
    const list = favs.all().map(id => recipeById[id]).filter(Boolean);
    $("#tab-saved").innerHTML = list.length
      ? `<div class="results-bar"><span>${list.length} saved recipe${list.length === 1 ? "" : "s"}</span></div><div class="grid">${list.map(card).join("")}</div>`
      : `<div class="empty"><p class="h3">No saved recipes yet.</p><p>Tap the ♡ on any recipe to save it here.</p>
         <p><a class="btn btn-yellow" href="recipes.html">Browse recipes</a></p></div>`;
  }

  /* ---------- meal plan: plan each day, check meals off, count what's been eaten ---------- */
  const getWeek = () => { const w = store.get("week", {}); DAYS.forEach(d => w[d] = (w[d] || []).filter(id => recipeById[id])); return w; };
  const zero = () => ({ cal: 0, p: 0, c: 0, f: 0 });
  const addM = (t, id) => { const m = recipeById[id].macros; t.cal += m.cal; t.p += m.p; t.c += m.c || 0; t.f += m.f || 0; return t; };
  const sum = ids => ids.reduce(addM, zero());
  // Dates for this week (Mon..Sun). Check-offs are saved per week, so a new week starts unchecked.
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const now = new Date(), todayIdx = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - todayIdx);
  const dateOf = i => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
  const WEEK_KEY = iso(monday), TODAY = DAYS[todayIdx];
  const getChecks = () => {
    const all = store.get("plan-checks", {}), w = getWeek(), c = all[WEEK_KEY] || {};
    DAYS.forEach(d => c[d] = (c[d] || []).filter(i => i < w[d].length));
    return c;
  };
  const setChecks = c => {
    const all = store.get("plan-checks", {});
    all[WEEK_KEY] = c;
    Object.keys(all).sort().slice(0, -8).forEach(k => delete all[k]); // keep about two months
    store.set("plan-checks", all);
  };
  let planDay = TODAY;
  const bar = (label, got, goal, unit) => {
    const pct = goal ? Math.min(100, Math.round(got / goal * 100)) : 0;
    const over = goal && got > goal * 1.05;
    const note = over ? `${(got - goal).toLocaleString()}${unit} over` : got >= goal * 0.95 ? "Target hit ✓" : `${(goal - got).toLocaleString()}${unit} to go`;
    return `<div class="mt-row"><div class="mt-top"><b>${label}</b><span><strong>${got.toLocaleString()}${unit}</strong>${goal ? ` / ${goal.toLocaleString()}${unit}` : ""}</span></div>
      ${goal ? `<div class="mt-bar${over ? " over" : ""}"><i style="width:${pct}%"></i></div><small>${note}</small>` : ""}</div>`;
  };
  function renderWeek() {
    const w = getWeek(), ch = getChecks(), T = store.get("targets", null);
    const favOpts = favs.all().map(id => recipeById[id]).filter(Boolean);
    const total = DAYS.reduce((n, d) => n + w[d].length, 0);
    const eatenOf = d => sum(w[d].filter((_, i) => ch[d].includes(i)));
    const dayDone = d => w[d].length > 0 && ch[d].length === w[d].length;
    const di = DAYS.indexOf(planDay), items = w[planDay], eaten = eatenOf(planDay), planned = sum(items);
    const fmtD = i => dateOf(i).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const weekEaten = DAYS.reduce((t, d) => { const e = eatenOf(d); t.cal += e.cal; t.p += e.p; return t; }, { cal: 0, p: 0 });
    const daysDone = DAYS.filter(dayDone).length;
    const dayName = planDay === TODAY ? "today" : planDay;
    const addSel = d => `<select data-add="${d}" aria-label="Add a saved recipe to ${d}"><option value="">+ Add ${favOpts.length ? "a saved recipe" : "(save recipes first)"}</option>
      ${favOpts.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join("")}</select>`;
    const thumb = r => r.img ? `<img src="${r.img}" alt="" loading="lazy">` : `<span class="ph-mini">${ICON.fork}</span>`;

    $("#tab-week").innerHTML = `
      <div class="week-intro">
        <p>Plan each day, then check meals off as you eat them. Your calories, protein, carbs and fat add up as you go. Add recipes from any recipe page ("Add to my week"), from your saved list, or let the <a href="planner.html">Macro meal builder</a> plan a day.</p>
        <div class="week-btns">
          <a class="btn btn-green btn-sm" href="#grocery">Grocery list for the week</a>
          <button class="btn btn-ghost btn-sm" id="weekClear" ${total ? "" : "disabled"}>Clear week</button>
        </div>
      </div>

      <div class="mt">
        <div class="mt-days" role="tablist" aria-label="Pick a day">${DAYS.map((d, i) => `<button type="button" role="tab" data-pday="${d}" aria-selected="${d === planDay}" class="${dayDone(d) ? "done" : ""}">
          <b>${d === TODAY ? "Today" : d}</b><small>${fmtD(i)}</small>${dayDone(d) ? "<i>✓</i>" : ""}</button>`).join("")}</div>
        <div class="mt-body">
          <div class="mt-list">
            <div class="mt-head"><h3 class="h3">${planDay === TODAY ? "Today" : planDay}, ${fmtD(di)}</h3>
              <span>${ch[planDay].length} of ${items.length} eaten</span></div>
            ${items.length ? `<ul>${items.map((id, i) => { const r = recipeById[id], on = ch[planDay].includes(i); return `<li class="${on ? "on" : ""}">
              <label class="mt-check"><input type="checkbox" data-chk="${planDay}:${i}" ${on ? "checked" : ""}><span class="box" aria-hidden="true">✓</span>
                ${thumb(r)}
                <span class="nm">${esc(r.name)}<small>${r.macros.cal} cal · ${r.macros.p}g protein · ${r.macros.c || 0}g carbs · ${r.macros.f || 0}g fat</small></span></label>
              <a class="mt-open" href="recipe/${r.id}/" aria-label="Open the ${esc(r.name)} recipe">Recipe</a></li>`; }).join("")}</ul>
              <div class="week-btns"><button class="btn btn-yellow btn-sm" id="dayAll">${dayDone(planDay) ? "Uncheck all" : "Check off the whole day"}</button></div>`
            : `<div class="mt-empty"><p>Nothing planned for ${dayName} yet.</p>
              <p><a class="btn btn-green btn-sm" href="planner.html">Build a day</a> <a class="btn btn-ghost btn-sm" href="recipes.html">Browse recipes</a></p></div>`}
            ${addSel(planDay)}
          </div>
          <div class="mt-totals" aria-live="polite">
            <h4>Eaten ${planDay === TODAY ? "today" : "on " + planDay}</h4>
            ${bar("Calories", eaten.cal, T?.cal, "")}
            ${bar("Protein", eaten.p, T?.p, "g")}
            <div class="mt-cf"><div><b>${eaten.c}g</b><span>carbs</span></div><div><b>${eaten.f}g</b><span>fat</span></div></div>
            <p class="mt-note">Planned for the day: ${planned.cal.toLocaleString()} cal · ${planned.p}g protein · ${planned.c}g carbs · ${planned.f}g fat.</p>
            <p class="mt-note">${T ? `Targets come from your <a href="planner.html">meal builder</a>. Change them there.` : `<a href="planner.html">Set your calorie and protein targets</a> to see progress bars.`}</p>
            <p class="mt-week"><b>This week:</b> ${daysDone} of 7 days fully checked off · ${weekEaten.cal.toLocaleString()} cal · ${weekEaten.p}g protein eaten</p>
          </div>
        </div>
      </div>

      <h3 class="h3 wk-title">The whole week</h3>
      <div class="week-grid">${DAYS.map((d, i2) => {
        const t = sum(w[d]), e = eatenOf(d);
        return `<div class="day${d === TODAY ? " is-today" : ""}${dayDone(d) ? " done" : ""}">
          <div class="day-head"><b>${d} <small>${fmtD(i2)}</small>${dayDone(d) ? " ✓" : ""}</b><span>${t.cal ? `${e.cal} / ${t.cal} cal · <em>${e.p} / ${t.p}g protein</em>` : "Nothing yet"}</span></div>
          <ul>${w[d].map((id, i) => { const r = recipeById[id], on = ch[d].includes(i); return `<li class="${on ? "on" : ""}">
            <input type="checkbox" class="wk-chk" data-chk="${d}:${i}" ${on ? "checked" : ""} aria-label="Ate ${esc(r.name)} on ${d}">
            <a href="recipe/${r.id}/">${thumb(r)}<span>${esc(r.name)}<small>${r.macros.cal} cal · ${r.macros.p}g</small></span></a>
            <button type="button" class="rm" data-rm="${d}:${i}" aria-label="Remove ${esc(r.name)} from ${d}">${ICON.close}</button></li>`; }).join("")}</ul>
          ${addSel(d)}
        </div>`;
      }).join("")}</div>
`;
    const redo = () => { renderWeek(); counts(); };
    $$("[data-pday]").forEach(b => b.onclick = () => { planDay = b.dataset.pday; renderWeek(); });
    $$("[data-chk]").forEach(c => c.onchange = () => {
      const [d, i] = c.dataset.chk.split(":"), n = Number(i), c2 = getChecks();
      c2[d] = c.checked ? [...new Set([...c2[d], n])] : c2[d].filter(x => x !== n);
      setChecks(c2); renderWeek();
    });
    const all = $("#dayAll");
    if (all) all.onclick = () => { const c2 = getChecks(); c2[planDay] = dayDone(planDay) ? [] : w[planDay].map((_, i) => i); setChecks(c2); renderWeek(); };
    $$("[data-add]").forEach(s => s.onchange = () => { if (!s.value) return; const w2 = getWeek(); w2[s.dataset.add].push(s.value); store.set("week", w2); redo(); });
    $$("[data-rm]").forEach(b => b.onclick = () => {
      const [d, i] = b.dataset.rm.split(":"), n = Number(i), w2 = getWeek(), c2 = getChecks();
      w2[d].splice(n, 1); store.set("week", w2);
      c2[d] = c2[d].filter(x => x !== n).map(x => x > n ? x - 1 : x); setChecks(c2); // keep the other check marks on the right meals
      redo();
    });
    $("#weekClear").onclick = () => { if (confirmClear()) { store.set("week", {}); store.set("grocery-checked", []); setChecks({}); redo(); } };
  }
  // Two-tap confirm without a browser dialog
  let clearArmed = 0;
  function confirmClear() {
    if (Date.now() - clearArmed < 3000) return true;
    clearArmed = Date.now(); $("#weekClear").textContent = "Tap again to clear"; return false;
  }
  /* ---------- grocery list (everything scheduled in the meal plan) ---------- */
  const AISLES = [
    ["Produce", /\b(onion|shallot|garlic|ginger|tomato|bell pepper|peppers?\b|chil[ei]|jalape|lettuce|spinach|kale|cabbage|carrot|potato|yam|cassava|plantain|banana|apple|mango|pineapple|papaya|berr|lemon|lime|orange|avocado|cucumber|zucchini|squash|pumpkin|eggplant|aubergine|mushroom|broccoli|cauliflower|sprout|celery|leek|scallion|green onion|herbs?\b|cilantro|parsley|mint|basil|dill|okra|corn\b|peas?\b|greens|chard|beet|radish|fruit|dates?\b|figs?\b|grape|melon|lemongrass|leaves|salad|veg)/i],
    ["Meat & seafood", /\b(chicken|beef|steak|pork|lamb|mutton|goat|turkey|duck|sausage|bacon|ham\b|mince|ground|fish|salmon|tuna|cod\b|tilapia|shrimp|prawn|crab|squid|octopus|mussel|clam|seafood|sardine|anchov|mackerel|veal|liver|chorizo)/i],
    ["Dairy & eggs", /\b(eggs?\b|milk|yogurt|yoghurt|cheese|feta|paneer|halloumi|labneh|butter|ghee|cream|kefir|skyr|ricotta|mozzarella|parmesan|quark|curd|whey|protein powder)/i],
    ["Tofu, beans & legumes", /\b(tofu|tempeh|edamame|chickpea|lentil|beans?\b|dal\b|split pea|seitan|hummus)/i],
    ["Grains, bread & pasta", /\b(rice|quinoa|oats?\b|oatmeal|bread|pita|tortilla|wrap|flour|pasta|noodle|couscous|bulgur|barley|millet|teff|injera|sorghum|polenta|cornmeal|semolina|buckwheat|roti|naan|bun|cracker|granola|cereal)/i],
    ["Nuts, seeds & dried", /\b(nuts?\b|almond|cashew|walnut|pistachio|peanut|sesame|tahini|seeds?\b|chia|flax|raisin|dried)/i],
    ["Spices, sauces & pantry", /\b(salt|spice|cumin|paprika|turmeric|cinnamon|curry|masala|oregano|thyme|sauce|soy|vinegar|oil|honey|sugar|syrup|stock|broth|paste|mustard|ketchup|mayo|salsa|seasoning|powder|bay\b|clove|cardamom|nutmeg|allspice|saffron|sumac|za.atar|harissa|berbere|coconut milk|vanilla|cocoa|baking|ice)/i],
  ];
  // Checked before the aisle list so "potato starch" or "rice flour" don't land in Produce
  const EARLY = [["Grains, bread & pasta", /\b(flour|starch|panko|breadcrumbs?|crumbs|crusts?|dough|wrappers?|tortillas?|masa)\b/i],
                 ["Spices, sauces & pantry", /\b(powder|paste|sauce|syrup|oil|vinegar|spice|seasoning)\b/i]];
  const aisleOf = raw => { const label = raw.replace(/\(.*?\)/g, ""); return (EARLY.find(([, re]) => re.test(label)) || AISLES.find(([, re]) => re.test(label)) || ["Other"])[0]; };
  function groceryItems(ids) {
    const map = new Map();
    ids.forEach(id => recipeById[id].ingredients.forEach(i => {
      const pa = parseAmt(i.amt), label = i.label.replace(/,(?![^(]*\)).*$/, "").trim();
      const key = label.toLowerCase() + "|" + (pa ? pa.unit.toLowerCase() : "");
      const cur = map.get(key) || { key, label, unit: pa ? pa.unit : "", n: 0, raw: [], from: new Set() };
      if (pa) cur.n += pa.n; else if (i.amt) cur.raw.push(i.amt);
      cur.from.add(recipeById[id].name);
      map.set(key, cur);
    }));
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }
  const qty = g => (g.n ? fmtQty(g.n) + (g.unit ? " " + g.unit : "") : "") + (g.raw.length ? (g.n ? " + " : "") + g.raw.join(" + ") : "");
  function renderGrocery() {
    const w = getWeek();
    const ids = DAYS.flatMap(d => w[d]);
    const extras = store.get("grocery-extra", []);
    const el = $("#tab-grocery");
    if (!ids.length && !extras.length) {
      el.innerHTML = `<div class="empty"><p class="h3">Your grocery list builds itself.</p>
        <p>Schedule recipes in your <a href="#week">Meal plan</a> (or tap "Add to my week" on any recipe) and every ingredient shows up here, added up and sorted by aisle.</p>
        <p><a class="btn btn-yellow" href="recipes.html">Find recipes</a> <a class="btn btn-ghost" href="planner.html">Plan a day for me</a></p></div>`;
      return;
    }
    const items = groceryItems(ids).concat(extras.map((t, n) => ({ key: "extra|" + t, label: t, unit: "", n: 0, raw: [], from: new Set(), extra: n })));
    const checked = new Set(store.get("grocery-checked", []));
    const groups = {};
    items.forEach(g => (groups[g.extra != null ? "Added by you" : aisleOf(g.label)] ||= []).push(g));
    const order = AISLES.map(a => a[0]).concat(["Other", "Added by you"]).filter(k => groups[k]);
    const left = items.filter(g => !checked.has(g.key)).length;
    const recipesN = new Set(ids).size;
    el.innerHTML = `
      <div class="grocery grocery-page">
        <div class="grocery-head">
          <div><h2 class="h3">Grocery list <small>${recipesN} recipe${recipesN === 1 ? "" : "s"} · ${ids.length} meal${ids.length === 1 ? "" : "s"} scheduled</small></h2>
            <p class="g-left">${left ? `<b>${left}</b> of ${items.length} items left to buy` : `<b>All done.</b> Everything's in the cart.`}</p></div>
          <div class="week-btns no-print">
            <button class="btn btn-green btn-sm" id="gCopy" type="button">Copy list</button>
            <button class="btn btn-ghost btn-sm" id="gPrint" type="button">Print</button>
            <button class="btn btn-ghost btn-sm" id="gUncheck" type="button" ${checked.size ? "" : "disabled"}>Uncheck all</button>
          </div>
        </div>
        <form class="g-add no-print" id="gAdd"><input class="text-in" id="gAddIn" placeholder="Add something else (coffee, paper towels...)" aria-label="Add an item"><button class="btn btn-yellow btn-sm" type="submit">Add</button></form>
        <div class="aisles">${order.map(k => `<section class="aisle"><h3>${k} <small>${groups[k].length}</small></h3><ul>${groups[k].map(g => `
          <li class="${checked.has(g.key) ? "got" : ""}"><label><input type="checkbox" data-key="${esc(g.key)}" ${checked.has(g.key) ? "checked" : ""}>
            <span>${qty(g) ? `<b>${esc(qty(g))}</b> ` : ""}${esc(g.label)}${g.from.size ? `<small>${esc([...g.from].slice(0, 2).join(", "))}${g.from.size > 2 ? ` +${g.from.size - 2} more` : ""}</small>` : ""}</span></label>
            ${g.extra != null ? `<button type="button" class="rm" data-xrm="${g.extra}" aria-label="Remove ${esc(g.label)}">${ICON.close}</button>` : ""}</li>`).join("")}</ul></section>`).join("")}</div>
        <p class="fine">Amounts are added up across your scheduled meals (1 serving each). Your ticks are saved on this device.</p>
      </div>`;
    el.querySelectorAll("[data-key]").forEach(c => c.onchange = () => {
      const s = new Set(store.get("grocery-checked", []));
      c.checked ? s.add(c.dataset.key) : s.delete(c.dataset.key);
      store.set("grocery-checked", [...s]); renderGrocery(); counts();
    });
    el.querySelectorAll("[data-xrm]").forEach(b => b.onclick = () => { const x = store.get("grocery-extra", []); x.splice(Number(b.dataset.xrm), 1); store.set("grocery-extra", x); renderGrocery(); counts(); });
    $("#gAdd").onsubmit = e => { e.preventDefault(); const v = $("#gAddIn").value.trim(); if (!v || extras.includes(v)) return; store.set("grocery-extra", extras.concat(v)); renderGrocery(); counts(); $("#gAddIn").focus(); };
    $("#gUncheck").onclick = () => { store.set("grocery-checked", []); renderGrocery(); counts(); };
    $("#gPrint").onclick = () => window.print();
    $("#gCopy").onclick = async () => {
      const text = "MacrosMadeEz grocery list\n" + order.map(k => {
        const rows = groups[k].filter(g => !checked.has(g.key));
        return rows.length ? `\n${k.toUpperCase()}\n` + rows.map(g => `- ${qty(g) ? qty(g) + " " : ""}${g.label}`).join("\n") : "";
      }).join("\n");
      try { await navigator.clipboard.writeText(text.trim()); $("#gCopy").textContent = "Copied!"; } catch (e) { /* blocked */ }
    };
  }

  /* ---------- passport ---------- */
  function renderPassport() {
    const stamped = new Set(cooked.countries());
    const cookedIds = Object.keys(cooked.all()).filter(id => recipeById[id]);
    const total = DATA.countries.length;
    const regions = {};
    [...DATA.countries].sort((a, b) => a.name.localeCompare(b.name)).forEach(c => (regions[c.region] ||= []).push(c));
    const pct = Math.round(stamped.size / total * 100);
    const level = stamped.size >= 50 ? "World traveler" : stamped.size >= 20 ? "Globetrotter" : stamped.size >= 5 ? "Explorer" : "First steps";
    $("#tab-passport").innerHTML = `
      <div class="passport-top">
        <div class="passport-card">
          <span class="eyebrow plain">MacrosMadeEz passport</span>
          <div class="pp-big"><b>${stamped.size}</b><span>of ${total} countries</span></div>
          <div class="pp-bar"><i style="width:${Math.max(pct, stamped.size ? 2 : 0)}%"></i></div>
          <div class="pp-stats"><span><b>${cookedIds.length}</b> recipes cooked</span><span>Level: <b>${level}</b></span></div>
          <div class="pp-btns">
            <button class="btn btn-yellow btn-sm" id="ppShare" ${stamped.size ? "" : "disabled"}>Share my passport</button>
            <a class="btn btn-ghost btn-sm" href="world.html">Find a new country</a>
          </div>
          <p class="fine">Tap "I cooked this" on any recipe (or finish Cook mode) to collect a stamp.</p>
        </div>
        <svg class="passport-globe globe" id="ppGlobe" aria-hidden="true"></svg>
      </div>
      ${cookedIds.length ? `<h2 class="h3" style="margin:40px 0 14px">Recently cooked</h2>
        <div class="grid">${cookedIds.sort((a, b) => cooked.all()[b].localeCompare(cooked.all()[a])).slice(0, 8).map(id => card(recipeById[id])).join("")}</div>` : ""}
      <h2 class="h3" style="margin:44px 0 18px">Stamps</h2>
      <div class="stamp-regions">${Object.keys(regions).sort().map(r => {
        const cs = regions[r], got = cs.filter(c => stamped.has(c.code)).length;
        return `<div class="stamp-region"><h3>${r} <small>${got}/${cs.length}</small></h3><div class="stamps">${cs.map(c =>
          `<a class="stamp ${stamped.has(c.code) ? "got" : ""}" href="country/${c.code}/" title="${esc(c.name)}">${stamped.has(c.code) ? ICON.stamp : ""}<span>${esc(c.name)}</span></a>`).join("")}</div></div>`;
      }).join("")}</div>`;
    globe($("#ppGlobe"), { interactive: true, autoRotate: true, stampCodes: [...stamped], onPick: c => location.href = "country/" + c.code + "/" }).catch(() => $("#ppGlobe")?.remove());
    $("#ppShare").onclick = async () => {
      const names = [...stamped].map(c => countryBy[c]?.name).filter(Boolean);
      const text = `I've cooked my way through ${stamped.size} countries on MacrosMadeEz: ${names.slice(0, 8).join(", ")}${names.length > 8 ? "…" : ""} 🌍`;
      try {
        if (navigator.share) await navigator.share({ title: "My food passport", text, url: location.origin + location.pathname.replace(/kitchen\.html$/, "world.html") });
        else { await navigator.clipboard.writeText(text); $("#ppShare").textContent = "Copied!"; }
      } catch (e) { /* cancelled */ }
    };
  }

  onChange(() => { counts(); const t = location.hash.slice(1) || "saved"; if (t === "saved") renderSaved(); if (t === "grocery") renderGrocery(); });
  counts();
  show(location.hash.slice(1) || "saved");
  reveal();
})();
