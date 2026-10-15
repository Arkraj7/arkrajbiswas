/**
 * Natural-Language & Interactive Upgrades for about.html and research.html
 * on arkrajbiswas.com
 */
(function () {
  'use strict';

  /* =======================================================================
     DATA FOR ABOUT.HTML: TRAJECTORY TIMELINE & QUESTION-DRIVEN TOOLKIT
     ======================================================================= */
  const TIMELINE_ITEMS = [
    {
      period: '2026 — Present',
      category: 'roles',
      role: 'Research Associate · National CAMPA',
      org: 'Ministry of Environment, Forest and Climate Change (MoEFCC), New Delhi',
      desc: 'Working on the monitoring and evaluation of the Nagar Van Yojana across Uttar Pradesh, Madhya Pradesh, Rajasthan, and Gujarat. My days split between GIS canopy audits and sitting down with forest staff, park workers, and morning visitors to understand what makes an urban forest actually work for the people around it.'
    },
    {
      period: '2026',
      category: 'training',
      role: 'Embark India Development Fellow',
      org: 'Indian Institute of Public Administration (IIPA), New Delhi',
      desc: 'Completed residential policy and governance training at IIPA before deploying to MoEFCC—focusing on how field evidence and spatial indicators can be translated into practical public-sector monitoring frameworks.'
    },
    {
      period: '2025 — Present',
      category: 'roles',
      role: 'Director & Co-Founder',
      org: 'EcoServe Development Foundation',
      desc: 'Co-leading community-linked restoration and climate literacy initiatives (including Project Mangrove+ and Project VRIKSHA) and serving as Ecosystem Restoration Partner for scientific and sustainability convenings.'
    },
    {
      period: 'Sep — Nov 2025',
      category: 'training',
      role: 'Forestry & Research Methodologies Training',
      org: 'CASFOS Dehradun & IIE Guwahati',
      desc: 'Completed specialized training in Nature Interpretation and Ecotourism at the Central Academy for State Forest Service (Dehradun) and a seven-day residential research methodology workshop at the Indian Institute of Entrepreneurship (Guwahati).'
    },
    {
      period: '2023 — 2025',
      category: 'education',
      role: 'M.Sc. in Environmental Sciences (Earth & Atmospheric Sciences)',
      org: 'Banaras Hindu University (BHU), Varanasi',
      desc: 'Focused on satellite remote sensing, boundary-layer meteorology, and spatial econometrics. My master’s dissertation examined ten years of surface warming (LST), vegetation loss (NDVI), and built-up growth (NDBI) across Bengaluru.'
    },
    {
      period: '2019 — 2023',
      category: 'education',
      role: 'B.Sc. (Hons.) in Agricultural Sciences',
      org: 'University of Agricultural Sciences (UAS), Dharwad',
      desc: 'Where my interest in landscapes began. Included a four-month Rural Agricultural Work Experience (RAWE) living alongside farming communities in Karnataka—collecting crop and livelihood data and seeing firsthand how weather variability shapes rural decisions.'
    }
  ];

  /* =======================================================================
     DATA FOR RESEARCH.HTML: CURATED ARCHIVE WITH HUMAN FIELD NOTES & BIBTEX
     ======================================================================= */
  const RESEARCH_ARCHIVE = [
    {
      id: 'hcuf-framework',
      year: '2026 · Ongoing',
      category: 'environment policy',
      type: 'Institutional Research · National CAMPA (MoEFCC)',
      title: 'Strategic Framework for Human-Centric Urban Forestry (Nagar Van Yojana)',
      href: 'projects/nagar-van-assessment.html',
      summary: 'Developing an integrated evaluation framework for urban forests in India—pairing satellite canopy and thermal audits with on-site socio-economic surveys, psychological restoration scales, and governance reviews.',
      fieldNote: 'Why this matters: Urban forestry targets are often tracked by how many saplings are planted or how many hectares are fenced. In the field across 14 sites in UP, MP, Rajasthan, and Gujarat, it became clear that a forest’s survival and social value depend just as much on watering continuity, shade along walking paths, gender-safe access, and local municipal coordination. Methodology shown; empirical findings follow upon formal confirmation.',
      methods: ['Sentinel-2 & Landsat TIRS', 'Key Informant Interviews', 'Perceived Restorativeness Scale', 'Governance Audit'],
      bibtex: null
    },
    {
      id: 'nagar-van-assessment',
      year: '2026',
      category: 'environment policy',
      type: 'Featured Case Study · 14 Sites · 3 States',
      title: 'Comprehensive Technical Assessment of Nagar Van and Nagar Vatika Yojana',
      href: 'projects/nagar-van-assessment.html',
      summary: 'Multi-state field and spatial assessment across semi-arid, alluvial, and plateau landscapes evaluating plantation survival, microclimatic buffering, and community use.',
      fieldNote: 'Field context: Conducted through structured site traverses, quadrat checks, and conversations with range officers, daily-wage Mali workers, and surrounding residents. Highlights how soil selection, native species mix, and post-year-three maintenance budgets determine whether a site becomes a self-sustaining woodland or a stressed plantation.',
      methods: ['Field Audits', 'FGD & KII Protocols', 'NDVI/LST Buffer Analysis', 'CAMPA Phasing Review'],
      bibtex: `@techreport{biswas2026assessment,\n  author = {Biswas, Arkraj},\n  title = {Comprehensive Technical Assessment of Nagar Van and Nagar Vatika Yojana},\n  year = {2026},\n  note = {Multi-state field evaluation across 14 urban forest sites}\n}`
    },
    {
      id: 'bengaluru-uhi',
      year: '2025',
      category: 'climate gis',
      type: 'M.Sc. Dissertation · Banaras Hindu University',
      title: 'Bengaluru: Urban Heat, Green Spaces and Urban Development (April 2014, 2019 & 2024)',
      href: 'projects/bengaluru-urban-heat.html',
      summary: 'A decadal satellite and spatial econometric study tracking how rapid impervious expansion reshaped Bengaluru’s thermal environment—and how surviving green lungs buffer surrounding neighborhoods.',
      fieldNote: 'Behind the study: Using Landsat 8/9 OLI-TIRS scenes across April 2014, 2019, and 2024, I mapped Land Surface Temperature (LST) against NDVI and NDBI using Geographically Weighted Regression (GWR) and Local Moran’s I. While peripheral tech corridors like Whitefield and Peenya warmed by +3.8°C to +5.3°C, mature canopy cores like IISc, Cubbon Park, and Lalbagh maintained persistent Park Cool Islands up to 7°C cooler than industrial zones.',
      methods: ['Landsat 8/9 OLI-TIRS', 'Geographically Weighted Regression (GWR)', 'Local Moran’s I (LISA)', 'NDVI / NDBI / LST'],
      bibtex: `@mastersthesis{biswas2025bengaluru,\n  author = {Biswas, Arkraj},\n  title = {Mitigating Effects of Urban Green Spaces on Land Surface Temperature and Urban Heat Island Dynamics in Bengaluru},\n  school = {Banaras Hindu University},\n  year = {2025}\n}`
    },
    {
      id: 'bio-inequity',
      year: '2025 — 2026',
      category: 'environment policy gis',
      type: 'Independent Spatial Inquiry · Justice & Conservation',
      title: 'Systemic Bio-Inequity in India: Exploring the Biodiversity–Poverty Paradox',
      href: 'projects/bio-inequity.html',
      summary: 'Examining the spatial overlap between India’s richest biodiversity districts and its highest concentrations of multidimensional rural poverty.',
      fieldNote: 'Behind the study: When you overlay state- and district-level biodiversity indices against Multidimensional Poverty Index (MPI) headcounts across central and eastern India (Jharkhand, Odisha, Chhattisgarh, Meghalaya), a stark paradox emerges: the communities stewarding the richest forests often bear the highest socio-economic deprivation. This inquiry explores how conservation financing and benefit-sharing can address that gap.',
      methods: ['Spatial Overlay Analysis', 'Bivariate Choropleth Mapping', 'MPI & Biodiversity Composite Index', 'Conservation Policy'],
      bibtex: `@misc{biswas2026bioinequity,\n  author = {Biswas, Arkraj},\n  title = {Systemic Bio-Inequity in India: Exploring the Biodiversity--Poverty Paradox},\n  year = {2026}\n}`
    },
    {
      id: 'ssrn-urban-forestry',
      year: '2026',
      category: 'policy writing environment',
      type: 'SSRN Working Paper · Policy Brief',
      title: 'Enhancing Urban Forestry: Field Evidence and Implementation Recommendations',
      href: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7415140',
      summary: 'Actionable policy recommendations translating field observations from public urban forestry programs into practical guidelines for site selection, native species planning, and long-term maintenance.',
      fieldNote: 'Key takeaway: Bridges the gap between high-level afforestation guidelines and ground-level municipal constraints—proposing phased survival audits, heat-vulnerability prioritization when choosing new urban forest plots, and formal citizen co-management.',
      methods: ['Policy Evaluation', 'Institutional Design', 'Urban Green Infrastructure'],
      bibtex: `@techreport{biswas2026ssrn,\n  author = {Biswas, Arkraj},\n  title = {Enhancing Urban Forestry: Field Evidence and Implementation Recommendations},\n  institution = {SSRN},\n  year = {2026}\n}`
    },
    {
      id: 'etawah-question-of-cities',
      year: 'Sep 2026',
      category: 'writing environment',
      type: 'Published Article · Question of Cities',
      title: 'The Etawah Design: A 123-Acre Urban Forest as Its Lungs',
      href: 'https://questionofcities.org/the-etawah-design-an-123-acre-urban-forest-as-its-lungs/',
      summary: 'A field-reported essay on how a 123-acre degraded ravine landscape in Etawah, Uttar Pradesh, was transformed into a living urban forest.',
      fieldNote: 'Field reflection: Walking through the Etawah site showed how ecological restoration in semi-arid ravines requires working with—rather than flattening—the natural gullies and hydrology, creating both a microclimatic refuge for the town and a habitat corridor.',
      methods: ['Field Reporting', 'Ravine Ecology', 'Urban Microclimate'],
      bibtex: `@article{biswas2026etawah,\n  author = {Biswas, Arkraj},\n  title = {The Etawah Design: An 123-Acre Urban Forest as Its Lungs},\n  journal = {Question of Cities},\n  year = {2026},\n  month = {sep}\n}`
    },
    {
      id: 'zodiac-csr-times',
      year: 'Aug 2026',
      category: 'writing environment',
      type: 'Opinion Essay · CSR Times',
      title: 'When a Forest Knows Your Zodiac Sign',
      href: 'https://csrtimes.org/when-a-forest-knows-your-zodiac-sign/',
      summary: 'Reflecting on cultural gardens (Nav Grah and Rashi Vatikas) inside public parks—and how traditional cultural familiarity can either invite people into nature or oversimplify ecological diversity.',
      fieldNote: 'Field reflection: Inspired by visiting culturally themed garden corners during fieldwork and watching how families and older residents interact with trees they recognize from folklore versus native woodland stands.',
      methods: ['Cultural Ecology', 'Nature Interpretation', 'Public Space Observation'],
      bibtex: `@article{biswas2026zodiac,\n  author = {Biswas, Arkraj},\n  title = {When a Forest Knows Your Zodiac Sign},\n  journal = {CSR Times},\n  year = {2026},\n  month = {aug}\n}`
    }
  ];

  /* =======================================================================
     MOUNT ON ABOUT.HTML
     ======================================================================= */
  function enhanceAboutPage() {
    if (!/about\.html/i.test(window.location.pathname)) return;
    const main = document.querySelector('main');
    if (!main || document.getElementById('ar-about-upgraded')) return;

    const container = document.createElement('section');
    container.id = 'ar-about-upgraded';
    container.className = 'ar-wrap';
    container.innerHTML = `
      <div class="ar-sec-head">
        <div>
          <p class="ar-eyebrow">Perspective &amp; Field Trajectory</p>
          <h2 class="ar-h2">From soil to satellites to policy.</h2>
        </div>
        <p class="ar-lead">
          How agricultural fieldwork, atmospheric science, and on-the-ground policy evaluation shaped the way I study landscapes.
        </p>
      </div>

      <div class="ar-essay-grid">
        <div class="ar-prose">
          <p>
            I learned early on that a landscape looks very different on a false-color satellite composite than it does when you are standing in it at two in the afternoon in May.
          </p>
          <p>
            My training started in agricultural sciences at the University of Agricultural Sciences, Dharwad. Spending four months living alongside farming communities in rural Karnataka during my undergraduate fieldwork taught me to pay close attention to soil moisture, monsoon timing, and the everyday economics of how people manage land.
          </p>
          <p>
            When I moved to Banaras Hindu University for my master’s in Environmental Sciences (specializing in Earth and Atmospheric Sciences), I zoomed out—using thermal infrared sensors, vegetation indices, and spatial econometrics to track how growing cities trap heat and where surviving green spaces still cool their neighborhoods.
          </p>
          <div class="ar-pullquote">
            “Today, at National CAMPA under the Ministry of Environment, Forest and Climate Change, my work brings both scales together: checking what the satellite pixel says against what the forest guard, the gardener, and the morning walker actually experience.”
          </div>
          <p>
            When I’m not running spatial models in Python or writing up field notes, you’ll usually find me mentoring students in GIS and environmental science, tending to plants, listening to astronomy podcasts, or looking out the window on long Indian train journeys between field sites.
          </p>
        </div>

        <aside class="ar-cred-card" aria-label="Academic qualifications and roles">
          <p class="ar-eyebrow">Qualifications &amp; Fellowships</p>
          <h3 style="font-size:1.05rem;margin:0.2rem 0 0.65rem;">National Research Eligibility &amp; Training</h3>
          <div class="ar-badge-list">
            <span class="ar-badge">UGC-NET JRF Qualified</span>
            <span class="ar-badge">ICAR-JRF Qualified</span>
            <span class="ar-badge">ASRB-NET Qualified</span>
            <span class="ar-badge">Embark India Fellow (IIPA Delhi)</span>
            <span class="ar-badge">Innovation Ambassador · Govt. of India</span>
          </div>

          <hr style="border:none;border-top:1px solid rgba(120,125,118,0.18);margin:1.1rem 0;" />

          <p class="ar-eyebrow">Education</p>
          <ul style="list-style:none;padding:0;margin:0.5rem 0 0;font-size:0.85rem;line-height:1.6;">
            <li style="margin-bottom:0.55rem;">
              <strong>M.Sc. Environmental Sciences (Earth &amp; Atmospheric Sciences)</strong><br/>
              <span style="opacity:0.76;">Banaras Hindu University (BHU)</span>
            </li>
            <li style="margin-bottom:0.55rem;">
              <strong>B.Sc. (Hons.) Agricultural Sciences</strong><br/>
              <span style="opacity:0.76;">University of Agricultural Sciences, Dharwad</span>
            </li>
            <li>
              <strong>Diploma in International Affairs &amp; Diplomacy</strong><br/>
              <span style="opacity:0.76;">Indian Institute of Governance and Leadership</span>
            </li>
          </ul>
        </aside>
      </div>

      <!-- How I Work: Question-Driven Methodological Toolkit -->
      <div class="ar-sec-head" style="margin-top:3.5rem;">
        <div>
          <p class="ar-eyebrow">Methodological Toolkit</p>
          <h2 class="ar-h2">Tools, grouped by the questions they answer</h2>
        </div>
        <p class="ar-lead">Software is only as useful as the question you ask with it.</p>
      </div>

      <div class="ar-stack-grid">
        <div class="ar-stack-card">
          <p class="ar-eyebrow">01 · Reading the Surface &amp; Canopy</p>
          <h3>Satellite Remote Sensing &amp; GIS</h3>
          <p>Tracking decadal land-cover transitions, urban surface warming, and canopy health across multi-spectral and thermal bands.</p>
          <div class="ar-badge-list">
            <span class="ar-badge">Google Earth Engine</span>
            <span class="ar-badge">QGIS &amp; ArcGIS Pro</span>
            <span class="ar-badge">ENVI &amp; OpenGrADS</span>
            <span class="ar-badge">Landsat 8/9 TIRS</span>
            <span class="ar-badge">Sentinel-2 · MODIS · LISS-4</span>
            <span class="ar-badge">NDVI · LST · NDBI · EVI</span>
          </div>
        </div>

        <div class="ar-stack-card">
          <p class="ar-eyebrow">02 · Testing Spatial Relationships</p>
          <h3>Spatial Econometrics &amp; Data Science</h3>
          <p>Moving beyond visual maps to test where relationships hold locally, where clusters form, and how ecological and social variables couple.</p>
          <div class="ar-badge-list">
            <span class="ar-badge">Python &amp; R</span>
            <span class="ar-badge">Geographically Weighted Regression (GWR)</span>
            <span class="ar-badge">Global &amp; Local Moran's I</span>
            <span class="ar-badge">Coupling Coordination (CCDM)</span>
            <span class="ar-badge">MATLAB · Leaflet · Power BI</span>
          </div>
        </div>

        <div class="ar-stack-card">
          <p class="ar-eyebrow">03 · Listening on the Ground</p>
          <h3>Field Audits &amp; Policy Evaluation</h3>
          <p>Ground-truthing remote sensing with human experience—understanding governance bottlenecks, visitor restoration, and rural livelihoods.</p>
          <div class="ar-badge-list">
            <span class="ar-badge">Key Informant Interviews (KII)</span>
            <span class="ar-badge">Focus Group Discussions (FGD)</span>
            <span class="ar-badge">Perceived Restorativeness (PRS)</span>
            <span class="ar-badge">RAWE Participatory Appraisal</span>
            <span class="ar-badge">Public Forestry Monitoring</span>
          </div>
        </div>
      </div>

      <!-- Interactive Trajectory Timeline -->
      <div class="ar-sec-head" style="margin-top:3.5rem;">
        <div>
          <p class="ar-eyebrow">Chronology</p>
          <h2 class="ar-h2">Roles, training &amp; academic path</h2>
        </div>
        <div class="ar-pills" id="ar-tl-pills" role="group" aria-label="Filter timeline">
          <button type="button" class="ar-pill" data-tl="all" aria-pressed="true">All</button>
          <button type="button" class="ar-pill" data-tl="roles" aria-pressed="false">Research &amp; Leadership</button>
          <button type="button" class="ar-pill" data-tl="education" aria-pressed="false">Academic Degrees</button>
          <button type="button" class="ar-pill" data-tl="training" aria-pressed="false">Fellowships &amp; Field Training</button>
        </div>
      </div>
      <div class="ar-timeline" id="ar-tl-list"></div>
    `;

    main.appendChild(container);

    const tlList = document.getElementById('ar-tl-list');
    function renderTimeline(filter) {
      const items = filter === 'all' ? TIMELINE_ITEMS : TIMELINE_ITEMS.filter(i => i.category === filter);
      tlList.innerHTML = items.map(item => `
        <article class="ar-tl-item">
          <div class="ar-tl-date">${item.period}</div>
          <div>
            <h3 class="ar-tl-role">${item.role}</h3>
            <p class="ar-tl-org">${item.org}</p>
            <p class="ar-tl-desc">${item.desc}</p>
          </div>
        </article>
      `).join('');
    }

    container.querySelectorAll('#ar-tl-pills button').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#ar-tl-pills button').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        renderTimeline(btn.dataset.tl);
      });
    });

    renderTimeline('all');
  }

  /* =======================================================================
     MOUNT ON RESEARCH.HTML
     ======================================================================= */
  function enhanceResearchPage() {
    if (!/research\.html/i.test(window.location.pathname)) return;
    const main = document.querySelector('main');
    if (!main || document.getElementById('ar-research-upgraded')) return;

    const section = document.createElement('section');
    section.id = 'ar-research-upgraded';
    section.className = 'ar-wrap';
    section.innerHTML = `
      <div class="ar-sec-head">
        <div>
          <p class="ar-eyebrow">Interactive Research Archive &amp; Field Notes</p>
          <h2 class="ar-h2">Studies, policy briefs &amp; field writing</h2>
        </div>
        <p class="ar-lead">
          Filter by theme or open the field-context drawer on any entry to read the story and methodology behind the work.
        </p>
      </div>

      <div class="ar-filter-bar">
        <div class="ar-pills" id="ar-res-pills" role="group" aria-label="Filter research archive">
          <button type="button" class="ar-pill" data-filter="all" aria-pressed="true">All Work (${RESEARCH_ARCHIVE.length})</button>
          <button type="button" class="ar-pill" data-filter="climate" aria-pressed="false">Climate &amp; UHI</button>
          <button type="button" class="ar-pill" data-filter="environment" aria-pressed="false">Forestry &amp; Ecology</button>
          <button type="button" class="ar-pill" data-filter="gis" aria-pressed="false">GIS &amp; Spatial Models</button>
          <button type="button" class="ar-pill" data-filter="policy" aria-pressed="false">Policy &amp; Governance</button>
          <button type="button" class="ar-pill" data-filter="writing" aria-pressed="false">Essays &amp; Briefs</button>
        </div>

        <input
          type="search"
          id="ar-res-search"
          class="ar-search-input"
          placeholder="Search method, sensor, city, or topic…"
          aria-label="Search research archive"
        />
      </div>

      <div class="ar-archive-list" id="ar-archive-list"></div>
    `;

    // Insert near top of main or after the hero section of research.html
    const firstSec = main.querySelector('section');
    if (firstSec) firstSec.insertAdjacentElement('afterend', section);
    else main.appendChild(section);

    const state = { filter: 'all', query: '' };
    const listEl = document.getElementById('ar-archive-list');
    const searchEl = document.getElementById('ar-res-search');

    // Sync with URL hash if visitor clicked #filter-climate or #filter-environment from index.html
    function syncFromHash() {
      const h = (window.location.hash || '').toLowerCase();
      if (h.includes('climate')) state.filter = 'climate';
      else if (h.includes('environment')) state.filter = 'environment';
      else if (h.includes('policy')) state.filter = 'policy';
      else if (h.includes('gis')) state.filter = 'gis';

      section.querySelectorAll('#ar-res-pills button').forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.filter === state.filter));
      });
    }

    function renderArchive() {
      const q = state.query.toLowerCase();
      const filtered = RESEARCH_ARCHIVE.filter(item => {
        const matchCat = state.filter === 'all' || item.category.includes(state.filter);
        const matchQ = !q ||
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.fieldNote.toLowerCase().includes(q) ||
          item.methods.join(' ').toLowerCase().includes(q);
        return matchCat && matchQ;
      });

      listEl.innerHTML = filtered.map(item => `
        <article class="ar-study-card" id="${item.id}">
          <div class="ar-study-meta">
            <span>${item.type}</span>
            <span>${item.year}</span>
          </div>
          <h3 class="ar-study-title"><a href="${item.href}">${item.title}</a></h3>
          <p class="ar-study-summary">${item.summary}</p>

          <div class="ar-badge-list" style="margin-bottom:0.9rem;">
            ${item.methods.map(m => `<span class="ar-badge">${m}</span>`).join('')}
          </div>

          <div class="ar-study-actions">
            <a href="${item.href}" class="ar-action-btn">Open entry →</a>
            <button type="button" class="ar-action-btn" data-toggle-note="${item.id}" aria-expanded="false">
              Read field context &amp; method ▾
            </button>
            ${item.bibtex ? `<button type="button" class="ar-action-btn" data-copy-bib="${item.id}">Copy BibTeX</button>` : ''}
          </div>

          <div class="ar-field-drawer" id="note-${item.id}" hidden>
            ${item.fieldNote}
          </div>
        </article>
      `).join('');

      // Bind drawer toggles
      listEl.querySelectorAll('[data-toggle-note]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.toggleNote;
          const drawer = document.getElementById(`note-${id}`);
          const isHidden = drawer.hasAttribute('hidden');
          if (isHidden) {
            drawer.removeAttribute('hidden');
            btn.setAttribute('aria-expanded', 'true');
            btn.textContent = 'Hide field context ▴';
          } else {
            drawer.setAttribute('hidden', '');
            btn.setAttribute('aria-expanded', 'false');
            btn.textContent = 'Read field context & method ▾';
          }
        });
      });

      // Bind BibTeX copy buttons
      listEl.querySelectorAll('[data-copy-bib]').forEach(btn => {
        btn.addEventListener('click', () => {
          const found = RESEARCH_ARCHIVE.find(r => r.id === btn.dataset.copyBib);
          if (found && found.bibtex && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(found.bibtex);
            btn.textContent = 'Copied BibTeX ✓';
            setTimeout(() => { btn.textContent = 'Copy BibTeX'; }, 2000);
          }
        });
      });
    }

    section.querySelectorAll('#ar-res-pills button').forEach(btn => {
      btn.addEventListener('click', () => {
        section.querySelectorAll('#ar-res-pills button').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        state.filter = btn.dataset.filter;
        renderArchive();
      });
    });

    searchEl.addEventListener('input', () => {
      state.query = searchEl.value.trim();
      renderArchive();
    });

    window.addEventListener('hashchange', () => {
      syncFromHash();
      renderArchive();
    });

    syncFromHash();
    renderArchive();
  }

  document.addEventListener('DOMContentLoaded', () => {
    enhanceAboutPage();
    enhanceResearchPage();
  });
})();
