/* Interactive orthographic globe (d3). Load after d3, topojson-client and common.js. */
(function () {
  const { DATA, esc, countryBy, isoToCountry, recipesIn } = MMEUI;

  let worldPromise;
  function loadWorld() {
    worldPromise ||= fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json")
      .then(r => r.json()).then(topo => topojson.feature(topo, topo.objects.countries).features);
    return worldPromise;
  }

  /**
   * Draw a globe into an <svg>.
   * opts: { interactive, zoomable, autoRotate, focusCode, highlightCode, onPick(country), tipEl }
   * Countries too small for the 110m map (Singapore, Malta…) get a dot marker from their "ll" [lon, lat].
   */
  async function globe(svgEl, opts = {}) {
    const features = await loadWorld();
    const svg = d3.select(svgEl);
    const box = () => svgEl.getBoundingClientRect();
    let { width, height } = box();
    let zoom = 1;
    const ZMIN = 1, ZMAX = 6;
    const baseScale = () => Math.min(width, height) / 2 - 6;
    const proj = d3.geoOrthographic().clipAngle(90).precision(.5);
    const path = d3.geoPath(proj);
    const fit = () => proj.scale(baseScale() * zoom).translate([width / 2, height / 2]);
    fit();
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();
    const g = svg.append("defs").append("radialGradient").attr("id", "oceanGrad").attr("cx", "38%").attr("cy", "32%").attr("r", "75%");
    g.append("stop").attr("offset", "0%").attr("stop-color", "#1f6f4a");
    g.append("stop").attr("offset", "100%").attr("stop-color", "#0b2c1d");
    const halo = svg.append("circle").attr("class", "halo");
    const ocean = svg.append("path").attr("class", "ocean").datum({ type: "Sphere" });
    const grat = svg.append("path").attr("class", "graticule").datum(d3.geoGraticule10());
    const has = f => isoToCountry[String(Number(f.id))];
    const hl = opts.highlightCode && countryBy[opts.highlightCode];
    const showHas = opts.interactive || opts.showHas;
    const stamps = new Set(opts.stampCodes || []);
    const lands = svg.append("g").selectAll("path").data(features).join("path")
      .attr("class", f => "land" + (showHas && has(f) ? " has" : "") + (hl && has(f) === hl ? " on" : "") + (has(f) && stamps.has(has(f).code) ? " stamped" : ""));
    const markers = svg.append("g").selectAll("circle").data(DATA.countries.filter(c => c.ll)).join("circle")
      .attr("class", c => "marker" + (showHas ? " has" : "") + (hl && c === hl ? " on" : "") + (stamps.has(c.code) ? " stamped" : "")).attr("r", 5.5);

    let moved = false;
    const showTip = (e, c) => {
      if (!opts.tipEl) return;
      const wrap = opts.tipEl.offsetParent.getBoundingClientRect();
      opts.tipEl.innerHTML = `${esc(c.name)}<small>${recipesIn(c.code).length} recipes · tap to open</small>`;
      opts.tipEl.style.left = (e.clientX - wrap.left) + "px";
      opts.tipEl.style.top = (e.clientY - wrap.top) + "px";
      opts.tipEl.classList.add("show");
    };
    if (opts.interactive) {
      const wire = (sel, getC) => sel
        .attr("tabindex", 0).attr("role", "link")
        .attr("aria-label", d => `${getC(d).name}, ${recipesIn(getC(d).code).length} recipes`)
        .on("click", (e, d) => { if (!moved) opts.onPick?.(getC(d)); })
        .on("keydown", (e, d) => { if (e.key === "Enter") opts.onPick?.(getC(d)); })
        .on("pointermove", (e, d) => showTip(e, getC(d)))
        .on("pointerleave", () => opts.tipEl?.classList.remove("show"));
      wire(lands.filter(f => has(f)), has);
      wire(markers, c => c);
    } else {
      markers.style("pointer-events", "none");
    }

    const center = () => { const r = proj.rotate(); return [-r[0], -r[1]]; };
    const draw = () => {
      halo.attr("cx", width / 2).attr("cy", height / 2).attr("r", proj.scale() + 10);
      ocean.attr("d", path); grat.attr("d", path); lands.attr("d", path);
      const ctr = center();
      markers.each(function (c) {
        const vis = d3.geoDistance(c.ll, ctr) < Math.PI / 2 - 0.05;
        const [x, y] = proj(c.ll);
        d3.select(this).attr("cx", x).attr("cy", y).style("display", vis ? null : "none");
      });
    };

    const coordsOf = code => {
      const c = countryBy[code]; if (!c) return null;
      if (c.ll) return c.ll;
      const f = features.find(f => Number(f.id) === Number(c.iso));
      return f ? d3.geoCentroid(f) : null;
    };
    let rot = [-10, -18, 0];
    const fc = opts.focusCode && coordsOf(opts.focusCode);
    if (fc) rot = [-fc[0], -fc[1], 0];
    proj.rotate(rot); draw();

    // Auto-rotate until the visitor touches it, then resume after a pause (only when zoomed out)
    let spinning = !!opts.autoRotate, last = performance.now(), idleTimer;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) spinning = false;
    const stopSpin = () => { spinning = false; clearTimeout(idleTimer); };
    const resumeLater = () => { if (opts.autoRotate && !reduce && zoom <= 1.05) idleTimer = setTimeout(() => spinning = true, 5000); };
    const tick = now => {
      if (spinning && document.visibilityState === "visible") {
        const r = proj.rotate(); proj.rotate([r[0] + (now - last) * 0.006, r[1], r[2]]); draw();
      }
      last = now; requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    const setZoom = (z, animate) => {
      z = Math.max(ZMIN, Math.min(ZMAX, z));
      if (!animate) { zoom = z; fit(); draw(); return; }
      const i = d3.interpolate(zoom, z);
      d3.transition().duration(450).ease(d3.easeCubicOut).tween("zoom", () => t => { zoom = i(t); fit(); draw(); });
    };

    if (opts.interactive) {
      let start, startRot;
      svg.call(d3.drag()
        .filter(e => !e.touches || e.touches.length === 1)
        .on("start", e => { stopSpin(); moved = false; start = [e.x, e.y]; startRot = proj.rotate(); opts.tipEl?.classList.remove("show"); })
        .on("drag", e => {
          if (Math.hypot(e.x - start[0], e.y - start[1]) > 4) moved = true;
          const k = 75 / proj.scale(); // slower when zoomed in so it stays controllable
          proj.rotate([startRot[0] + (e.x - start[0]) * k, Math.max(-80, Math.min(80, startRot[1] - (e.y - start[1]) * k)), 0]);
          draw();
        })
        .on("end", () => { resumeLater(); setTimeout(() => moved = false, 0); }));
      if (opts.zoomable) {
        svgEl.addEventListener("wheel", e => { e.preventDefault(); stopSpin(); setZoom(zoom * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
        let pinch0 = 0, zoom0 = 1;
        const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
        svgEl.addEventListener("touchstart", e => { if (e.touches.length === 2) { stopSpin(); pinch0 = dist(e.touches); zoom0 = zoom; } }, { passive: true });
        svgEl.addEventListener("touchmove", e => { if (e.touches.length === 2 && pinch0) { e.preventDefault(); setZoom(zoom0 * dist(e.touches) / pinch0); } }, { passive: false });
        svgEl.addEventListener("touchend", e => { if (e.touches.length < 2) pinch0 = 0; });
      }
    }
    addEventListener("resize", () => { ({ width, height } = box()); svg.attr("viewBox", `0 0 ${width} ${height}`); fit(); draw(); });

    function rotateTo(ll, z) {
      stopSpin();
      const from = proj.rotate(), to = [-ll[0], -ll[1], 0];
      while (to[0] - from[0] > 180) to[0] -= 360; // take the short way around
      while (to[0] - from[0] < -180) to[0] += 360;
      const ir = d3.interpolate(from, to), iz = d3.interpolate(zoom, z ?? zoom);
      d3.transition().duration(1100).ease(d3.easeCubicInOut).tween("rot", () => t => { proj.rotate(ir(t)); zoom = iz(t); fit(); draw(); });
    }
    function focus(code) {
      const ll = coordsOf(code); if (!ll) return;
      rotateTo(ll, Math.max(zoom, 2));
      const c = countryBy[code];
      lands.classed("hl", f => has(f) === c);
      markers.classed("hl", m => m === c);
    }
    return {
      focus, rotateTo,
      zoomIn: () => { stopSpin(); setZoom(zoom * 1.5, true); },
      zoomOut: () => setZoom(zoom / 1.5, true),
      reset: () => { rotateTo([10, 18], 1); lands.classed("hl", false); markers.classed("hl", false); },
    };
  }

  MMEUI.globe = globe;
})();
