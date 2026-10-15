/**
 * Interactive Contact Composer & Researcher Directory for contact.html
 * Provides 1-click topic templates, direct Gmail Web compose, default mailto,
 * and instant clipboard copy so visitors on any device can reach Arkraj Biswas effortlessly.
 */
(function () {
  'use strict';

  const EMAIL = 'arkraj.biswas6@gmail.com';

  const TOPICS = [
    {
      id: 'research',
      num: '01',
      title: 'Research & Spatial Collaboration',
      desc: 'Joint studies on urban heat islands, urban forestry, satellite remote sensing, or socio-ecological modeling.',
      subject: 'Research Collaboration Inquiry — [Topic / Institution]',
      template: 'Hi Arkraj,\n\nI came across your work on arkrajbiswas.com and would love to discuss a potential research collaboration around '
    },
    {
      id: 'policy',
      num: '02',
      title: 'Policy Evaluation & Urban Forestry',
      desc: 'Nagar Van Yojana assessments, green infrastructure monitoring, or restoration partnerships via EcoServe.',
      subject: 'Policy / Urban Forestry Discussion — [Organization]',
      template: 'Hi Arkraj,\n\nI was reading your urban forestry assessment and policy work and wanted to connect regarding '
    },
    {
      id: 'speaking',
      num: '03',
      title: 'Writing, Panels & Field Reporting',
      desc: 'Invitations for environmental journalism, policy briefs, workshops, or climate and sustainability summits.',
      subject: 'Speaking / Writing Invitation — [Event or Publication]',
      template: 'Hi Arkraj,\n\nWe are organizing / commissioning a piece on environmental and climate themes and would love to invite you to '
    },
    {
      id: 'mentorship',
      num: '04',
      title: 'GIS & Student Mentorship',
      desc: 'Guidance for students working with Google Earth Engine, QGIS, R/Python spatial models, or JRF/NET preparation.',
      subject: 'Student Query: GIS & Environmental Science Mentorship',
      template: 'Hi Arkraj,\n\nI am a student working on [your topic/university] and had a quick question about your workflow with '
    }
  ];

  function copyText(text, btn, doneLabel, idleLabel) {
    const done = () => {
      btn.textContent = doneLabel;
      setTimeout(() => { btn.textContent = idleLabel; }, 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
      done();
    }
  }

  function initContactPage() {
    if (!/contact\.html/i.test(window.location.pathname)) return;
    const main = document.querySelector('main');
    if (!main || document.getElementById('ct-upgraded-root')) return;

    const section = document.createElement('section');
    section.id = 'ct-upgraded-root';
    section.className = 'ct-wrap';
    section.innerHTML = `
      <div class="ct-head">
        <div>
          <p class="ct-eyebrow">Direct Reach &amp; Collaboration</p>
          <h2 class="ct-h2">What I’m always happy to talk about.</h2>
        </div>
        <p class="ct-lead">
          Whether you are a fellow researcher, a policy practitioner, an editor, or a student figuring out your first satellite script—pick a topic below to draft a note or reach out directly.
        </p>
      </div>

      <!-- 4 Clickable Conversation Pathways -->
      <div class="ct-pathways" id="ct-pathway-grid" role="group" aria-label="Select a conversation topic">
        ${TOPICS.map((t, i) => `
          <button type="button" class="ct-pathway-card" data-topic="${t.id}" aria-pressed="${i === 0}">
            <div>
              <span class="ct-pathway-num">${t.num} · TOPIC</span>
              <h3 class="ct-pathway-title">${t.title}</h3>
              <p class="ct-pathway-desc">${t.desc}</p>
            </div>
            <span class="ct-pathway-cta">Use template →</span>
          </button>
        `).join('')}
      </div>

      <!-- 2-Column Interactive Composer & Directory -->
      <div class="ct-workbench">
        <div class="ct-composer-card">
          <p class="ct-eyebrow">Quick-Draft Message Composer</p>
          <h3 style="margin:0 0 1rem;font-size:1.1rem;font-weight:600;">Write your note</h3>

          <div class="ct-field-row">
            <div>
              <label class="ct-label" for="ct-name">Your Name</label>
              <input id="ct-name" class="ct-input" type="text" placeholder="Dr. / Prof. / Name" />
            </div>
            <div>
              <label class="ct-label" for="ct-org">Affiliation / Organization</label>
              <input id="ct-org" class="ct-input" type="text" placeholder="University, Institute, or Media" />
            </div>
          </div>

          <div class="ct-field">
            <label class="ct-label" for="ct-subject">Subject Line</label>
            <input id="ct-subject" class="ct-input" type="text" value="${TOPICS[0].subject}" />
          </div>

          <div class="ct-field">
            <label class="ct-label" for="ct-body">Message</label>
            <textarea id="ct-body" class="ct-textarea">${TOPICS[0].template}</textarea>
          </div>

          <div class="ct-send-bar">
            <a id="ct-gmail-btn" class="ct-btn-primary" href="#" target="_blank" rel="noopener noreferrer">
              Open in Gmail Web ↗
            </a>
            <a id="ct-mailto-btn" class="ct-btn-secondary" href="#">
              Open in Email App ↗
            </a>
            <button type="button" id="ct-copy-draft-btn" class="ct-btn-secondary">
              Copy Message &amp; Email
            </button>
          </div>
          <p style="margin:0.65rem 0 0;font-size:0.75rem;opacity:0.7;">
            No third-party form trackers—opens directly in your preferred mail client or copies to your clipboard.
          </p>
        </div>

        <!-- Right Column: Direct Academic & Social Directory -->
        <aside class="ct-directory-card" aria-label="Direct contact directory">
          <p class="ct-eyebrow">Direct Coordinates</p>
          <h3 style="margin:0 0 0.35rem;font-size:1.1rem;font-weight:600;">Reach me directly</h3>
          <p style="margin:0;font-size:0.84rem;opacity:0.8;line-height:1.5;">
            I usually reply within 24–48 hours (unless I’m in the middle of a field survey without cell reception).
          </p>

          <div class="ct-email-box">
            <span id="ct-email-text">${EMAIL}</span>
            <button type="button" id="ct-copy-email-btn" class="ct-btn-secondary" style="padding:0.25rem 0.55rem;font-size:0.73rem;">
              Copy Email
            </button>
          </div>

          <ul class="ct-dir-list">
            <li>
              <span style="opacity:0.72">Current Base</span>
              <span><strong>New Delhi, India</strong></span>
            </li>
            <li>
              <span style="opacity:0.72">Local Time (IST)</span>
              <span id="ct-ist-clock" style="font-family:ui-monospace,monospace;font-size:0.8rem;">UTC+5:30</span>
            </li>
            <li>
              <span style="opacity:0.72">Affiliation</span>
              <span>National CAMPA (MoEFCC)</span>
            </li>
            <li>
              <span style="opacity:0.72">Google Scholar</span>
              <a href="https://scholar.google.com/citations?hl=en&user=t79hnZAAAAAJ" target="_blank" rel="noopener">Citations &amp; Papers ↗</a>
            </li>
            <li>
              <span style="opacity:0.72">LinkedIn</span>
              <a href="https://in.linkedin.com/in/arkraj-biswas-kugel" target="_blank" rel="noopener">in/arkraj-biswas-kugel ↗</a>
            </li>
            <li>
              <span style="opacity:0.72">GitHub</span>
              <a href="https://github.com/Arkraj7" target="_blank" rel="noopener">github.com/Arkraj7 ↗</a>
            </li>
          </ul>
        </aside>
      </div>
    `;

    main.appendChild(section);

    const nameEl = document.getElementById('ct-name');
    const orgEl = document.getElementById('ct-org');
    const subjEl = document.getElementById('ct-subject');
    const bodyEl = document.getElementById('ct-body');
    const gmailBtn = document.getElementById('ct-gmail-btn');
    const mailtoBtn = document.getElementById('ct-mailto-btn');
    const copyDraftBtn = document.getElementById('ct-copy-draft-btn');
    const copyEmailBtn = document.getElementById('ct-copy-email-btn');

    function syncLinks() {
      const sender = [nameEl.value.trim(), orgEl.value.trim()].filter(Boolean).join(' · ');
      const fullSubj = subjEl.value.trim() || 'Inquiry from arkrajbiswas.com';
      const sig = sender ? `\n\nBest regards,\n${sender}` : '';
      const fullBody = bodyEl.value + sig;

      const encSubj = encodeURIComponent(fullSubj);
      const encBody = encodeURIComponent(fullBody);

      gmailBtn.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}&su=${encSubj}&body=${encBody}`;
      mailtoBtn.href = `mailto:${EMAIL}?subject=${encSubj}&body=${encBody}`;
    }

    document.querySelectorAll('#ct-pathway-grid button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#ct-pathway-grid button').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        const found = TOPICS.find(t => t.id === btn.dataset.topic);
        if (found) {
          subjEl.value = found.subject;
          bodyEl.value = found.template;
          syncLinks();
          bodyEl.focus();
        }
      });
    });

    [nameEl, orgEl, subjEl, bodyEl].forEach(el => el.addEventListener('input', syncLinks));

    copyDraftBtn.addEventListener('click', () => {
      const payload = `To: ${EMAIL}\nSubject: ${subjEl.value}\n\n${bodyEl.value}`;
      copyText(payload, copyDraftBtn, 'Copied Note + Email ✓', 'Copy Message & Email');
    });

    copyEmailBtn.addEventListener('click', () => {
      copyText(EMAIL, copyEmailBtn, 'Copied ✓', 'Copy Email');
    });

    // Live New Delhi IST Clock
    function updateClock() {
      const el = document.getElementById('ct-ist-clock');
      if (!el) return;
      try {
        const nowStr = new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }).format(new Date());
        el.textContent = `${nowStr} IST (UTC+5:30)`;
      } catch (_) {
        el.textContent = 'IST (UTC+5:30)';
      }
    }
    updateClock();
    setInterval(updateClock, 30000);
    syncLinks();
  }

  document.addEventListener('DOMContentLoaded', initContactPage);
})();
