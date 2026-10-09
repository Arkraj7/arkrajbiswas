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
    id: "urban-forestry-framework",
    group: "current",
    category: "environment",
    title: "Strategic Framework for Human-Centric Urban Forestry: Evaluating Socio-Economic, Psychological, and Governance Outcomes of the Nagar Van Yojana",
    summary: "Ongoing National CAMPA research — GIS-based audits, socio-economic surveys, psychological well-being assessments, climate resilience, community well-being, participatory governance and a monitoring framework.",
    meta: "Ongoing · National CAMPA",
    year: "", location: "", methods: "GIS-based audits · Socio-economic surveys · Well-being assessments", status: "Ongoing", kind: "Current Research",
    body: `<p>Ongoing National CAMPA research evaluating the socio-economic, psychological and governance outcomes of the Nagar Van Yojana. The work brings together GIS-based audits, socio-economic surveys, psychological well-being assessments, climate resilience, community well-being and participatory governance, towards a monitoring framework.</p><p><em>Methodology only — findings will be added here as they are confirmed.</em></p>`
  },
  {
    id: "nagar-van-benefits",
    group: "projects",
    category: "environment",
    title: "Socio-Economic, Cultural & Ecological Benefits — Nagar Van Yojana",
    summary: "Assessing the socio-economic, livelihood, socio-cultural, ecological and climatic benefits of the Nagar Van Yojana through an integrated multi-analysis methodological framework.",
    meta: "Jan–Jun 2025 · Urban forestry",
    year: "2025", location: "", methods: "Urban Forestry · Environmental Assessment", status: "Jan–Jun 2025", kind: "Project",
    body: `<p>Assessing the socio-economic, livelihood, socio-cultural, ecological and climatic benefits of the Nagar Van Yojana through an integrated multi-analysis methodological framework.</p>${PLACEHOLDER_BODY}`
  },
  {
    id: "bengaluru-uhi",
    group: "projects",
    category: "climate",
    title: "Decadal Study of UHI, GSI & UDI over Bengaluru",
    summary: "Performed geospatial analysis of UHI, green space and urban development trends using satellite imagery and landscape indicators.",
    meta: "Jan–Jun 2025 · Bengaluru",
    year: "2025", location: "Bengaluru", methods: "UHI · GSI · UDI", status: "Jan–Jun 2025", kind: "Project",
    body: `<p>Performed geospatial analysis of UHI, green space and urban development trends using satellite imagery and landscape indicators.</p>${PLACEHOLDER_BODY}`
  },
  {
    id: "enhancing-urban-forestry",
    group: "writing",
    category: "environment",
    title: "Enhancing Urban Forestry: Field Evidence and Implementation Recommendations for the Nagar Van Yojana",
    summary: "Policy brief presenting field evidence and implementation recommendations for the Nagar Van Yojana.",
    meta: "Policy brief · Urban forestry",
    year: "", location: "", methods: "Field evidence · Implementation", status: "Policy Brief", kind: "Policy Brief",
    body: `<p>Policy brief presenting field evidence and implementation recommendations for the Nagar Van Yojana.</p>${PLACEHOLDER_BODY}`
  },
  {
    id: "etawah-design",
    group: "writing",
    category: "environment",
    title: "The Etawah Design: A 123-Acre Urban Forest as Its Lungs",
    summary: "Details and full text will be added here.",
    meta: "Article · Details forthcoming",
    year: "", location: "", methods: "", status: "Article", kind: "Article",
    body: PLACEHOLDER_BODY
  },
  {
    id: "forest-zodiac",
    group: "writing",
    category: "environment",
    title: "When a Forest Knows Your Zodiac Sign",
    summary: "Details and full text will be added here.",
    meta: "Article · Details forthcoming",
    year: "", location: "", methods: "", status: "Article", kind: "Article",
    body: PLACEHOLDER_BODY
  },
  {
    id: "reimagining-ugs",
    group: "writing",
    category: "environment",
    title: "Reimagining Urban Green Spaces as Fundamental Infrastructure in a Warming India",
    summary: "Details and full text will be added here.",
    meta: "Blog / Article · Details forthcoming",
    year: "", location: "", methods: "", status: "Blog / Article", kind: "Blog / Article",
    body: PLACEHOLDER_BODY
  },
  {
    id: "ugs-thesis",
    group: "writing",
    category: "environment",
    title: "Spatiotemporal Assessment of UGS Dynamics – Bengaluru",
    summary: "Details and full text will be added here.",
    meta: "Research thesis · Bengaluru",
    year: "", location: "Bengaluru", methods: "", status: "Research Thesis", kind: "Research Thesis",
    body: PLACEHOLDER_BODY
  },
  {
    id: "etawah-field-evidence",
    group: "writing",
    category: "environment",
    title: "Etawah Nagar Van: Field Evidence on Urban Forestry",
    summary: "Details and full text will be added here.",
    meta: "Research article · Details forthcoming",
    year: "", location: "", methods: "", status: "Research Article", kind: "Research Article",
    body: PLACEHOLDER_BODY
  }
];

const FEATURED_ID = "urban-forestry-framework";
const HOME_PICKS = ["nagar-van-benefits", "bengaluru-uhi", "enhancing-urban-forestry"];

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
    if (["all", "climate", "environment", "agriculture"].includes(f)) activeFilter = f;
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
  if (empty) empty.hidden = shown > 0;
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
  document.getElementById("modalStatus").textContent =
    [p.kind, p.year].filter(Boolean).join(" · ") || p.status || "Entry";
  document.getElementById("modalTitle").textContent = p.title;
  document.getElementById("modalMeta").textContent =
    [p.year || p.status, p.location, p.methods].filter(Boolean).join("  ·  ");
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
