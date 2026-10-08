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
   Where only a title is known, the body says so — nothing is
   invented. Keep `category` to climate | environment | agriculture
   so filters + #filter- deep links keep working. */
const PLACEHOLDER_BODY = "<p>Details and full text will be added here.</p>";

const POSTS = [
  {
    id: "nagar-van-yojana",
    category: "environment",
    title: "Socio-Economic, Cultural & Ecological Benefits — Nagar Van Yojana",
    summary: "An integrated assessment of the socio-economic, livelihood, socio-cultural, ecological and climatic benefits of Nagar Van Yojana.",
    meta: "Jan–Jun 2025 · Urban forestry",
    year: "2025", location: "", methods: "Environmental Assessment", status: "Jan–Jun 2025", kind: "Environmental Assessment",
    body: `<p>An integrated assessment of the socio-economic, livelihood, socio-cultural, ecological and climatic benefits of Nagar Van Yojana.</p>${PLACEHOLDER_BODY}`
  },
  {
    id: "bengaluru-uhi-decadal",
    category: "climate",
    title: "Decadal Study of UHI, GSI & UDI over Bengaluru",
    summary: "A decadal geospatial study examining changes in urban heat, green spaces and urban development using satellite imagery and landscape indicators.",
    meta: "Jan–Jun 2025 · Bengaluru",
    year: "2025", location: "Bengaluru", methods: "UHI · GSI · UDI", status: "Jan–Jun 2025", kind: "Geospatial Study",
    body: `<p>A decadal geospatial study examining changes in urban heat, green spaces and urban development using satellite imagery and landscape indicators.</p>${PLACEHOLDER_BODY}`
  },
  {
    id: "enhancing-urban-forestry",
    category: "environment",
    title: "Enhancing Urban Forestry",
    summary: "Policy brief on field evidence and implementation recommendations for the Nagar Van Yojana.",
    meta: "Policy brief · Urban forestry",
    year: "", location: "", methods: "Evidence & Implementation", status: "Policy Brief", kind: "Policy Brief",
    body: `<p>Policy brief on field evidence and implementation recommendations for the Nagar Van Yojana.</p>${PLACEHOLDER_BODY}`
  },
  {
    id: "etawah-design",
    category: "environment",
    title: "The Etawah Design: A 123-Acre Urban Forest as Its Lungs",
    summary: "Details and full text will be added here.",
    meta: "Details forthcoming",
    year: "", location: "", methods: "", status: "Details forthcoming", kind: "Entry",
    body: PLACEHOLDER_BODY
  },
  {
    id: "reimagining-ugs",
    category: "environment",
    title: "Reimagining Urban Green Spaces as Fundamental Infrastructure in a Warming India",
    summary: "Details and full text will be added here.",
    meta: "Details forthcoming",
    year: "", location: "", methods: "", status: "Details forthcoming", kind: "Entry",
    body: PLACEHOLDER_BODY
  },
  {
    id: "ugs-dynamics-bengaluru",
    category: "environment",
    title: "Spatiotemporal Assessment of UGS Dynamics – Bengaluru",
    summary: "Details and full text will be added here.",
    meta: "Bengaluru · Details forthcoming",
    year: "", location: "Bengaluru", methods: "", status: "Details forthcoming", kind: "Entry",
    body: PLACEHOLDER_BODY
  }
];

const FEATURED_ID = "nagar-van-yojana";

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
  const picks = POSTS.filter((p) => p.id !== FEATURED_ID).slice(0, 3);
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
  if (archiveCount) archiveCount.textContent = `${POSTS.length} entries`;
  if (empty) empty.hidden = list.length > 0;

  grid.innerHTML = list.map((p) => `
    <article class="index-row reveal visible" data-id="${esc(p.id)}" tabindex="0" role="button" aria-label="Open research note: ${esc(p.title)}">
      <span class="i-year">${esc(p.year || p.status || "")}</span>
      <span>
        <h3>${esc(p.title)}</h3>
        ${metaLine(p) ? `<p class="i-sub">${esc(metaLine(p))}</p>` : ""}
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
