/* Arkraj Biswas — theme, nav, research data, filters, modal, contact */

// ---------- Day / night mode ----------
(function initTheme() {
  const root = document.documentElement;
  const saved = localStorage.getItem("ab-theme");
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
    localStorage.setItem("ab-theme", next);
  }
})();

// ---------- Research data: edit freely to add your own posts ----------
// To add a post: copy a block, change category to climate | environment | agriculture.
const POSTS = [
  {
    id: "monsoon-small-farms",
    category: "climate",
    title: "Monsoon variability & small farms: what changes first?",
    summary: "Erratic rainfall rewrites sowing calendars. A grounded look at adaptation options that actually work for smallholders.",
    meta: "8 min read · Essay",
    body: `<p>When the monsoon stutters — late onset, long dry breaks, sudden downpours — small farms feel it first. Sowing windows shrink, seedlings drown or dry, and input costs climb.</p><h4>What helps in practice</h4><p><strong>1. Flexible calendars:</strong> short-duration and staggered varieties buy room to re-sow. <strong>2. In-situ moisture:</strong> bunds, mulches and farm ponds carry crops through breaks. <strong>3. Information:</strong> weekly agro-advisories beat seasonal forecasts for day-to-day calls.</p><h4>Open questions</h4><p>How do we pair traditional rain-reading with modern forecasts? What insurance designs actually pay out on time? Replace this starter text with your findings and citations.</p>`
  },
  {
    id: "soil-carbon-bank",
    category: "agriculture",
    title: "Soil is a bank account: reading soil organic carbon",
    summary: "Why soil organic carbon matters, how cover crops and compost build it, and what to measure on a low budget.",
    meta: "6 min read · Explainer",
    body: `<p>Soil organic carbon (SOC) is stored sunlight — it feeds microbes, holds water, and steadies yields. Think of it as a savings account: small regular deposits compound.</p><h4>Deposits that work</h4><p>Cover crops between seasons, compost and farmyard manure, reduced tillage, and diverse rotations. Avoid bare soil wherever possible.</p><h4>Measuring simply</h4><p>Colour, smell, water infiltration and earthworm counts tell you a lot before any lab test. Note your baseline and re-check each season.</p>`
  },
  {
    id: "restoring-degraded-patch",
    category: "environment",
    title: "Restoring a degraded patch: a beginner's field guide",
    summary: "Native species, water harvesting, patience. A practical sequence for bringing tired land back to life.",
    meta: "10 min read · Field guide",
    body: `<p>Restoration starts with water, not plants. Watch where rain flows, where it pools, where the soil is bare. Then slow it, spread it, sink it.</p><h4>A simple sequence</h4><p><strong>1. Protect:</strong> fence or agree to rest the patch. <strong>2. Water:</strong> contour trenches, swales, mulch. <strong>3. Pioneer:</strong> hardy natives and grasses first. <strong>4. Diversify:</strong> add shrubs and trees once the microclimate softens.</p><p>Document everything with photos from the same spot each month — recovery is slow until it suddenly isn't.</p>`
  },
  {
    id: "millets-heat",
    category: "agriculture",
    title: "Millets in a hotter world: an underrated resilience crop",
    summary: "Short cycles, low water needs, deep nutrition. Why millets deserve a bigger place on plates and policies.",
    meta: "5 min read · Note",
    body: `<p>Millets sip water where rice gulps it, mature quickly, and pack iron, fibre and calcium. They fit exactly the erratic-rainfall future we face.</p><p>Challenges are real — processing drudgery, thin value chains, shifting tastes. Solutions live in decentralised processing, school-meal demand, and honest pricing for farmers.</p>`
  },
  {
    id: "urban-heat-rooftops",
    category: "climate",
    title: "Cooling our streets: shade, water and white roofs",
    summary: "Heat is a health crisis before it is a comfort crisis. Low-cost urban cooling that cities can start this summer.",
    meta: "7 min read · Essay",
    body: `<p>Street trees, reflective roofs, courtyards that breathe, water bodies that evaporate — none of these need new technology, only priority.</p><p>Map the hottest wards first, plant where people walk and wait, and measure shade like infrastructure, not decoration.</p>`
  },
  {
    id: "commons-ponds",
    category: "environment",
    title: "Village ponds as climate infrastructure",
    summary: "Commons ponds recharge groundwater, host biodiversity and buffer floods. Reviving them is adaptation hiding in plain sight.",
    meta: "9 min read · Study note",
    body: `<p>Across South Asia, tanks and ponds were engineered ecosystems — catchment, feeder channels, sluices, shared rules. Encroachment and neglect broke the chain.</p><p>Revival works when desilting pairs with clear stewardship: who maintains inlets, who guards water quality, who decides sharing in dry months.</p>`
  }
];

// ---------- Shared UI: year, nav, progress, reveal ----------
document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  const burger = document.getElementById("hamburger");
  const links = document.getElementById("navLinks");
  if (burger && links) {
    burger.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => links.classList.remove("open")));
  }

  const bar = document.getElementById("progressBar");
  const onScroll = () => {
    const h = document.documentElement;
    const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100 || 0;
    if (bar) bar.style.width = pct + "%";
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  initResearchPage();
  initContactForm();
});

// ---------- Research page: render, filter, search, modal ----------
let activeFilter = "all";
let query = "";

function initResearchPage() {
  const grid = document.getElementById("researchGrid");
  if (!grid) return;

  // Deep-link support: research.html#filter-climate
  if (location.hash.startsWith("#filter-")) {
    activeFilter = location.hash.replace("#filter-", "");
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
  if (search) search.addEventListener("input", () => { query = search.value.toLowerCase().trim(); renderResearch(); });

  const reset = document.getElementById("resetFilters");
  if (reset) reset.addEventListener("click", () => {
    activeFilter = "all"; query = "";
    if (search) search.value = "";
    document.querySelectorAll(".filter-btn").forEach((x) => x.classList.toggle("active", x.dataset.filter === "all"));
    renderResearch();
  });

  renderResearch();
  initModal();
}

function filteredPosts() {
  return POSTS.filter((p) => {
    const okCat = activeFilter === "all" || p.category === activeFilter;
    const okQ = !query || (p.title + " " + p.summary + " " + p.body).toLowerCase().includes(query);
    return okCat && okQ;
  });
}

function renderResearch() {
  const grid = document.getElementById("researchGrid");
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("resultCount");
  const list = filteredPosts();

  if (count) count.textContent = `Showing ${list.length} of ${POSTS.length} notes${activeFilter !== "all" ? ` in “${activeFilter}”` : ""}.`;
  if (empty) empty.hidden = list.length > 0;

  grid.innerHTML = list.map((p) => `
    <article class="post-card reveal visible" data-id="${p.id}" tabindex="0" role="button" aria-label="Open: ${p.title}">
      <span class="tag tag-${p.category}">${p.category}</span>
      <h3>${p.title}</h3>
      <p>${p.summary}</p>
      <div class="post-meta"><span>${p.meta}</span></div>
      <span class="read-more">Read note →</span>
    </article>`).join("");

  grid.querySelectorAll(".post-card").forEach((card) => {
    card.addEventListener("click", () => openModal(card.dataset.id));
    card.addEventListener("keydown", (e) => { if (e.key === "Enter") openModal(card.dataset.id); });
  });
}

function initModal() {
  const backdrop = document.getElementById("modalBackdrop");
  const close = document.getElementById("modalClose");
  if (!backdrop || !close) return;
  close.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
}

function openModal(id) {
  const p = POSTS.find((x) => x.id === id);
  if (!p) return;
  const backdrop = document.getElementById("modalBackdrop");
  document.getElementById("modalTag").textContent = p.category;
  document.getElementById("modalTag").className = "tag tag-" + p.category;
  document.getElementById("modalTitle").textContent = p.title;
  document.getElementById("modalMeta").textContent = p.meta;
  document.getElementById("modalBody").innerHTML = p.body;
  backdrop.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const backdrop = document.getElementById("modalBackdrop");
  if (!backdrop) return;
  backdrop.hidden = true;
  document.body.style.overflow = "";
}

// ---------- Contact form (no-backend: opens mailto) ----------
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
    // TODO: replace with your real inbox
    const to = "hello@arkrajbiswas.example";
    const subject = encodeURIComponent(`[Website] ${topic} — from ${name}`);
    const body = encodeURIComponent(`${msg}\n\n— ${name} (${email})`);
    document.getElementById("formSuccess").hidden = false;
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  });
}
