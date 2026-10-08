/* ============================================================
   Arkraj Biswas — Field Notebook v2
   Modules: theme → drawer → progress/reveal → research → modal
   → contact. Keeps: #themeToggle, #hamburger, #navLinks,
   .filter-btn, #researchGrid, #searchInput, modal ids, POSTS.
   ============================================================ */

/* ---------- Theme (day / night, persisted) ---------- */
(function initTheme() {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem("ab-theme"); } catch (e) { /* private mode */ }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme", saved || (prefersDark ? "dark" : "light"));
  document.addEventListener("DOMContentLoaded", () => {
    ["themeToggle", "themeToggleFooter"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", toggleTheme);
    });
  });
  function toggleTheme() {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("ab-theme", next); } catch (e) { /* ignore */ }
  }
})();

/* ---------- Research data ----------
   Starter entries — replace with real projects/publications.
   Keep `category` to climate | environment | agriculture so the
   existing filters + #filter- deep links keep working.
   New optional fields: year, location, methods, status, kind. */
const POSTS = [
  {
    id: "monsoon-small-farms",
    category: "climate",
    title: "Monsoon variability & small farms: what changes first?",
    summary: "Erratic rainfall rewrites sowing calendars. A grounded look at adaptation options that actually work for smallholders.",
    meta: "8 min read · Essay",
    year: "2025", location: "Eastern India", methods: "Rainfall records · Field interviews", status: "Starter note", kind: "Essay",
    body: `<p>When the monsoon stutters — late onset, long dry breaks, sudden downpours — small farms feel it first. Sowing windows shrink, seedlings drown or dry, and input costs climb.</p><h4>What helps in practice</h4><p><strong>1. Flexible calendars:</strong> short-duration and staggered varieties buy room to re-sow. <strong>2. In-situ moisture:</strong> bunds, mulches and farm ponds carry crops through breaks. <strong>3. Information:</strong> weekly agro-advisories beat seasonal forecasts for day-to-day calls.</p><h4>Open questions</h4><p>How do we pair traditional rain-reading with modern forecasts? What insurance designs actually pay out on time? <em>Replace this starter text with findings, citations and links.</em></p>`
  },
  {
    id: "urban-heat-green",
    category: "climate",
    title: "Urban heat & green spaces: reading the city surface",
    summary: "Starter framework for mapping land-surface temperature against vegetation and built-up indices in a growing city.",
    meta: "7 min read · Study framework",
    year: "2025", location: "City-scale · India", methods: "LST · NDVI · NDBI", status: "Starter framework", kind: "Study framework",
    body: `<p><em>Starter entry — no results claimed yet.</em> The intended analysis compares satellite-derived land-surface temperature (LST) with vegetation (NDVI) and built-up (NDBI) indices across seasons.</p><h4>Planned method</h4><p>Landsat / Sentinel composites in Google Earth Engine, zonal means by ward/green cover, ground checks with handheld readings where possible.</p><h4>To add later</h4><p>Study area map, imagery dates, full method note, DOI links, and honest limitations.</p>`
  },
  {
    id: "soil-carbon-bank",
    category: "agriculture",
    title: "Soil is a bank account: reading soil organic carbon",
    summary: "Why soil organic carbon matters, how cover crops and compost build it, and what to measure on a low budget.",
    meta: "6 min read · Explainer",
    year: "2024", location: "Field notes", methods: "SOC · Cover crops · Compost", status: "Starter note", kind: "Explainer",
    body: `<p>Soil organic carbon (SOC) is stored sunlight — it feeds microbes, holds water, and steadies yields. Think of it as a savings account: small regular deposits compound.</p><h4>Deposits that work</h4><p>Cover crops between seasons, compost and farmyard manure, reduced tillage, and diverse rotations. Avoid bare soil wherever possible.</p><h4>Measuring simply</h4><p>Colour, smell, water infiltration and earthworm counts tell you a lot before any lab test. Note your baseline and re-check each season.</p>`
  },
  {
    id: "millets-heat",
    category: "agriculture",
    title: "Millets in a hotter world: an underrated resilience crop",
    summary: "Short cycles, low water needs, deep nutrition. Why millets deserve a bigger place on plates and policies.",
    meta: "5 min read · Note",
    year: "2024", location: "Semi-arid regions", methods: "Crop review · Nutrition data", status: "Starter note", kind: "Note",
    body: `<p>Millets sip water where rice gulps it, mature quickly, and pack iron, fibre and calcium. They fit exactly the erratic-rainfall future we face.</p><p>Challenges are real — processing drudgery, thin value chains, shifting tastes. Solutions live in decentralised processing, school-meal demand, and honest pricing for farmers.</p>`
  },
  {
    id: "restoring-degraded-patch",
    category: "environment",
    title: "Restoring a degraded patch: a beginner's field guide",
    summary: "Native species, water harvesting, patience. A practical sequence for bringing tired land back to life.",
    meta: "10 min read · Field guide",
    year: "2024", location: "Degraded commons", methods: "Swales · Natives · Photo plots", status: "Starter note", kind: "Field guide",
    body: `<p>Restoration starts with water, not plants. Watch where rain flows, where it pools, where the soil is bare. Then slow it, spread it, sink it.</p><h4>A simple sequence</h4><p><strong>1. Protect:</strong> fence or agree to rest the patch. <strong>2. Water:</strong> contour trenches, swales, mulch. <strong>3. Pioneer:</strong> hardy natives and grasses first. <strong>4. Diversify:</strong> add shrubs and trees once the microclimate softens.</p><p>Document everything with photos from the same spot each month — recovery is slow until it suddenly isn't.</p>`
  },
  {
    id: "commons-ponds",
    category: "environment",
    title: "Village ponds as climate infrastructure",
    summary: "Commons ponds recharge groundwater, host biodiversity and buffer floods. Revival is adaptation hiding in plain sight.",
    meta: "9 min read · Study note",
    year: "2025", location: "Rural commons", methods: "Remote sensing · Field survey", status: "Starter note", kind: "Study note",
    body: `<p>Across South Asia, tanks and ponds were engineered ecosystems — catchment, feeder channels, sluices, shared rules. Encroachment and neglect broke the chain.</p><p>Revival works when desilting pairs with clear stewardship: who maintains inlets, who guards water quality, who decides sharing in dry months.</p><p><em>Future version:</em> add pond inventory map, satellite time-series, and community protocols.</p>`
  }
];

/* ---------- Shared UI ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  initDrawer();
  initProgress();
  initReveal();
  initResearchPage();
  initContactForm();
});

/* ----- Left slide-out drawer (keeps #hamburger + #navLinks ids) ----- */
function initDrawer() {
  const burger = document.getElementById("hamburger");
  const drawer = document.getElementById("navLinks");
  const scrim = document.getElementById("scrim");
  if (!burger || !drawer) return;

  const setOpen = (open) => {
    drawer.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    if (scrim) scrim.hidden = false;
    requestAnimationFrame(() => { if (scrim) scrim.style.opacity = ""; });
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
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) setOpen(false);
  });
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

/* ---------- Research archive ---------- */
let activeFilter = "all";
let query = "";

function initResearchPage() {
  const grid = document.getElementById("researchGrid");
  if (!grid) { initModal(); return; }

  if (location.hash.startsWith("#filter-")) {
    const f = location.hash.replace("#filter-", "");
    if (["all", "climate", "environment", "agriculture"].includes(f)) activeFilter = f;
    document.querySelectorAll(".filter-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.filter === activeFilter)
    );
  }

  document.querySelectorAll(".filter-btn").forEach((b) =>
    b.addEventListener("click", () => {
      activeFilter = b.dataset.filter;
      document.querySelectorAll(".filter-btn").forEach((x) => x.classList.toggle("active", x === b));
      renderResearch();
    })
  );

  const search = document.getElementById("searchInput");
  if (search) search.addEventListener("input", () => {
    query = search.value.toLowerCase().trim();
    renderResearch();
  });

  const reset = document.getElementById("resetFilters");
  if (reset) reset.addEventListener("click", () => {
    activeFilter = "all"; query = "";
    if (search) search.value = "";
    document.querySelectorAll(".filter-btn").forEach((x) =>
      x.classList.toggle("active", x.dataset.filter === "all"));
    renderResearch();
  });

  renderResearch();
  initModal();
  initFeaturedLedger();
}

function filteredPosts() {
  return POSTS.filter((p) => {
    const okCat = activeFilter === "all" || p.category === activeFilter;
    const hay = (p.title + " " + p.summary + " " + (p.methods || "") + " " + (p.location || "") + " " + p.body).toLowerCase();
    return okCat && (!query || hay.includes(query));
  });
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderResearch() {
  const grid = document.getElementById("researchGrid");
  if (!grid) return;
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("resultCount");
  const list = filteredPosts();

  if (count) {
    const label = activeFilter === "all" ? "across all themes" : `in “${activeFilter}”`;
    count.textContent = `Showing ${list.length} of ${POSTS.length} entries ${label}.`;
  }
  if (empty) empty.hidden = list.length > 0;

  grid.innerHTML = list.map((p, i) => `
    <article class="archive-card reveal visible" data-id="${esc(p.id)}" tabindex="0" role="button" aria-label="Open research note: ${esc(p.title)}">
      <div class="archive-top">
        <span class="tag tag-${esc(p.category)}">${esc(p.category)}</span>
        <span class="archive-idx">N° ${String(i + 1).padStart(2, "0")}</span>
      </div>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.summary)}</p>
      <dl class="archive-meta-grid">
        <div><dt>Year</dt><dd>${esc(p.year || "—")}</dd></div>
        <div><dt>Location</dt><dd>${esc(p.location || "—")}</dd></div>
        <div><dt>Method</dt><dd>${esc(p.methods || "—")}</dd></div>
        <div><dt>Status</dt><dd>${esc(p.status || p.kind || "Note")}</dd></div>
      </dl>
      <span class="read-more">Open note <span class="arr">→</span></span>
    </article>`).join("");

  grid.querySelectorAll(".archive-card").forEach((card) => {
    card.addEventListener("click", () => openModal(card.dataset.id));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(card.dataset.id); }
    });
  });
}

/* Homepage ledger mirrors the same POSTS (no duplication of content) */
function initFeaturedLedger() {
  const ledger = document.getElementById("featuredLedger");
  if (!ledger) return;
  const picks = POSTS.slice(0, 4);
  ledger.innerHTML = picks.map((p, i) => `
    <a class="ledger-row" href="research.html" data-open-note="${esc(p.id)}">
      <span class="l-idx">${String(i + 1).padStart(2, "0")}</span>
      <h3>${esc(p.title)} <span class="arr">→</span></h3>
      <span class="l-topic">${esc(p.category)} · ${esc(p.location || "")}</span>
      <span class="l-methods">${esc(p.methods || "")}</span>
    </a>`).join("");
}

/* ---------- Modal: research-note reading experience ---------- */
let lastFocused = null;

function initModal() {
  const backdrop = document.getElementById("modalBackdrop");
  const close = document.getElementById("modalClose");
  if (!backdrop || !close) return;
  close.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  // Homepage ledger deep-opens the matching note on the archive page
  document.querySelectorAll("[data-open-note]").forEach((a) => {
    a.addEventListener("click", () => {
      try { sessionStorage.setItem("ab-open-note", a.dataset.openNote); } catch (e) { /* ignore */ }
    });
  });
  try {
    const pending = sessionStorage.getItem("ab-open-note");
    if (pending && document.getElementById("researchGrid")) {
      sessionStorage.removeItem("ab-open-note");
      openModal(pending);
    }
  } catch (e) { /* ignore */ }
}

function openModal(id) {
  const p = POSTS.find((x) => x.id === id);
  if (!p) return;
  const backdrop = document.getElementById("modalBackdrop");
  if (!backdrop) return;
  lastFocused = document.activeElement;

  const tag = document.getElementById("modalTag");
  const status = document.getElementById("modalStatus");
  tag.textContent = p.category;
  tag.className = "tag tag-" + p.category;
  if (status) status.textContent = (p.kind || "Field note") + " · " + (p.year || "");
  document.getElementById("modalTitle").textContent = p.title;
  document.getElementById("modalMeta").textContent =
    [p.year, p.location, p.methods].filter(Boolean).join("  ·  ") || p.meta;
  document.getElementById("modalBody").innerHTML = p.body;
  backdrop.hidden = false;
  document.body.style.overflow = "hidden";
  const close = document.getElementById("modalClose");
  if (close) close.focus({ preventScroll: true });
  const modal = backdrop.querySelector(".modal");
  if (modal) modal.scrollTop = 0;
}

function closeModal() {
  const backdrop = document.getElementById("modalBackdrop");
  if (!backdrop || backdrop.hidden) return;
  backdrop.hidden = true;
  document.body.style.overflow = "";
  if (lastFocused && document.contains(lastFocused)) lastFocused.focus({ preventScroll: true });
}

/* ---------- Contact form (no backend: opens mailto) ---------- */
const PLACEHOLDER_INBOX = "hello@arkrajbiswas.example"; // placeholder — replace with real address

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
    window.location.href = `mailto:${PLACEHOLDER_INBOX}?subject=${subject}&body=${body}`;
  });
}
