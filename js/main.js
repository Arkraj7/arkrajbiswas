/* ============================================================
   Arkraj Biswas — Editorial Studio
   Modules: theme → drawer → progress/reveal → research index
   → modal → contact. Preserved hooks: #themeToggle, #hamburger,
   #navLinks, .filter-btn, #researchGrid, #searchInput, modal ids,
   POSTS (categories climate | environment | agriculture).
   Only verified content — no invented abstracts or findings.
   ============================================================ */

/* ---------- Theme (day / night, persisted) ---------- */
(function initTheme() {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem("ab-theme"); } catch (e) { /* private mode */ }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme", saved || (prefersDark ? "dark" : "light"));
  document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("themeToggle");
    if (el) el.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("ab-theme", next); } catch (e) { /* ignore */ }
    });
  });
})();

/* ---------- Research entries (verified only) ----------
   Groups: "current" | "projects" | "writing". Where only a title is
   known, the body says so — nothing is invented. Keep `category` to
   climate | environment | agriculture so filters keep working. */
const PLACEHOLDER_BODY = "<p>Detailed project information will be added here.</p>";

const POSTS = [
  {
    id: "bio-inequity",
    group: "current",
    category: "justice",
    title: "Systemic Bio-Inequity in India: Exploring the Biodiversity–Poverty Paradox",
    summary: "Independent India-focused inquiry into biodiversity, poverty and the distribution of benefits from nature.",
    meta: "Ongoing inquiry · Environmental justice",
    year: "", location: "India", methods: "", status: "Ongoing inquiry", kind: "Independent Research Note",
    overview: "An independent inquiry into why ecological wealth can exist alongside poverty — and what that gap means for conservation finance, governance and policy in India.",
    page: "projects/bio-inequity.html"
  },
  {
    id: "urban-forestry-framework",
    group: "current",
    category: "environment",
    title: "Strategic Framework for Human-Centric Urban Forestry: Evaluating Socio-Economic, Psychological, and Governance Outcomes of the Nagar Van Yojana",
    summary: "Ongoing National CAMPA research — GIS-based audits, socio-economic surveys, psychological well-being assessments, climate resilience, community well-being, participatory governance and a monitoring framework.",
    meta: "Ongoing · National CAMPA",
    year: "", location: "", methods: "GIS-based audits · Socio-economic surveys · Well-being assessments", status: "Ongoing", kind: "Current Research",
    overview: "Ongoing National CAMPA research evaluating the socio-economic, psychological and governance outcomes of the Nagar Van Yojana.",
    objectives: "Evaluate socio-economic, psychological and governance outcomes and develop a monitoring framework, bringing together GIS-based audits, socio-economic surveys, psychological well-being assessments, climate resilience, community well-being and participatory governance.",
    role: "Research Associate, National CAMPA"
  },
  {
    id: "nagar-van-benefits",
    group: "projects",
    category: "environment",
    title: "Socio-Economic, Cultural & Ecological Benefits — Nagar Van Yojana",
    summary: "Assessing the socio-economic, livelihood, socio-cultural, ecological and climatic benefits of the Nagar Van Yojana through an integrated multi-analysis methodological framework.",
    meta: "Jan–Jun 2025 · Urban forestry",
    year: "2025", location: "", methods: "Integrated multi-analysis methodological framework", status: "Jan–Jun 2025", kind: "Project",
    overview: "Assessing the socio-economic, livelihood, socio-cultural, ecological and climatic benefits of the Nagar Van Yojana through an integrated multi-analysis methodological framework.",
    page: "projects/nagar-van-assessment.html"
  },
  {
    id: "bengaluru-uhi",
    group: "projects",
    category: "climate",
    title: "Bengaluru: Urban Heat, Green Spaces and Urban Development",
    subtitle: "Spatiotemporal Assessment of Urban Green Space Dynamics and Their Mitigating Influence on Urban Heat Island: A Decadal Study of Bengaluru",
    summary: "M.Sc. dissertation examining Bengaluru's land-surface temperature, vegetation, built-up patterns and green-space configuration across April 2014, 2019 and 2024.",
    meta: "M.Sc. dissertation · 2025 · Bengaluru",
    year: "2025", location: "Bengaluru", methods: "Landsat-based LST, NDVI, NDBI and GSI analysis · Landscape metrics · Moran's I · CCDM", status: "2025", kind: "M.Sc. Dissertation",
    overview: "M.Sc. dissertation examining how Bengaluru's thermal environment and urban green spaces changed over a decade, comparing April observations from 2014, 2019 and 2024. The study combines remote sensing with landscape metrics and spatial statistical techniques to investigate how urban green-space configuration relates to the city's thermal environment, without treating all green spaces as interchangeable.",
    page: "projects/bengaluru-urban-heat.html"
  },
  {
    id: "enhancing-urban-forestry",
    group: "briefs",
    category: "environment",
    title: "Enhancing Urban Forestry: Field Evidence and Implementation Recommendations for the Nagar Van Yojana",
    summary: "Based on fieldwork across 14 Nagar Van and Nagar Vatika sites in Uttar Pradesh, Madhya Pradesh and Rajasthan, this policy brief examines maintenance funding, irrigation, staffing, visitor experience, community participation and local revenue mechanisms.",
    meta: "SSRN Working Paper · September 2026",
    year: "2026", location: "", methods: "106 visitor surveys · 15 key-informant interviews · 14 focus-group discussions · Field observations and PRA transect walks", status: "SSRN Working Paper", kind: "Policy Brief",
    overview: "Based on fieldwork across 14 Nagar Van and Nagar Vatika sites in Uttar Pradesh, Madhya Pradesh and Rajasthan, this policy brief examines maintenance funding, irrigation, staffing, visitor experience, community participation and local revenue mechanisms. It proposes a phased approach to more reliable maintenance funding and locally appropriate community participation. The assessment covers selected sites during a defined fieldwork period and should not be treated as a nationally representative evaluation.",
    publication: "SSRN Working Paper", date: "Written 16 August 2026 · Posted 11 September 2026",
    url: "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7415140",
    doi: "https://doi.org/10.2139/ssrn.7415140",
    page: "projects/nagar-van-assessment.html"
  },
  {
    id: "etawah-design",
    group: "articles",
    category: "environment",
    title: "The Etawah design: An 123-acre urban forest as its lungs",
    summary: "An account of Etawah Nagar Van as urban infrastructure, examining solar-powered facilities, water management, native planting and community participation, along with access, local livelihoods and long-term ecological performance.",
    meta: "Question of Cities · 4 September 2026",
    year: "2026", location: "", methods: "", status: "Published Article", kind: "Article",
    overview: "An account of Etawah Nagar Van as urban infrastructure, examining solar-powered facilities, water management, native planting and community participation, along with the questions of access, local livelihoods and long-term ecological performance.",
    publication: "Question of Cities", date: "4 September 2026",
    url: "https://questionofcities.org/the-etawah-design-an-123-acre-urban-forest-as-its-lungs/"
  },
  {
    id: "forest-zodiac",
    group: "articles",
    category: "environment",
    title: "When a Forest Knows Your Zodiac Sign",
    summary: "This opinion piece looks at Nagar Van Naulakhi in Ujjain and the City Forest in Sagar to explore how culturally themed gardens and local identity can strengthen people's connection with urban forests.",
    meta: "CSR Times · August 2026, pp. 60–61",
    year: "2026", location: "", methods: "", status: "Opinion", kind: "Opinion",
    overview: "This opinion piece looks at Nagar Van Naulakhi in Ujjain and the City Forest in Sagar to explore how culturally themed gardens and local identity can strengthen people's connection with urban forests. It considers how public access, environmental learning and community use can help make green spaces meaningful beyond plantation activity.",
    publication: "CSR Times", date: "August 2026, pp. 60–61 · Opinion",
    url: "https://csrtimes.org/when-a-forest-knows-your-zodiac-sign/"
  },
  {
    id: "reimagining-ugs",
    group: "articles",
    category: "environment",
    title: "Reimagining Urban Green Spaces as Fundamental Infrastructure in a Warming India",
    meta: "Blog / Article",
    year: "", location: "", methods: "", status: "Blog / Article", kind: "Blog / Article"
  },
  {
    id: "india-counts-trees",
    group: "articles",
    category: "environment",
    title: "India Counts Trees, Not Shade",
    meta: "Article / Commentary",
    year: "", location: "", methods: "", status: "Article", kind: "Commentary",
    overview: "This commentary argues that urban-forestry programmes should look beyond the number of saplings planted. Tree survival, canopy development, long-term maintenance and local cooling outcomes are more meaningful ways to evaluate whether green infrastructure is delivering lasting benefits. It also raises the question of whether planting and maintenance priorities reflect the heat burdens experienced by surrounding communities.",
    note: "Article / Commentary · Publication details to be confirmed."
  },
  {
    id: "etawah-field-evidence",
    group: "briefs",
    category: "environment",
    title: "Etawah Nagar Van: Field Evidence on Urban Forestry, Community Use and Climate-Resilient Infrastructure in Uttar Pradesh",
    summary: "This case study examines Etawah Nagar Van using field assessments, visitor and vendor surveys, interviews, focus-group discussions, participatory transect walks and geospatial/administrative validation.",
    meta: "SSRN Working Paper · September 2026",
    year: "2026", location: "Uttar Pradesh", methods: "", status: "SSRN Working Paper", kind: "Research Case Study",
    overview: "This case study examines Etawah Nagar Van using field assessments, visitor and vendor surveys, interviews, focus-group discussions, participatory transect walks and geospatial/administrative validation. It discusses how urban forestry, public use, water management, low-carbon infrastructure, local livelihoods and community governance operate together at the site.",
    publication: "SSRN Working Paper", date: "Written 14 September 2026 · Posted 16 September 2026",
    url: "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7460046",
    doi: "https://doi.org/10.2139/ssrn.7460046"
  }
];

const FEATURED_ID = "urban-forestry-framework";
const HOME_PICKS = ["nagar-van-benefits", "bengaluru-uhi"];

/* ---------- Shared UI ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  initDrawer();
  initProgress();
  initReveal();
  initLightbox();
  initHomeLists();
  initResearchPage();
  initContactForm();
});

/* ----- Drawer (keeps #hamburger + #navLinks ids) ----- */
function initDrawer() {
  const burger = document.getElementById("hamburger");
  const drawer = document.getElementById("navLinks");
  const scrim = document.getElementById("scrim");
  if (!burger || !drawer) return;
  const setOpen = (open) => {
    drawer.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      const first = drawer.querySelector("a");
      if (first) first.focus({ preventScroll: true });
    } else {
      burger.focus({ preventScroll: true });
    }
  };
  const isOpen = () => drawer.classList.contains("open");
  burger.addEventListener("click", () => setOpen(!isOpen()));
  if (scrim) scrim.addEventListener("click", () => setOpen(false));
  drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen()) setOpen(false); });
}

/* ----- Scroll progress ----- */
function initProgress() {
  const bar = document.getElementById("progressBar");
  if (!bar) return;
  const onScroll = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ----- Reveal on scroll ----- */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
    }),
    { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
  );
  els.forEach((el) => io.observe(el));
}

/* ---------- Home: selected rows (from POSTS, minus featured) ---------- */
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function metaLine(p) {
  return [p.location, p.methods].filter(Boolean).join(" — ");
}

function initHomeLists() {
  const rows = document.getElementById("selectedRows");
  if (!rows) return;
  const picks = HOME_PICKS.map((id) => POSTS.find((p) => p.id === id)).filter(Boolean);
  rows.innerHTML = picks.map((p) => `
    <a class="index-row" href="research.html" data-open-note="${esc(p.id)}" style="text-decoration:none;color:inherit">
      <span class="i-year">${esc(p.year || p.status || "")}</span>
      <span><h4>${esc(p.title)}</h4>${metaLine(p) ? `<p class="i-sub">${esc(metaLine(p))}</p>` : ""}</span>
      <span class="i-side"><span class="tag tag-${esc(p.category)}">${esc(p.category)}</span><span class="i-open">Open <span class="arr">→</span></span></span>
    </a>`).join("");
  bindNoteLinks(rows);
}

/* Cross-page note opening: store id, archive page opens the modal */
function bindNoteLinks(scope) {
  scope.querySelectorAll("[data-open-note]").forEach((a) => {
    a.addEventListener("click", () => {
      try { sessionStorage.setItem("ab-open-note", a.dataset.openNote); } catch (e) { /* ignore */ }
    });
  });
}

/* ---------- Research archive (static rows enhanced by JS) ---------- */
let activeFilter = "all";
let query = "";

function initResearchPage() {
  const grid = document.getElementById("researchGrid");
  initModal();
  if (!grid) return;

  if (location.hash.startsWith("#filter-")) {
    const f = location.hash.replace("#filter-", "");
    if (["all", "climate", "environment", "justice"].includes(f)) activeFilter = f;
    document.querySelectorAll(".filter-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.filter === activeFilter)
    );
  }

  document.querySelectorAll(".filter-btn").forEach((b) =>
    b.addEventListener("click", () => {
      activeFilter = b.dataset.filter;
      document.querySelectorAll(".filter-btn").forEach((x) => x.classList.toggle("active", x === b));
      applyArchiveFilter();
    })
  );

  const search = document.getElementById("searchInput");
  if (search) search.addEventListener("input", () => {
    query = search.value.toLowerCase().trim();
    applyArchiveFilter();
  });

  const reset = document.getElementById("resetFilters");
  if (reset) reset.addEventListener("click", () => {
    activeFilter = "all"; query = "";
    if (search) search.value = "";
    document.querySelectorAll(".filter-btn").forEach((x) =>
      x.classList.toggle("active", x.dataset.filter === "all"));
    applyArchiveFilter();
  });

  bindArchiveRows(grid);
  applyArchiveFilter();
}

function rowMatches(row) {
  const okCat = activeFilter === "all" || row.dataset.cat === activeFilter;
  const hay = ((row.dataset.text || "") + " " + (row.textContent || "")).toLowerCase();
  return okCat && (!query || hay.includes(query));
}

function bindArchiveRows(grid) {
  grid.querySelectorAll(".index-row[data-id]").forEach((row) => {
    row.classList.add("reveal", "visible");
    row.addEventListener("click", () => openModal(row.dataset.id));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(row.dataset.id); }
    });
  });
}

function applyArchiveFilter() {
  const grid = document.getElementById("researchGrid");
  if (!grid) return;
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("resultCount");
  const archiveCount = document.getElementById("archiveCount");
  const rows = Array.from(grid.querySelectorAll(".index-row[data-id]"));
  let shown = 0;
  rows.forEach((row) => {
    const vis = rowMatches(row);
    row.hidden = !vis;
    if (vis) shown++;
  });
  grid.querySelectorAll("[data-group-list]").forEach((list) => {
    const anyVisible = Array.from(list.querySelectorAll(".index-row")).some((r) => !r.hidden);
    list.hidden = !anyVisible;
    const head = grid.querySelector(`[data-group-head="${list.dataset.groupList}"]`);
    if (head) {
      head.hidden = !anyVisible;
      const n = list.querySelectorAll(".index-row:not([hidden])").length;
      const badge = head.querySelector("[data-group-count]");
      if (badge) badge.textContent = `${n} ${n === 1 ? "entry" : "entries"}`;
    }
  });
  if (count) {
    const label = activeFilter === "all" ? "across all themes" : `in ${activeFilter}`;
    count.textContent = `Showing ${shown} of ${rows.length} entries ${label}.`;
  }
  if (archiveCount) archiveCount.textContent = `${rows.length} verified entries`;
  if (empty) {
    empty.hidden = shown > 0;
    const title = document.getElementById("emptyTitle");
    const text = document.getElementById("emptyText");
    if (shown === 0) {
      if (title) title.textContent = query
        ? `No results for “${document.getElementById("searchInput").value.trim()}”.`
        : activeFilter === "all"
          ? "No entries here yet."
          : `No entries in “${activeFilter}” yet.`;
      if (text) text.textContent = query
        ? "Try different keywords — or clear the search."
        : "Try another theme — or clear the filters. New work appears here as it is confirmed.";
    }
  }
}

/* ---------- Modal ---------- */
let lastFocused = null;

function initModal() {
  const backdrop = document.getElementById("modalBackdrop");
  const close = document.getElementById("modalClose");
  if (backdrop && close) {
    close.addEventListener("click", closeModal);
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  }
  // Same-page openers (featured buttons)
  document.querySelectorAll("[data-open-modal]").forEach((b) =>
    b.addEventListener("click", () => openModal(b.dataset.openModal))
  );
  bindNoteLinks(document);
  try {
    const pending = sessionStorage.getItem("ab-open-note");
    if (pending && document.getElementById("researchGrid")) {
      sessionStorage.removeItem("ab-open-note");
      openModal(pending);
    }
  } catch (e) { /* ignore */ }
}

function entryBody(p) {
  // Render only populated fields; a single muted line when nothing is known.
  let h = "";
  if (p.subtitle) h += `<p class="muted" style="font-style:italic">${esc(p.subtitle)}</p>`;
  if (p.overview) h += `<p>${esc(p.overview)}</p>`;
  if (p.objectives) h += `<h4>Objectives</h4><p>${esc(p.objectives)}</p>`;
  if (p.methods) h += `<h4>Methods</h4><p>${esc(p.methods)}</p>`;
  if (p.role) h += `<h4>Role</h4><p>${esc(p.role)}</p>`;
  if (p.publication || p.date) {
    h += `<h4>Published</h4><p>${[p.publication, p.date].filter(Boolean).map(esc).join(" · ")}</p>`;
  }
  if (p.url) h += `<p><a class="text-link" href="${p.url}" target="_blank" rel="noopener noreferrer">Read the original →</a></p>`;
  if (p.doi) h += `<p><a class="text-link" href="${p.doi}" target="_blank" rel="noopener noreferrer">DOI record →</a></p>`;
  if (p.note) h += `<p class="muted small">${esc(p.note)}</p>`;
  if (p.page) h += `<p><a class="text-link" href="${esc(p.page)}">Explore the full study →</a></p>`;
  return h || PLACEHOLDER_BODY;
}

function openModal(id) {
  const p = POSTS.find((x) => x.id === id);
  if (!p) return;
  const backdrop = document.getElementById("modalBackdrop");
  if (!backdrop) return;
  lastFocused = document.activeElement;

  const tag = document.getElementById("modalTag");
  tag.textContent = p.category;
  tag.className = "tag tag-" + p.category;
  document.getElementById("modalStatus").textContent =
    [p.kind, p.year].filter(Boolean).join(" · ") || p.status || "Entry";
  document.getElementById("modalTitle").textContent = p.title;
  document.getElementById("modalMeta").textContent =
    [p.year || p.status, p.location, p.methods].filter(Boolean).join("  ·  ");
  document.getElementById("modalBody").innerHTML = entryBody(p);
  backdrop.hidden = false;
  document.body.style.overflow = "hidden";
  const modal = backdrop.querySelector(".modal");
  if (modal) modal.scrollTop = 0;
  const close = document.getElementById("modalClose");
  if (close) close.focus({ preventScroll: true });
}

function closeModal() {
  const backdrop = document.getElementById("modalBackdrop");
  if (!backdrop || backdrop.hidden) return;
  backdrop.hidden = true;
  document.body.style.overflow = "";
  if (lastFocused && document.contains(lastFocused)) lastFocused.focus({ preventScroll: true });
}

/* ---------- Lightbox: project figure enlargement ---------- */
let lightboxReturn = null;

function initLightbox() {
  const box = document.getElementById("lightbox");
  if (!box) return;
  const img = document.getElementById("lightboxImg");
  const cap = document.getElementById("lightboxCap");
  const close = document.getElementById("lightboxClose");
  const closeBox = () => {
    box.hidden = true;
    document.body.style.overflow = "";
    if (lightboxReturn && document.contains(lightboxReturn)) lightboxReturn.focus({ preventScroll: true });
  };
  document.querySelectorAll("[data-lightbox]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      lightboxReturn = a;
      img.src = a.getAttribute("href");
      img.alt = (a.querySelector("img") || {}).alt || "Enlarged project figure";
      if (cap) cap.textContent = a.dataset.caption || "";
      box.hidden = false;
      document.body.style.overflow = "hidden";
      if (close) close.focus({ preventScroll: true });
    });
  });
  if (close) close.addEventListener("click", closeBox);
  box.addEventListener("click", (e) => { if (e.target === box) closeBox(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !box.hidden) closeBox();
  });
}

/* ---------- Contact form (no backend: opens mailto) ---------- */
const REAL_INBOX = "arkraj.biswas6@gmail.com";

function initContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("cfName").value.trim();
    const email = document.getElementById("cfEmail").value.trim();
    const topic = document.getElementById("cfTopic").value;
    const msg = document.getElementById("cfMessage").value.trim();
    if (!name || !email || !msg) {
      alert("Please fill in your name, email and message.");
      return;
    }
    const subject = encodeURIComponent(`[Website] ${topic} — from ${name}`);
    const body = encodeURIComponent(`${msg}\n\n— ${name} (${email})`);
    document.getElementById("formSuccess").hidden = false;
    window.location.href = `mailto:${REAL_INBOX}?subject=${subject}&body=${body}`;
  });
}
