/* Shared bits for every page: header, footer, cards, filters, reveal-on-scroll, globe drawing. */
(function () {
  const CFG = window.MME_CONFIG || { features: {}, social: {} };
  const DATA = window.MME || { countries: [], recipes: [] };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const ICON = {
    fork: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 2.5v6.2M10.3 2.5v6.2M13.7 2.5v6.2M17 2.5v6.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6.2 8.6h11.6l-4.3 3.9v8.6a1.5 1.5 0 0 1-3 0v-8.6z" fill="currentColor"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrowL: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8h16M4 16h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" stroke="currentColor" stroke-width="1.6"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 3c.4 2.2 1.8 3.7 4 3.9v3.2c-1.5.1-2.8-.3-4-1.1v6.2c0 3.9-3.3 6.3-6.7 5.6-4.4-.9-5.6-6.6-2-9.2 1.1-.8 2.5-1.1 3.9-.9v3.3c-.6-.2-1.3-.2-1.9.1-1.5.7-1.3 3 .4 3.4 1.3.3 2.6-.6 2.6-2.2V3z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    stamp: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"/><path d="m8 12.5 2.5 2.5L16 9.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    timer: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="2"/><path d="M12 9v4l2.5 2M9.5 2.5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    fridge: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2.5" stroke="currentColor" stroke-width="2"/><path d="M5 10h14M8.5 6v1.5M8.5 13v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15.1V8.9l5.2 3.1z"/></svg>',
  };

  const MEALS = [["all", "All"], ["breakfast", "Breakfast"], ["main", "Lunch & dinner"], ["smoothie", "Smoothies"], ["dessert", "Desserts"], ["snack", "Snacks"]];
  const DIETS = [["high-protein", "High protein"], ["vegetarian", "Vegetarian"], ["vegan", "Vegan"], ["gluten-free", "Gluten-free"]];
  const DIET_LABEL = { vegan: "Vegan", vegetarian: "Vegetarian", "gluten-free": "Gluten-free", "high-protein": "High protein" };
  const MEAL_LABEL = { breakfast: "Breakfast", main: "Lunch & dinner", dessert: "Dessert", snack: "Snack" };
  const HIGH_PROTEIN = 30; // grams per serving

  const countryBy = Object.fromEntries(DATA.countries.map(c => [c.code, c]));
  const isoToCountry = Object.fromEntries(DATA.countries.map(c => [String(Number(c.iso)), c]));
  const recipeById = Object.fromEntries(DATA.recipes.map(r => [r.id, r]));
  const recipesIn = code => DATA.recipes.filter(r => r.country === code);
  const tagsOf = r => (r.macros.p >= HIGH_PROTEIN ? ["high-protein"] : []).concat(r.diets);

  /* ---------- per-visitor storage (favorites, cooked stamps, week plan). Survives refreshes on this device. ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("mme-" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("mme-" + k, JSON.stringify(v)); } catch (e) { /* storage blocked: features still work for this visit */ } },
  };
  const listeners = new Set();
  const emit = () => listeners.forEach(f => f());
  const favs = {
    all: () => store.get("favs", []).filter(id => !DATA.recipes.length || recipeById[id]),
    has: id => store.get("favs", []).includes(id),
    toggle(id) { const a = store.get("favs", []); const i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.unshift(id); store.set("favs", a); emit(); return i < 0; },
  };
  const cooked = {
    all: () => store.get("cooked", {}),            // { recipeId: "2026-11-11" }
    has: id => !!store.get("cooked", {})[id],
    toggle(id) { const o = store.get("cooked", {}); if (o[id]) delete o[id]; else o[id] = new Date().toISOString().slice(0, 10); store.set("cooked", o); emit(); return !!o[id]; },
    countries() { const o = store.get("cooked", {}); return [...new Set(Object.keys(o).map(id => recipeById[id]?.country).filter(Boolean))]; },
  };
  // Amount parsing for scaling ("1 1/2 cups", "½ cup", "6 oz")
  const FRAC = { "½": .5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": .25, "¾": .75, "⅛": .125 };
  function parseAmt(a) {
    const m = String(a).trim().match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+|[½⅓⅔¼¾⅛])\s*(.*)$/);
    if (!m) return null;
    const q = m[1]; let n;
    if (FRAC[q]) n = FRAC[q];
    else if (q.includes(" ")) { const [w, f] = q.split(/\s+/); const [x, y] = f.split("/"); n = Number(w) + x / y; }
    else if (q.includes("/")) { const [x, y] = q.split("/"); n = x / y; }
    else n = Number(q);
    return { n, unit: m[2] };
  }
  function fmtQty(n) {
    const w = Math.floor(n + 1e-9), f = n - w;
    const fr = [[0, ""], [.125, "⅛"], [.25, "¼"], [1 / 3, "⅓"], [.5, "½"], [2 / 3, "⅔"], [.75, "¾"], [1, ""]]
      .reduce((a, b) => Math.abs(b[0] - f) < Math.abs(a[0] - f) ? b : a);
    const whole = fr[0] === 1 ? w + 1 : w;
    return (whole ? String(whole) : "") + (fr[1] ? (whole ? " " : "") + fr[1] : "") || "⅛";
  }
  const scaleAmt = (a, k) => { const p = parseAmt(a); return p && k !== 1 ? `${fmtQty(p.n * k)}${p.unit ? " " + p.unit : ""}` : a; };

  /* ---------- feature flags on <html> so CSS can show/hide pdf + ads ---------- */
  if (CFG.features?.pdfDownload) document.documentElement.classList.add("feature-pdf");
  if (CFG.features?.ads && CFG.ads?.adsenseClient) {
    document.documentElement.classList.add("feature-ads");
    const s = document.createElement("script");
    s.async = true; s.crossOrigin = "anonymous";
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(CFG.ads.adsenseClient);
    document.head.appendChild(s);
  }

  /* ---------- header + footer ---------- */
  function header(active) {
    const nav = [["recipes.html", "Recipes", "recipes"], ["world.html", "World kitchen", "world"], ["planner.html", "Meal builder", "planner"], ["fridge.html", "My fridge", "fridge"]];
    const social = s => CFG.social?.[s] ? `<a class="icon-btn" href="${CFG.social[s]}" target="_blank" rel="noopener" aria-label="MacrosMadeEz on ${s}">${ICON[s]}</a>` : "";
    const el = document.createElement("header");
    el.className = "site-header";
    el.innerHTML = `
      <a class="brand" href="index.html" aria-label="MacrosMadeEz home">
        <span class="brand-badge" style="color:var(--yellow)">${ICON.fork}</span>
        <span class="wordmark"><b>Macros</b> <span>Made Ez</span></span>
      </a>
      <nav class="explore" aria-label="Main">
        ${nav.map(([h, t, k]) => `<a href="${h}"${k === active ? ' aria-current="page"' : ""}>${t}</a>`).join("")}
      </nav>
      <div class="header-cta">
        <div class="social-mini">${social("tiktok")}${social("instagram")}${social("youtube")}</div>
        <a class="icon-btn kitchen-btn${active === "kitchen" ? " on" : ""}" href="kitchen.html" aria-label="My kitchen: saved recipes, week plan and passport">${ICON.heart}<span class="kc" hidden></span></a>
        <button class="icon-btn menu-btn" aria-label="Open menu" aria-expanded="false">${ICON.menu}</button>
      </div>`;
    document.body.prepend(el);
    const menu = document.createElement("div");
    menu.className = "mobile-menu"; menu.setAttribute("role", "dialog"); menu.setAttribute("aria-label", "Menu");
    menu.innerHTML = `<button class="icon-btn close" aria-label="Close menu">${ICON.close}</button>
      <a href="index.html">Home</a><a href="recipes.html">Our <span class="it">recipes</span></a><a href="world.html">World <span class="it">kitchen</span></a><a href="planner.html">Meal <span class="it">builder</span></a><a href="fridge.html">My <span class="it">fridge</span></a><a href="kitchen.html">My <span class="it">kitchen</span></a>
      <div class="socials">${social("tiktok")}${social("instagram")}${social("youtube")}</div>`;
    document.body.appendChild(menu);
    const kc = $(".kc", el);
    const badge = () => { const n = favs.all().length; kc.hidden = !n; kc.textContent = n; };
    badge(); listeners.add(badge);
    const btn = $(".menu-btn", el);
    const set = open => { menu.classList.toggle("open", open); btn.setAttribute("aria-expanded", open); document.body.style.overflow = open ? "hidden" : ""; };
    btn.onclick = () => set(true);
    $(".close", menu).onclick = () => set(false);
    // Hide header on scroll down, show on scroll up
    // (On pages with a sticky filter bar, keep the header out of the way once the bar is stuck.)
    let last = 0;
    addEventListener("scroll", () => {
      const y = scrollY;
      const bar = $(".filters");
      if (bar && bar.getBoundingClientRect().top <= 1) { el.classList.add("hide"); last = y; return; }
      el.classList.toggle("hide", y > 200 && y > last + 4);
      if (y < last - 4 || y < 200) el.classList.remove("hide");
      last = y;
    }, { passive: true });
  }

  function footer() {
    const el = document.createElement("footer");
    el.className = "site-footer";
    const s = CFG.social || {};
    el.innerHTML = `<div class="wrap">
      <div class="footer-top">
        <div><img class="footer-logo" src="img/brand/logo-green.webp" alt="MacrosMadeEz logo" width="130" height="130" loading="lazy">
          <p class="it">Real food.<br>Real macros.</p></div>
        <div><h4>Explore</h4><ul>
          <li><a href="recipes.html">Our recipes</a></li><li><a href="world.html">World kitchen</a></li><li><a href="planner.html">Macro meal builder</a></li><li><a href="fridge.html">What's in my fridge?</a></li><li><a href="kitchen.html">My kitchen &amp; passport</a></li>
          <li><a href="recipes.html?meal=breakfast">Breakfasts</a></li><li><a href="recipes.html?meal=smoothie">Smoothies</a></li><li><a href="recipes.html?meal=dessert">Desserts</a></li>
          <li><a href="#" aria-disabled="true">Recipe PDFs<span class="coming">Soon</span></a></li></ul></div>
        <div><h4>Follow</h4><ul>
          ${s.tiktok ? `<li><a href="${s.tiktok}" target="_blank" rel="noopener">TikTok</a></li>` : ""}
          ${s.instagram ? `<li><a href="${s.instagram}" target="_blank" rel="noopener">Instagram</a></li>` : ""}
          ${s.youtube ? `<li><a href="${s.youtube}" target="_blank" rel="noopener">YouTube</a></li>` : ""}
          ${CFG.email ? `<li><a href="mailto:${CFG.email}">${CFG.email}</a></li>` : ""}</ul></div>
      </div>
      ${CFG.newsletter?.action ? `<form class="newsletter" action="${esc(CFG.newsletter.action)}" method="post" target="_blank">
        <div><h4>Sunday recipes</h4><p>5 high-protein recipes in your inbox every week. Free, unsubscribe anytime.</p></div>
        <label class="sr-only" for="nlEmail">Email</label>
        <input id="nlEmail" type="email" name="${esc(CFG.newsletter.field || "email")}" placeholder="you@email.com" required>
        <button class="btn btn-yellow" type="submit">Sign me up</button></form>` : ""}
      <div class="footer-bottom"><span>© ${new Date().getFullYear()} MacrosMadeEz. Macros are per serving and approximate.</span><span>@macrosmadeez</span></div>
    </div>`;
    document.body.appendChild(el);
  }

  /* ---------- reveal on scroll ---------- */
  function reveal(root = document) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal, .draw", root).forEach(n => {
      // Anything already on screen at load animates in right away instead of waiting for the observer
      const b = n.getBoundingClientRect();
      if (b.top < innerHeight && b.bottom > 0) requestAnimationFrame(() => n.classList.add("in"));
      else io.observe(n);
    });
  }

  /* ---------- cards ---------- */
  const imgOrPh = (r, cls = "") => r.img
    ? `<img src="${r.img}" alt="${esc(r.name)}" loading="lazy" decoding="async" width="720" height="900"${cls}>`
    : `<div class="ph" style="color:var(--yellow)">${ICON.fork}</div>`;
  function card(r) {
    const c = countryBy[r.country];
    const badges = [];
    if (r.macros.p >= HIGH_PROTEIN) badges.push(`<span class="badge y">${r.macros.p}g protein</span>`);
    if (r.diets.includes("vegan")) badges.push(`<span class="badge">Vegan</span>`);
    else if (r.diets.includes("vegetarian")) badges.push(`<span class="badge">Vegetarian</span>`);
    if (r.diets.includes("gluten-free")) badges.push(`<span class="badge">GF</span>`);
    const src = r.src === "video" ? "MacrosMadeEz" : (c ? c.name : "World kitchen");
    return `<div class="card"><a class="card-link" href="recipe/${encodeURIComponent(r.id)}/">
      <div class="card-img">${imgOrPh(r)}<div class="card-badges">${badges.join("")}</div></div>
      <div class="card-body"><span class="card-src">${esc(src)}</span><h3 class="card-title">${esc(r.name)}</h3>
        <div class="card-meta"><span><b>${r.macros.cal}</b> cal</span><span class="p"><b>${r.macros.p}g</b> protein</span>${r.time ? `<span>${r.time} min</span>` : ""}</div></div>
    </a><button class="fav-btn" type="button" data-fav="${esc(r.id)}" aria-pressed="${favs.has(r.id)}" aria-label="Save ${esc(r.name)}">${ICON.heart}</button></div>`;
  }

  /* ---------- filter engine: meal (single) + diets (all must match) + search ---------- */
  function filterUI({ mount, list, grid, resultsEl, syncUrl = true, extraHTML = "", onChange }) {
    const params = new URLSearchParams(location.search);
    const state = { meal: params.get("meal") || "all", diets: new Set((params.get("diet") || "").split(",").filter(Boolean)), q: params.get("q") || "" };
    mount.innerHTML = `<div class="wrap">
      <div class="filter-row">
        <label class="search"><span class="sr-only">Search recipes</span>${ICON.search}<input type="search" placeholder="Search recipes or ingredients" value="${esc(state.q)}"></label>
        ${extraHTML}
      </div>
      <div class="filter-row meal-row" role="group" aria-label="Meal">${MEALS.map(([k, t]) => `<button class="chip" data-meal="${k}" aria-pressed="${state.meal === k}">${t}<span class="count"></span></button>`).join("")}</div>
      <div class="filter-row" role="group" aria-label="Diet"><span class="filter-label">Diet</span>${DIETS.map(([k, t]) => `<button class="chip diet" data-diet="${k}" aria-pressed="${state.diets.has(k)}">${t}</button>`).join("")}</div>
    </div>`;
    const input = $("input", mount);
    const matches = (r, ignoreMeal) => {
      if (!ignoreMeal && state.meal !== "all" && r.meal !== state.meal) return false;
      const t = tagsOf(r);
      for (const d of state.diets) if (!t.includes(d)) return false;
      if (state.q) {
        const hay = (r.name + " " + r.blurb + " " + r.ingredients.map(i => i.label).join(" ") + " " + (countryBy[r.country]?.name || "")).toLowerCase();
        if (!state.q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false;
      }
      return true;
    };
    function render() {
      const items = list().filter(r => matches(r));
      $$(".chip[data-meal]", mount).forEach(b => {
        b.setAttribute("aria-pressed", b.dataset.meal === state.meal);
        const n = list().filter(r => matches(r, true) && (b.dataset.meal === "all" || r.meal === b.dataset.meal)).length;
        $(".count", b).textContent = n;
      });
      $$(".chip[data-diet]", mount).forEach(b => b.setAttribute("aria-pressed", state.diets.has(b.dataset.diet)));
      const adEvery = CFG.features?.ads ? 8 : 0;
      grid.innerHTML = items.length
        ? items.map((r, i) => card(r) + (adEvery && (i + 1) % adEvery === 0 ? '<div class="ad-slot in-grid" aria-hidden="true"></div>' : "")).join("")
        : `<div class="empty" style="grid-column:1/-1"><p class="h3">Nothing matches those filters yet.</p><p>Try removing a filter. <button class="clear-btn" data-clear>Clear all filters</button></p></div>`;
      const filtered = state.meal !== "all" || state.diets.size || state.q;
      resultsEl.innerHTML = `<span>${items.length} recipe${items.length === 1 ? "" : "s"}</span>${filtered ? '<button class="clear-btn" data-clear>Clear filters</button>' : ""}`;
      $$("[data-clear]").forEach(b => b.onclick = () => { state.meal = "all"; state.diets.clear(); state.q = ""; input.value = ""; render(); });
      if (syncUrl) {
        const p = new URLSearchParams(location.search);
        state.meal !== "all" ? p.set("meal", state.meal) : p.delete("meal");
        state.diets.size ? p.set("diet", [...state.diets].join(",")) : p.delete("diet");
        state.q ? p.set("q", state.q) : p.delete("q");
        history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
      }
      onChange?.(items);
    }
    mount.addEventListener("click", e => {
      const m = e.target.closest("[data-meal]"), d = e.target.closest("[data-diet]");
      if (m) { state.meal = m.dataset.meal; render(); }
      if (d) { const k = d.dataset.diet; state.diets.has(k) ? state.diets.delete(k) : state.diets.add(k); render(); }
    });
    let t; input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { state.q = input.value.trim(); render(); }, 120); });
    render();
    return { render, state };
  }

  function syncFavButtons(root = document) {
    $$("[data-fav]", root).forEach(b => b.setAttribute("aria-pressed", favs.has(b.dataset.fav)));
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-fav]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const on = favs.toggle(b.dataset.fav);
    $$(`[data-fav="${CSS.escape(b.dataset.fav)}"]`).forEach(x => x.setAttribute("aria-pressed", on));
    b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
  });
  document.addEventListener("DOMContentLoaded", () => syncFavButtons());
  syncFavButtons();
  listeners.add(() => syncFavButtons());

  window.MMEUI = { CFG, DATA, ICON, $, $$, esc, card, header, footer, reveal, filterUI, countryBy, isoToCountry, recipeById, recipesIn, tagsOf, DIET_LABEL, MEAL_LABEL, HIGH_PROTEIN, imgOrPh, store, favs, cooked, onChange: f => listeners.add(f), parseAmt, fmtQty, scaleAmt, syncFavButtons };
})();
