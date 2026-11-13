/* What's in my fridge? Rank recipes by how many of their (non-pantry) ingredients you already have. */
(function () {
  const { DATA, $, $$, esc, card, header, footer, reveal, store } = MMEUI;
  header("fridge"); footer();

  const QUICK = ["chicken", "eggs", "ground beef", "salmon", "shrimp", "tofu", "greek yogurt", "cottage cheese", "rice", "oats",
    "chickpeas", "black beans", "lentils", "spinach", "sweet potato", "tomato", "onion", "bell pepper", "avocado", "cheese"];
  const PANTRY = /\b(garlic|ginger|lemon juice|salt|pepper flakes|black pepper|water|oil|olive oil|spice|spices|cumin|paprika|turmeric|cinnamon|chili flakes|oregano|thyme|garam masala|curry powder|seasoning|baking powder|cornstarch|vinegar|sugar|honey|broth|stock|bay leaf|bay leaves|nutmeg|allspice|cardamom|cloves|herbs)\b/;
  const norm = s => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/,.*$/, "").replace(/[^a-z\s&+-]/g, " ").replace(/\s+/g, " ").trim();
  const sing = w => w.replace(/(oes|ies|s)$/, m => m === "ies" ? "y" : m === "oes" ? "o" : "");
  const words = s => norm(s).split(/[\s&+-]+/).filter(w => w.length > 2).map(sing);

  // Ingredient "parts": "Tomato & onion" counts as two things you might have
  const partsOf = label => norm(label).split(/\s*(?:&|\+|\band\b|,)\s*/).filter(Boolean);
  const index = DATA.recipes.map(r => {
    const parts = r.ingredients.flatMap(i => partsOf(i.label)).filter(p => !PANTRY.test(p));
    return { r, parts };
  });

  let have = store.get("fridge", []);
  const input = $("#fridgeIn");

  // Autocomplete from every ingredient on the site
  const vocab = [...new Set(index.flatMap(x => x.parts).filter(p => p.length < 28))].sort();
  $("#ingList").innerHTML = vocab.map(v => `<option value="${esc(v)}">`).join("");
  $("#quick").innerHTML = QUICK.map(q => `<button type="button" class="chip" data-q="${q}">+ ${q}</button>`).join("");

  const matches = (part, item) => {
    const pw = words(part), iw = words(item);
    return iw.length && iw.every(w => pw.some(p => p === w || p.startsWith(w) || w.startsWith(p) && p.length > 3));
  };
  function add(v) {
    v = norm(v); if (!v || have.includes(v)) return;
    have.push(v); store.set("fridge", have); render();
  }
  function render() {
    $("#chipsIn").innerHTML = have.map((h, i) => `<span class="ichip">${esc(h)}<button type="button" data-rm="${i}" aria-label="Remove ${esc(h)}">×</button></span>`).join("");
    $$("[data-q]").forEach(b => b.hidden = have.includes(b.dataset.q));
    const diets = $$('input[name="fd"]:checked').map(i => i.value);
    const almost = $("#almost").checked;
    if (!have.length) {
      $("#fridgeResults").innerHTML = "";
      $("#fridgeGrid").innerHTML = `<div class="empty" style="grid-column:1/-1"><p class="h3">Your fridge is empty (on here, anyway).</p><p>Add a few ingredients above or tap a quick-add.</p></div>`;
      return;
    }
    const scored = index.map(({ r, parts }) => {
      const got = parts.filter(p => have.some(h => matches(p, h)));
      const missing = parts.filter(p => !got.includes(p));
      return { r, got, missing, score: parts.length ? got.length / parts.length : 0 };
    }).filter(x => x.got.length && diets.every(d => x.r.diets.includes(d)) && (!almost || x.missing.length <= 1))
      .sort((a, b) => b.score - a.score || b.got.length - a.got.length || b.r.macros.p - a.r.macros.p)
      .slice(0, 60);
    $("#fridgeResults").innerHTML = `<span>${scored.length ? `${scored.length}${scored.length === 60 ? "+" : ""} recipes you can make or almost make` : "No matches yet. Try adding a protein like chicken, eggs or tofu."}</span>`;
    $("#fridgeGrid").innerHTML = scored.map(x => {
      const pct = Math.round(x.score * 100);
      const note = x.missing.length ? `Missing: ${x.missing.slice(0, 3).map(esc).join(", ")}${x.missing.length > 3 ? "…" : ""}` : "You have everything!";
      return `<div class="fridge-card">${card(x.r)}<div class="have-bar"><div class="hb-top"><b>${x.got.length}/${x.got.length + x.missing.length}</b> ingredients <span>${pct}%</span></div>
        <div class="track"><i style="width:${pct}%"></i></div><p class="${x.missing.length ? "" : "all"}">${note}</p></div></div>`;
    }).join("");
  }
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input.value); input.value = ""; }
    if (e.key === "Backspace" && !input.value && have.length) { have.pop(); store.set("fridge", have); render(); }
  });
  input.addEventListener("change", () => { if (vocab.includes(input.value)) { add(input.value); input.value = ""; } });
  $("#chipsIn").addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (b) { have.splice(Number(b.dataset.rm), 1); store.set("fridge", have); render(); } });
  $("#quick").addEventListener("click", e => { const b = e.target.closest("[data-q]"); if (b) add(b.dataset.q); });
  $$(".fridge-opts input").forEach(i => i.onchange = render);
  MMEUI.fridgeAdd = add; // used by the photo scanner
  $("#clearFridge").onclick = () => { have = []; store.set("fridge", have); render(); };
  render();
  reveal();
})();
