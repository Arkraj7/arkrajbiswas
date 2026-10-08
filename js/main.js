/* ============================================================
   Arkraj Biswas — Editorial Studio v3
   Modules: theme → drawer → progress/reveal → research index
   → modal → contact. Preserved hooks: #themeToggle, #hamburger,
   #navLinks, .filter-btn, #researchGrid, #searchInput, modal ids,
   POSTS (categories climate | environment | agriculture).
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

/* ---------- Research data ----------
   Starter entries — replace with real projects/publications.
   Keep `category` to climate | environment | agriculture so the
   existing filters + #filter- deep links keep working.
   No findings are claimed; statuses say framework/note. */
const POSTS = [
  {
    id: "urban-heat-green",
    category: "climate",
    title: "Urban Heat & Green Space",
    summary: "A framework for reading land-surface temperature against vegetation and built-up cover — intended to show where shade and planting matter most.",
    meta: "2025 · Study framework",
    year: "2025", location: "City-scale · India", methods: "LST · NDVI · NDBI", status: "Framework", kind: "Study framework",
    body: `<p><em>Starter entry — no results claimed.</em> The intended analysis compares satellite-derived land-surface temperature (LST) with vegetation (NDVI) and built-up (NDBI) indices across seasons.</p><h4>Planned method</h4><p>Landsat / Sentinel composites in Google Earth Engine, zonal means by ward and green-cover class, ground checks with handheld readings where possible.</p><h4>To add later</h4><p>Study-area map, imagery dates, full method note, DOI links and honest limitations.</p>`
  },
  {
    id: "monsoon-small-farms",
    category: "climate",
    title: "Monsoon Variability & Small Farms",
    summary: "Erratic rainfall rewrites sowing calendars. A grounded look at adaptation options for smallholders.",
    meta: "2025 · Essay",
    year: "2025", location: "Eastern India", methods: "Rainfall records · Interviews", status: "Note", kind: "Essay",
    body: `<p>When the monsoon stutters — late onset, long dry breaks, sudden downpours — small farms feel it first. Sowing windows shrink and input costs climb.</p><h4>What helps in practice</h4><p><strong>Flexible calendars:</strong> short-duration and staggered varieties. <strong>In-situ moisture:</strong> bunds, mulches, farm ponds. <strong>Information:</strong> weekly agro-advisories for day-to-day calls.</p><h4>Open questions</h4><p>Pairing traditional rain-reading with modern forecasts; insurance that pays out on time. <em>Replace with findings and citations.</em></p>`
  },
  {
    id: "commons-ponds",
    category: "environment",
    title: "Village Ponds as Climate Infrastructure",
    summary: "Commons ponds recharge groundwater, host biodiversity and buffer floods — adaptation hiding in plain sight.",
    meta: "2025 · Study note",
    year: "2025", location: "Rural commons", methods: "Remote sensing · Field survey", status: "Note", kind: "Study note",
    body: `<p>Across South Asia, tanks and ponds were engineered ecosystems — catchment, feeder channels, sluices, shared rules. Encroachment and neglect broke the chain.</p><p>Revival works when desilting pairs with clear stewardship: who maintains inlets, who guards water quality, who decides sharing in dry months.</p><p><em>Future version:</em> pond inventory map, satellite time-series, community protocols.</p>`
  },
  {
    id: "soil-carbon-bank",
    category: "agriculture",
    title: "Reading Soil Organic Carbon",
    summary: "Why soil organic carbon matters, how cover crops and compost build it, and what to measure on a low budget.",
    meta: "2024 · Explainer",
    year: "2024", location: "Field notes", methods: "SOC · Cover crops · Compost", status: "Note", kind: "Explainer",
    body: `<p>Soil organic carbon (SOC) feeds microbes, holds water and steadies yields — a savings account where small regular deposits compound.</p><h4>Deposits that work</h4><p>Cover crops, compost and farmyard manure, reduced tillage, diverse rotations. Avoid bare soil.</p><h4>Measuring simply</h4><p>Colour, smell, infiltration and earthworm counts before any lab test. Note the baseline; re-check each season.</p>`
  },
  {
    id: "millets-heat",
    category: "agriculture",
    title: "Millets in a Hotter World",
    summary: "Short cycles, low water needs, deep nutrition — why millets deserve a bigger place on plates and in policy.",
    meta: "2024 · Note",
    year: "2024", location: "Semi-arid regions", methods: "Crop review · Nutrition data", status: "Note", kind: "Note",
    body: `<p>Millets sip water where rice gulps it, mature quickly, and pack iron, fibre and calcium — fitting the erratic-rainfall future.</p><p>Challenges: processing drudgery, thin value chains, shifting tastes. Responses: decentralised processing, school-meal demand, honest pricing for farmers.</p>`
  },
  {
    id: "restoring-degraded-patch",
    category: "environment",
    title: "Restoring a Degraded Patch",
    summary: "Native species, water harvesting, patience — a practical sequence for bringing tired land back to life.",
    meta: "2024 · Field guide",
    year: "2024", location: "Degraded commons", methods: "Swales · Natives · Photo plots", status: "Note", kind: "Field guide",
    body: `<p>Restoration starts with water, not plants. Watch where rain flows, pools, and where soil lies bare — then slow it, spread it, sink it.</p><h4>A simple sequence</h4><p><strong>Protect:</strong> rest the patch. <strong>Water:</strong> contour trenches, swales, mulch. <strong>Pioneer:</strong> hardy natives first. <strong>Diversify:</strong> shrubs and trees once the microclimate softens.</p><p>Photograph the same spot monthly — recovery is slow until it suddenly isn't.</p>`
  }
];

/* ---------- Shared UI ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  initDrawer();
  initProgress();
  initReveal();
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

/* ---------- Home: selected rows + latest notes (from POSTS) ---------- */
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function initHomeLists() {
  const rows = document.getElementById("selectedRows");
  if (rows) {
    const picks = POSTS.filter((p) => p.id !== "urban-heat-green").slice(0, 3);
    rows.innerHTML = picks.map((p) => `
      <a class="index-row" href="research.html" data-open-note="${esc(p.id)}" style="text-decoration:none;color:inherit">
        <span class="i-year">${esc(p.year || "")}</span>
        <span><h4>${esc(p.title)}</h4><p class="i-sub">${esc(p.summary)}</p></span>
        <span class="i-side"><span class="tag tag-${esc(p.category)}">${esc(p.category)}</span><span class="i-open">Open <span class="arr">→</span></span></span>
      </a>`).join("");
    bindNoteLinks(rows);
  }
  const notes = document.getElementById("latestNotes");
  if (notes) {
    const picks = POSTS.slice(1, 4);
    notes.innerHTML = picks.map((p) => `
      <div class="note-cell">
        <span class="meta">${esc(p.year || "")} · ${esc(p.category)}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.summary)}</p>
        <a href="research.html" class="text-link small" data-open-note="${esc(p.id)}">Read →</a>
      </div>`).join("");
    bindNoteLinks(notes);
  }
}

/* Cross-page note opening: store id, archive page opens the modal */
function bindNoteLinks(scope) {
  scope.querySelectorAll("[data-open-note]").forEach((a) => {
    a.addEventListener("click", () => {
      try { sessionStorage.setItem("ab-open-note", a.dataset.openNote); } catch (e) { /* ignore */ }
    });
  });
}

/* ---------- Research archive ---------- */
let activeFilter = "all";
let query = "";

function initResearchPage() {
  const grid = document.getElementById("researchGrid");
  initModal();
  if (!grid) return;

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
}

function filteredPosts() {
  return POSTS.filter((p) => {
    const okCat = activeFilter === "all" || p.category === activeFilter;
    const hay = (p.title + " " + p.summary + " " + (p.methods || "") + " " + (p.location || "")).toLowerCase();
    return okCat && (!query || hay.includes(query));
  });
}

function renderResearch() {
  const grid = document.getElementById("researchGrid");
  if (!grid) return;
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("resultCount");
  const archiveCount = document.getElementById("archiveCount");
  const list = filteredPosts();

  if (count) {
    const label = activeFilter === "all" ? "across all themes" : `in ${activeFilter}`;
    count.textContent = `Showing ${list.length} of ${POSTS.length} entries ${label}.`;
  }
  if (archiveCount) archiveCount.textContent = `${POSTS.length} entries · starter frameworks`;
  if (empty) empty.hidden = list.length > 0;

  grid.innerHTML = list.map((p) => `
    <article class="index-row reveal visible" data-id="${esc(p.id)}" tabindex="0" role="button" aria-label="Open research note: ${esc(p.title)}">
      <span class="i-year">${esc(p.year || "")}</span>
      <span>
        <h3>${esc(p.title)}</h3>
        <p class="i-sub">${esc(p.location || "")}${p.location && p.methods ? " — " : ""}${esc(p.methods || "")}</p>
      </span>
      <span class="i-side">
        <span class="tag tag-${esc(p.category)}">${esc(p.category)}</span>
        <span class="i-open">Open <span class="arr">→</span></span>
      </span>
    </article>`).join("");

  grid.querySelectorAll(".index-row").forEach((row) => {
    row.addEventListener("click", () => openModal(row.dataset.id));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(row.dataset.id); }
    });
  });
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

function openModal(id) {
  const p = POSTS.find((x) => x.id === id);
  if (!p) return;
  const backdrop = document.getElementById("modalBackdrop");
  if (!backdrop) return;
  lastFocused = document.activeElement;

  const tag = document.getElementById("modalTag");
  tag.textContent = p.category;
  tag.className = "tag tag-" + p.category;
  document.getElementById("modalStatus").textContent = (p.kind || "Note") + " · " + (p.year || "");
  document.getElementById("modalTitle").textContent = p.title;
  document.getElementById("modalMeta").textContent =
    [p.year, p.location, p.methods].filter(Boolean).join("  ·  ");
  document.getElementById("modalBody").innerHTML = p.body;
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
