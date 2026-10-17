/**
 * "Build With Me · Open Climate & Governance Commons" Interactive Module
 * Transforms arkrajbiswas.com into an open collaborative workbench for
 * climate resilience, transparent governance data, and joint GitHub/research projects.
 */
(function () {
  'use strict';

  const GITHUB_REPO = 'https://github.com/Arkraj7/arkrajbiswas';
  const EMAIL = 'arkraj.biswas6@gmail.com';

  const TRACKS = [
    {
      id: 'open-code',
      num: '01',
      badge: 'GitHub & GEE',
      title: 'Open Geospatial & Climate Code',
      desc: 'Co-build reproducible Google Earth Engine scripts, Python/R spatial pipelines, and ward-level heat or canopy calculators for Indian cities.',
      tags: ['Python / R', 'Earth Engine', 'Open-Meteo / ERA5', 'Leaflet'],
      ideas: [
        'Automated LST & Park Cool Island (PCI) scripts for Tier-2 and Tier-3 Indian cities',
        'District-level Vapour Pressure Deficit (VPD) & agricultural drought notebooks',
        'Lightweight, low-bandwidth web dashboards for local climate literacy'
      ],
      issueTitle: '[Collab: Open Code] Idea for geospatial / climate tool',
      pitchTemplate: 'Hi Arkraj,\n\nI’d love to build an open-source script/tool with you. Here is what I am working on (or would like to build together): '
    },
    {
      id: 'public-governance',
      num: '02',
      badge: 'Civic Data & Policy',
      title: 'Public-Facing Governance & Transparency',
      desc: 'Turn public forestry programs, urban greening budgets, and restoration targets into transparent, citizen-readable trackers.',
      tags: ['Nagar Van', 'Digital MRV', 'Open Budgets', 'Policy Audit'],
      ideas: [
        'Citizen-readable urban forest survival & microclimate audit templates',
        'Transparent monitoring frameworks connecting satellite canopy data with municipal wards',
        'Mapping socio-ecological equity and public park accessibility (15-min isochrones)'
      ],
      issueTitle: '[Collab: Public Governance] Open environmental data / policy tracker idea',
      pitchTemplate: 'Hi Arkraj,\n\nI’m interested in collaborating on transparent environmental governance and public-facing data. Here is the problem or dataset I have in mind: '
    },
    {
      id: 'joint-research',
      num: '03',
      badge: 'Co-Authorship',
      title: 'Share Research & Field Evidence',
      desc: 'Bring a local dataset, a field survey, or a regional question—let’s run the spatial models and co-author working papers or policy briefs.',
      tags: ['Working Papers', 'Field Surveys', 'GWR / LISA', 'Climate Justice'],
      ideas: [
        'Cross-city comparative Urban Heat Island & green space equity studies',
        'Linking rural agricultural livelihood surveys with long-term climate anomalies',
        'Co-authored policy briefs and field-reported essays on restoration in India'
      ],
      issueTitle: '[Collab: Joint Research] Proposal for dataset / research collaboration',
      pitchTemplate: 'Hi Arkraj,\n\nI am researching [topic / region] and would love to explore a joint study, dataset exchange, or co-authored brief with you: '
    },
    {
      id: 'peer-lab',
      num: '04',
      badge: 'Student Commons',
      title: 'Student & Early-Career Peer Lab',
      desc: 'Working on your dissertation or first GIS script? Share what you are building, troubleshoot methodology, and publish open tools together.',
      tags: ['Thesis Lab', 'QGIS / R Help', 'Peer Review', 'Open Science'],
      ideas: [
        'Troubleshooting Landsat/Sentinel preprocessing or spatial autocorrelation in R/Python',
        'Turning a master’s dissertation map into an interactive public web story',
        'Sharing open field-survey protocols (KII / FGD) for environmental studies'
      ],
      issueTitle: '[Collab: Peer Lab] Sharing my student research / GIS workflow',
      pitchTemplate: 'Hi Arkraj,\n\nI’m currently a student / early-career researcher working on [topic] and wanted to share what I’m building (or ask for your thoughts on): '
    }
  ];

  function buildMarkup() {
    return `
      <div class="bwm-shell">
        <div class="bwm-header">
          <div>
            <p class="bwm-eyebrow">
              <span class="bwm-pulse-dot" aria-hidden="true"></span>
              <span>Build With Me · Open Climate &amp; Governance Commons</span>
            </p>
            <h2 class="bwm-title">
              Science shouldn’t sit in locked PDFs. <em>Come build with me.</em>
            </h2>
          </div>
          <div class="bwm-narrative">
            <p>
              Too much environmental data in India stays buried inside static reports while our cities grow hotter, our forests face pressure, and local communities look for clear answers. I don’t want this website to just be a shelf for my own work—I want it to be an open workbench.
            </p>
            <p>
              Whether you write Python or R code, map satellite scenes in Google Earth Engine, evaluate public policy, or document landscapes on the ground—bring a messy dataset, an unfinished GitHub repo, or a research question. Let’s make India more climate-resilient and data-transparent together.
            </p>
          </div>
        </div>

        <!-- 4 Clickable Collaborative Tracks -->
        <div class="bwm-tracks-grid" id="bwm-tracks" role="group" aria-label="Select a collaboration track">
          ${TRACKS.map((t, idx) => `
            <button type="button" class="bwm-track-card" data-track="${t.id}" aria-pressed="${idx === 0}">
              <div>
                <div class="bwm-track-top">
                  <span>TRACK ${t.num}</span>
                  <span>${t.badge}</span>
                </div>
                <h3 class="bwm-track-title">${t.title}</h3>
                <p class="bwm-track-desc">${t.desc}</p>
              </div>
              <div class="bwm-tag-row">
                ${t.tags.map(tag => `<span class="bwm-tag">${tag}</span>`).join('')}
              </div>
            </button>
          `).join('')}
        </div>

        <!-- Interactive Workbench & Pitch Launcher -->
        <div class="bwm-pitch-box">
          <div>
            <p class="bwm-eyebrow" style="margin-bottom:0.25rem;">What we can build in this track</p>
            <h3 id="bwm-active-title" style="margin:0 0 0.4rem;font-size:1.05rem;">${TRACKS[0].title}</h3>
            <ul class="bwm-blueprint-list" id="bwm-ideas-list">
              ${TRACKS[0].ideas.map(idea => `<li>→ ${idea}</li>`).join('')}
            </ul>
            <p style="margin:0.85rem 0 0;font-size:0.76rem;opacity:0.72;font-family:ui-monospace,monospace;">
              All open-source code and public datasets are credited to every contributor.
            </p>
          </div>

          <div>
            <p class="bwm-eyebrow" style="margin-bottom:0.45rem;">Share your idea, repo, or research note</p>
            <div class="bwm-form-row">
              <input type="text" id="bwm-name" class="bwm-input" placeholder="Your name &amp; role / city" aria-label="Your name and role" />
              <input type="text" id="bwm-link" class="bwm-input" placeholder="GitHub, Scholar, or dataset link (optional)" aria-label="Your GitHub or research link" />
            </div>
            <textarea id="bwm-note" class="bwm-textarea" aria-label="Collaboration pitch">${TRACKS[0].pitchTemplate}</textarea>

            <div class="bwm-actions">
              <a id="bwm-gh-issue" class="bwm-btn-primary" href="#" target="_blank" rel="noopener noreferrer">
                Open Collaboration Issue on GitHub ↗
              </a>
              <a id="bwm-gmail-link" class="bwm-btn-secondary" href="#" target="_blank" rel="noopener noreferrer">
                Send via Gmail Web ↗
              </a>
              <a id="bwm-mailto-link" class="bwm-btn-secondary" href="#">
                Email App ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function mountBuildWithMe() {
    if (document.getElementById('bwm-root-section')) return;

    // Locate the final callout section on index.html ("Have a research question, project or idea? Let's talk.")
    // or append before footer on research.html / contact.html
    const main = document.querySelector('main');
    if (!main) return;

    const section = document.createElement('section');
    section.id = 'bwm-root-section';
    section.className = 'bwm-section';
    section.innerHTML = buildMarkup();

    const headings = Array.from(main.querySelectorAll('h2'));
    const talkH2 = headings.find(h => /Have a research question, project or idea/i.test(h.textContent));
    if (talkH2 && talkH2.closest('section')) {
      talkH2.closest('section').replaceWith(section);
    } else {
      main.appendChild(section);
    }

    let currentTrack = TRACKS[0];
    const titleEl = document.getElementById('bwm-active-title');
    const ideasEl = document.getElementById('bwm-ideas-list');
    const nameEl = document.getElementById('bwm-name');
    const linkEl = document.getElementById('bwm-link');
    const noteEl = document.getElementById('bwm-note');
    const ghBtn = document.getElementById('bwm-gh-issue');
    const gmailBtn = document.getElementById('bwm-gmail-link');
    const mailtoBtn = document.getElementById('bwm-mailto-link');

    function syncActionUrls() {
      const contributor = nameEl.value.trim() || 'Collaborator';
      const refLink = linkEl.value.trim() ? `\n\nLink / Repo / Paper: ${linkEl.value.trim()}` : '';
      const fullBody = `${noteEl.value.trim()}${refLink}\n\n—${contributor}`;

      const issueTitle = encodeURIComponent(`${currentTrack.issueTitle} (${contributor})`);
      const issueBody = encodeURIComponent(`### Track\n${currentTrack.title}\n\n### Pitch / Proposal\n${fullBody}`);

      ghBtn.href = `${GITHUB_REPO}/issues/new?title=${issueTitle}&body=${issueBody}`;
      gmailBtn.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}&su=${issueTitle}&body=${encodeURIComponent(fullBody)}`;
      mailtoBtn.href = `mailto:${EMAIL}?subject=${issueTitle}&body=${encodeURIComponent(fullBody)}`;
    }

    section.querySelectorAll('#bwm-tracks button').forEach(btn => {
      btn.addEventListener('click', () => {
        section.querySelectorAll('#bwm-tracks button').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        const found = TRACKS.find(t => t.id === btn.dataset.track);
        if (found) {
          currentTrack = found;
          titleEl.textContent = found.title;
          ideasEl.innerHTML = found.ideas.map(i => `<li>→ ${i}</li>`).join('');
          noteEl.value = found.pitchTemplate;
          syncActionUrls();
        }
      });
    });

    [nameEl, linkEl, noteEl].forEach(el => el.addEventListener('input', syncActionUrls));
    syncActionUrls();
  }

  document.addEventListener('DOMContentLoaded', mountBuildWithMe);
})();
