/* Country page: filters + mini globe on top of the pre-rendered recipe grid (tools/build_pages.py). */
(function () {
  const { DATA, $, esc, header, footer, filterUI, globe, countryBy, recipesIn } = MMEUI;
  header("world"); footer();
  const c = countryBy[document.body.dataset.country];
  if (!c) return;
  filterUI({ mount: $("#filters"), grid: $("#grid"), resultsEl: $("#results"), list: () => recipesIn(c.code) });
  globe($("#mini"), { focusCode: c.code, highlightCode: c.code, interactive: false }).catch(() => $("#mini")?.remove());
  // Suggest other countries, same region first (shuffled so it changes each visit)
  const others = DATA.countries.filter(x => x.code !== c.code).sort(() => Math.random() - .5)
    .sort((a, b) => (b.region === c.region) - (a.region === c.region)).slice(0, 4);
  $("#next").innerHTML = others.map(x => `<a class="btn btn-ghost btn-sm" href="country/${x.code}/">${esc(x.name)}</a>`).join("")
    + `<a class="btn btn-green btn-sm" href="world.html">Back to the globe</a>`;
})();
