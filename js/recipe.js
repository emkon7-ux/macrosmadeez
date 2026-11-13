/* Recipe page interactions. The content itself is pre-rendered by tools/build_pages.py (good for Google). */
(function () {
  const { $, $$, esc, header, footer, CFG, cooked, store, scaleAmt, ICON } = MMEUI;
  header(); footer();
  const B = document.body.dataset;
  const id = B.recipe;
  const name = $(".recipe-title")?.textContent || document.title;
  const macros = { cal: +B.cal, p: +B.p, c: +B.c, f: +B.f };

  // Macro bars animate in
  requestAnimationFrame(() => setTimeout(() => $$(".mbar i").forEach(i => i.style.width = i.dataset.w + "%"), 200));
  // Tap ingredients to check them off
  $$(".ing").forEach(li => {
    const t = () => li.classList.toggle("done");
    li.onclick = t;
    li.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); t(); } };
  });
  const tk = $('[data-social="tiktok"]'); if (tk && CFG.social?.tiktok) tk.href = CFG.social.tiktok;
  $("#pdfBtn")?.addEventListener("click", () => window.print());
  $("#shareBtn")?.addEventListener("click", async () => {
    try {
      if (navigator.share) await navigator.share({ title: name, url: location.href });
      else { await navigator.clipboard.writeText(location.href); $("#shareBtn").textContent = "Link copied!"; }
    } catch (e) { /* share cancelled */ }
  });

  /* ---------- serving scaler ---------- */
  let servings = 1;
  const renderServings = () => {
    $("#srvN").textContent = servings === 1 ? "1 serving" : `${servings} servings`;
    $$("[data-amt]").forEach(b => b.textContent = scaleAmt(b.dataset.amt, servings));
    const t = $("#srvTotal");
    t.hidden = servings === 1;
    t.textContent = `Makes ${servings} servings · total ${macros.cal * servings} cal, ${macros.p * servings}g protein (macros above are per serving)`;
  };
  $$("[data-srv]").forEach(b => b.onclick = () => { servings = Math.max(1, Math.min(8, servings + Number(b.dataset.srv))); renderServings(); });

  /* ---------- I cooked this (passport stamp) ---------- */
  const cookedBtn = $("#cookedBtn");
  const setCooked = () => {
    const on = cooked.has(id);
    cookedBtn.setAttribute("aria-pressed", on);
    cookedBtn.innerHTML = on ? `${ICON.stamp}<span>Cooked · stamped</span>` : `${ICON.stamp}<span>I cooked this</span>`;
  };
  cookedBtn.onclick = () => {
    const on = cooked.toggle(id); setCooked();
    if (on) toast(B.country ? "Passport stamped! See it in My kitchen." : "Nice! Saved to your cooked list.", "kitchen.html#passport");
  };
  setCooked();

  /* ---------- add to my week ---------- */
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  $("#weekBtn").onclick = e => {
    let pop = $(".week-pop");
    if (pop) { pop.remove(); return; }
    pop = document.createElement("div");
    pop.className = "week-pop";
    pop.innerHTML = `<p>Add to which day?</p><div>${DAYS.map(d => `<button type="button" data-day="${d}">${d}</button>`).join("")}</div>`;
    e.currentTarget.after(pop);
    pop.onclick = ev => {
      const d = ev.target.closest("[data-day]")?.dataset.day; if (!d) return;
      const w = store.get("week", {}); (w[d] ||= []).push(id); store.set("week", w);
      pop.remove(); toast(`Added to ${d}. Your week is in My kitchen.`, "kitchen.html#week");
    };
  };

  /* ---------- toast ---------- */
  function toast(msg, href) {
    $(".toast")?.remove();
    const t = document.createElement("div");
    t.className = "toast"; t.setAttribute("role", "status");
    t.innerHTML = `<span>${esc(msg)}</span>${href ? `<a href="${href}">Open</a>` : ""}`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 3800);
  }

  /* ---------- cook mode: big steps, keeps the screen awake, built-in timers ---------- */
  const steps = $$(".steps li p").map(p => p.textContent.trim());
  const ings = $$(".ing").map(li => `${li.querySelector("[data-amt]")?.textContent || ""} ${li.querySelector("span")?.textContent || ""}`.trim());
  const minutesIn = txt => {
    const m = txt.match(/(\d+)(?:\s*(?:to|-|–)\s*(\d+))?\s*(minutes?|mins?|hours?|hrs?)\b/i);
    if (!m) return 0;
    const n = Number(m[2] || m[1]);
    return /h/i.test(m[3]) ? n * 60 : n;
  };
  let wake = null, idx = 0, timer = null, remaining = 0;
  const overlay = document.createElement("div");
  overlay.className = "cook-mode"; overlay.hidden = true;
  overlay.setAttribute("role", "dialog"); overlay.setAttribute("aria-label", "Cook mode");
  document.body.appendChild(overlay);
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  function drawCook() {
    const total = steps.length + 1; // screen 0 = ingredients
    const onIng = idx === 0;
    const mins = onIng ? 0 : minutesIn(steps[idx - 1]);
    overlay.innerHTML = `
      <div class="cm-top"><span class="cm-name">${esc(name)}</span><button class="icon-btn" data-cm="close" aria-label="Exit cook mode">${ICON.close}</button></div>
      <div class="cm-progress"><i style="width:${(idx + 1) / total * 100}%"></i></div>
      <div class="cm-body">
        ${onIng ? `<span class="cm-kicker">Get ready · ${servings === 1 ? "1 serving" : servings + " servings"}</span><h2>Gather your ingredients</h2>
          <ul class="cm-ings">${ings.map(i => `<li><label><input type="checkbox"><span>${esc(i)}</span></label></li>`).join("")}</ul>`
        : `<span class="cm-kicker">Step ${idx} of ${steps.length}</span><h2>${esc(steps[idx - 1])}</h2>
          ${mins ? `<div class="cm-timer"><button class="btn btn-yellow" data-cm="timer" data-min="${mins}">${ICON.timer} ${timer ? "Stop timer" : `Start ${mins}-min timer`}</button><b id="cmClock">${timer ? fmt(remaining) : ""}</b></div>` : ""}`}
      </div>
      <div class="cm-nav">
        <button class="btn btn-ghost" data-cm="prev" ${idx === 0 ? "disabled" : ""}>Back</button>
        ${idx < total - 1 ? `<button class="btn btn-yellow" data-cm="next">${onIng ? "Start cooking" : "Next step"}</button>`
          : `<button class="btn btn-yellow" data-cm="done">Done! Stamp it</button>`}
      </div>
      <p class="cm-hint">Tip: use ← → keys or swipe. Your screen stays on while cooking.</p>`;
  }
  async function openCook() {
    idx = 0; overlay.hidden = false; document.body.style.overflow = "hidden"; drawCook();
    try { wake = await navigator.wakeLock?.request("screen"); } catch (e) { /* not supported */ }
  }
  function closeCook() {
    overlay.hidden = true; document.body.style.overflow = "";
    clearInterval(timer); timer = null;
    try { wake?.release(); } catch (e) { /* ignore */ } wake = null;
  }
  const go = d => { idx = Math.max(0, Math.min(steps.length, idx + d)); drawCook(); };
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, .35, .7].forEach(t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(.2, ctx.currentTime + t); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + .2); });
    } catch (e) { /* no audio */ }
    navigator.vibrate?.([200, 100, 200]);
  }
  overlay.addEventListener("click", e => {
    const a = e.target.closest("[data-cm]")?.dataset.cm; if (!a) return;
    if (a === "close") closeCook();
    if (a === "next") go(1);
    if (a === "prev") go(-1);
    if (a === "done") { if (!cooked.has(id)) cooked.toggle(id); setCooked(); closeCook(); toast("Done and stamped! Enjoy.", "kitchen.html#passport"); }
    if (a === "timer") {
      if (timer) { clearInterval(timer); timer = null; drawCook(); return; }
      remaining = Number(e.target.closest("[data-min]").dataset.min) * 60;
      timer = setInterval(() => {
        remaining--; const c = $("#cmClock"); if (c) c.textContent = fmt(remaining);
        if (remaining <= 0) { clearInterval(timer); timer = null; beep(); if (c) c.textContent = "Time!"; }
      }, 1000);
      drawCook();
    }
  });
  addEventListener("keydown", e => {
    if (overlay.hidden) return;
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "Escape") closeCook();
  });
  let sx = null;
  overlay.addEventListener("touchstart", e => sx = e.touches[0].clientX, { passive: true });
  overlay.addEventListener("touchend", e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); sx = null; });
  document.addEventListener("visibilitychange", async () => { if (!overlay.hidden && document.visibilityState === "visible") { try { wake = await navigator.wakeLock?.request("screen"); } catch (e) { /* ignore */ } } });
  $("#cookBtn").onclick = openCook;
})();
