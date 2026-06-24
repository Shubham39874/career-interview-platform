/* ============================================================
   CareerPrep — Complete Single-Page Application
   ============================================================
   Architecture: Vanilla JS state machine.
   All DOM mutation goes through render() → page-specific function.
   API calls use fetch() with async/await.
   ============================================================ */

'use strict';

/* ── Constants ───────────────────────────────────────────── */

const API_BASE = '/api';

const CATEGORIES = [
  {
    id: 'Commerce',
    label: 'Commerce',
    desc: 'Explore finance, audit, tax, and consulting careers',
    icon: 'fa-solid fa-coins',
    iconClass: 'commerce',
  },
  {
    id: 'IT',
    label: 'Information Technology',
    desc: 'Explore technology, engineering, and data careers',
    icon: 'fa-solid fa-laptop-code',
    iconClass: 'it',
  },
];

const DOMAINS = {
  Commerce: [
    { name: 'Audit',       icon: 'fa-solid fa-magnifying-glass-chart', hint: 'Financial statement auditing' },
    { name: 'Tax',         icon: 'fa-solid fa-file-invoice-dollar',    hint: 'Direct, indirect & international tax' },
    { name: 'Valuation',   icon: 'fa-solid fa-scale-balanced',         hint: 'DCF, comparables & transaction multiples' },
    { name: 'Consulting',  icon: 'fa-solid fa-handshake',              hint: 'Strategy, ops & change management' },
  ],
  IT: [
    { name: 'Software Engineering', icon: 'fa-solid fa-code',         hint: 'Algorithms, system design & coding' },
    { name: 'Data Science',         icon: 'fa-solid fa-brain',        hint: 'ML, statistics & modelling' },
    { name: 'Data Analyst',         icon: 'fa-solid fa-chart-bar',    hint: 'SQL, BI & analytics' },
    { name: 'Product Analyst',      icon: 'fa-solid fa-bullseye',     hint: 'Metrics, A/B testing & product thinking' },
  ],
};

const ALL_COMPANIES = [
  { name: 'EY',        type: 'commerce', color: '#FFD700', bg: '#1a1a2e', abbr: 'EY',  icon: 'fa-solid fa-building' },
  { name: 'Deloitte',  type: 'commerce', color: '#86BC25', bg: '#2c5f2e', abbr: 'D',   icon: 'fa-solid fa-building-columns' },
  { name: 'KPMG',      type: 'commerce', color: '#00338D', bg: '#00338d', abbr: 'K',   icon: 'fa-solid fa-landmark' },
  { name: 'PwC',       type: 'commerce', color: '#D04A02', bg: '#d04a02', abbr: 'P',   icon: 'fa-solid fa-briefcase' },
  { name: 'Amazon',    type: 'it',       color: '#FF9900', bg: '#232f3e', abbr: 'A',   icon: 'fa-brands fa-amazon' },
  { name: 'Google',    type: 'it',       color: '#4285F4', bg: '#4285f4', abbr: 'G',   icon: 'fa-brands fa-google' },
  { name: 'Microsoft', type: 'it',       color: '#00A4EF', bg: '#0078d4', abbr: 'M',   icon: 'fa-brands fa-microsoft' },
];

const COMMERCE_ROLES = [
  { name: 'Audit',                  icon: 'fa-solid fa-magnifying-glass-chart' },
  { name: 'Tax',                    icon: 'fa-solid fa-file-invoice-dollar' },
  { name: 'Consulting',             icon: 'fa-solid fa-handshake' },
  { name: 'Strategy & Transactions',icon: 'fa-solid fa-chart-line' },
  { name: 'Valuation',              icon: 'fa-solid fa-scale-balanced' },
];

const IT_ROLES = [
  { name: 'Software Engineering', icon: 'fa-solid fa-code' },
  { name: 'Data Science',         icon: 'fa-solid fa-brain' },
  { name: 'Data Analyst',         icon: 'fa-solid fa-chart-bar' },
  { name: 'Product Analyst',      icon: 'fa-solid fa-bullseye' },
];

/* ── App State ───────────────────────────────────────────── */

const AppState = {
  page:             'home',    // 'home' | 'careers' | 'domains' | 'companies' | 'company-detail' | 'questions'
  category:         null,      // 'Commerce' | 'IT'
  domain:           null,      // e.g. 'Audit'
  company:          null,      // e.g. 'EY'
  role:             null,      // e.g. 'Audit' (role within company)
  questions:        [],        // raw question objects from API
  searchQuery:      '',
  difficultyFilter: 'All',
};

/* ── Navigation ──────────────────────────────────────────── */

/**
 * Navigate to a page, optionally merging new params into AppState.
 * Resets search/filter when moving to a new questions view.
 * @param {string} page
 * @param {Object} [params]
 */
function navigate(page, params = {}) {
  Object.assign(AppState, params);
  AppState.page = page;
  if (page !== 'questions') {
    AppState.searchQuery      = '';
    AppState.difficultyFilter = 'All';
  }
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Main Render Dispatcher ──────────────────────────────── */

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';                    // clear
  app.classList.remove('page-enter');
  void app.offsetWidth;                  // force reflow for re-animation
  app.classList.add('page-enter');

  switch (AppState.page) {
    case 'home':           renderHome(app);          break;
    case 'careers':        renderCareers(app);        break;
    case 'domains':        renderDomains(app);        break;
    case 'companies':      renderCompanies(app);      break;
    case 'company-detail': renderCompanyDetail(app);  break;
    case 'questions':      renderQuestionsPage(app);  break;
    default:               renderHome(app);
  }
}

/* ── Breadcrumbs ─────────────────────────────────────────── */

/**
 * Builds an ordered list of breadcrumb objects based on current AppState.
 * @returns {{ label: string, onclick: string|null }[]}
 */
function buildBreadcrumbs() {
  const crumbs = [];

  crumbs.push({ label: 'Home', onclick: "navigate('home')" });

  if (['careers','domains','companies','company-detail','questions'].includes(AppState.page)) {
    crumbs.push({ label: 'Careers', onclick: "navigate('careers')" });
  }

  if (['domains','companies','company-detail','questions'].includes(AppState.page) && AppState.category) {
    crumbs.push({
      label: AppState.category,
      onclick: `navigate('domains', { category: '${esc(AppState.category)}' })`,
    });
  }

  if (['companies','company-detail','questions'].includes(AppState.page) && AppState.domain) {
    crumbs.push({
      label: AppState.domain,
      onclick: `navigate('companies', { domain: '${esc(AppState.domain)}' })`,
    });
  }

  if (['company-detail','questions'].includes(AppState.page) && AppState.company) {
    crumbs.push({
      label: AppState.company,
      onclick: `navigate('company-detail', { company: '${esc(AppState.company)}' })`,
    });
  }

  if (AppState.page === 'questions' && AppState.role) {
    crumbs.push({ label: AppState.role,      onclick: null });
    crumbs.push({ label: 'Questions',        onclick: null });
  }

  return crumbs;
}

function renderBreadcrumbsHTML() {
  const crumbs = buildBreadcrumbs();
  const parts  = crumbs.map((c, i) => {
    const isLast = i === crumbs.length - 1;
    if (isLast || !c.onclick) {
      return `<span class="current">${esc(c.label)}</span>`;
    }
    return `<a href="#" onclick="${c.onclick}; return false;">${esc(c.label)}</a>`;
  });
  return `<nav class="breadcrumbs" aria-label="breadcrumb">
    ${parts.join('<span class="sep">›</span>')}
  </nav>`;
}

/* ── Page: HOME ──────────────────────────────────────────── */

function renderHome(app) {
  app.innerHTML = `
    <!-- Hero -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-badge">
          <i class="fa-solid fa-star"></i>
          Real Interview Questions · No Fluff
        </div>
        <h1>Prepare Smarter for<br/>Career Interviews</h1>
        <p class="hero-sub">
          Browse hundreds of real interview questions organised by company, domain,
          and difficulty. Contributed by candidates who have been there.
        </p>
        <div class="hero-stats">
          <div class="hero-stat">
            <strong>7</strong>
            <span>Top Companies</span>
          </div>
          <div class="hero-stat">
            <strong>2</strong>
            <span>Career Tracks</span>
          </div>
          <div class="hero-stat">
            <strong>80+</strong>
            <span>Questions</span>
          </div>
          <div class="hero-stat">
            <strong>3</strong>
            <span>Difficulty Levels</span>
          </div>
        </div>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary btn-lg" onclick="navigate('careers')">
            <i class="fa-solid fa-compass"></i> Explore Careers
          </button>
          <button class="btn btn-secondary btn-lg" onclick="navigate('careers')">
            <i class="fa-solid fa-plus"></i> Add a Question
          </button>
        </div>
      </div>
    </section>

    <!-- Features Strip -->
    <div class="features-strip">
      <div class="container">
        <div class="features-grid">
          <div class="feature-item">
            <div class="feature-icon"><i class="fa-solid fa-building-user"></i></div>
            <div class="feature-title">Top Employers</div>
            <div class="feature-desc">EY, Deloitte, KPMG, PwC, Amazon, Google, Microsoft — all in one place.</div>
          </div>
          <div class="feature-item">
            <div class="feature-icon"><i class="fa-solid fa-layer-group"></i></div>
            <div class="feature-title">Multi-Domain</div>
            <div class="feature-desc">Commerce and IT tracks — Audit, Tax, Software Engineering, Data Science and more.</div>
          </div>
          <div class="feature-item">
            <div class="feature-icon"><i class="fa-solid fa-sliders"></i></div>
            <div class="feature-title">Filter by Difficulty</div>
            <div class="feature-desc">Instantly narrow down questions by Easy, Medium, or Hard difficulty.</div>
          </div>
          <div class="feature-item">
            <div class="feature-icon"><i class="fa-solid fa-users"></i></div>
            <div class="feature-title">Community Driven</div>
            <div class="feature-desc">Questions added by candidates who have actually interviewed at these firms.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA Band -->
    <section class="section">
      <div class="container" style="text-align:center;">
        <div class="empty-icon" style="background:linear-gradient(135deg,#e0e7ff,#c7d2fe);">
          <i class="fa-solid fa-rocket"></i>
        </div>
        <h2 style="font-size:1.75rem;font-weight:800;margin-bottom:10px;letter-spacing:-.3px;">
          Ready to start preparing?
        </h2>
        <p style="color:var(--text-secondary);max-width:420px;margin:0 auto 28px;font-size:.95rem;">
          Pick your career track and dive straight into real interview questions from top companies.
        </p>
        <button class="btn btn-indigo btn-lg" onclick="navigate('careers')">
          <i class="fa-solid fa-arrow-right"></i> Get Started — It's Free
        </button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="site-footer">
      <strong>CareerPrep</strong> &mdash; Interview questions platform &copy; ${new Date().getFullYear()}.
      For production use, replace JSON storage with a persistent database.
    </footer>
  `;
}

/* ── Page: CAREERS ───────────────────────────────────────── */

function renderCareers(app) {
  app.innerHTML = `
    <div class="page-header">
      <div class="page-header-inner">
        ${renderBreadcrumbsHTML()}
        <h1 class="page-title">Choose a Career Track</h1>
        <p class="page-subtitle">Select the industry you want to prepare for.</p>
      </div>
    </div>
    <div class="section">
      <div class="container">
        <div class="card-grid-2">
          ${CATEGORIES.map(cat => `
            <div class="card category-card" onclick="navigate('domains', { category: '${esc(cat.id)}' })" role="button" tabindex="0" aria-label="Select ${cat.label}">
              <div class="category-icon ${cat.iconClass}">
                <i class="${cat.icon}"></i>
              </div>
              <div>
                <div class="category-label">${esc(cat.label)}</div>
                <div class="category-desc">${esc(cat.desc)}</div>
              </div>
              <div class="card-arrow"><i class="fa-solid fa-arrow-right"></i></div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  bindCardKeyboard();
}

/* ── Page: DOMAINS ───────────────────────────────────────── */

function renderDomains(app) {
  const domains = DOMAINS[AppState.category] || [];
  app.innerHTML = `
    <div class="page-header">
      <div class="page-header-inner">
        ${renderBreadcrumbsHTML()}
        <h1 class="page-title">${esc(AppState.category)} — Select a Domain</h1>
        <p class="page-subtitle">Choose the domain you're interviewing for.</p>
      </div>
    </div>
    <div class="section">
      <div class="container">
        <div class="card-grid">
          ${domains.map(d => `
            <div class="card domain-card"
              onclick="navigate('companies', { domain: '${esc(d.name)}' })"
              role="button" tabindex="0" aria-label="Select ${d.name}">
              <div class="domain-icon"><i class="${d.icon}"></i></div>
              <div class="domain-info">
                <div class="domain-name">${esc(d.name)}</div>
                <div class="domain-hint">${esc(d.hint)}</div>
              </div>
              <div class="card-arrow"><i class="fa-solid fa-arrow-right"></i></div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  bindCardKeyboard();
}

/* ── Page: COMPANIES ─────────────────────────────────────── */

function renderCompanies(app) {
  app.innerHTML = `
    <div class="page-header">
      <div class="page-header-inner">
        ${renderBreadcrumbsHTML()}
        <h1 class="page-title">Select a Company</h1>
        <p class="page-subtitle">
          Showing questions for <strong>${esc(AppState.domain)}</strong> — pick a company to continue.
        </p>
      </div>
    </div>
    <div class="section">
      <div class="container">
        <div class="card-grid-lg">
          ${ALL_COMPANIES.map(co => `
            <div class="card company-card"
              onclick="navigate('company-detail', { company: '${esc(co.name)}' })"
              role="button" tabindex="0" aria-label="Select ${co.name}">
              <div class="company-logo" style="background:${co.bg};">
                <i class="${co.icon}" style="font-size:1.4rem;"></i>
              </div>
              <div class="company-name">${esc(co.name)}</div>
              <span class="company-type-badge ${co.type}">
                ${co.type === 'commerce' ? 'Commerce' : 'IT'}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  bindCardKeyboard();
}

/* ── Page: COMPANY DETAIL ────────────────────────────────── */

function renderCompanyDetail(app) {
  const coMeta = ALL_COMPANIES.find(c => c.name === AppState.company) || {};
  const isIT   = ['Amazon','Google','Microsoft'].includes(AppState.company);
  const roles  = isIT ? IT_ROLES : COMMERCE_ROLES;

  app.innerHTML = `
    <div class="company-header-band">
      <div class="page-header-inner" style="padding-top:14px;">
        ${renderBreadcrumbsHTML()}
      </div>
      <div class="company-header-inner">
        <div class="company-header-logo" style="background:${coMeta.bg || '#4f46e5'};">
          <i class="${coMeta.icon || 'fa-solid fa-building'}" style="font-size:1.3rem;"></i>
        </div>
        <div class="company-header-info">
          <h1>${esc(AppState.company)}</h1>
          <p>Select a role/domain to browse interview questions</p>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="container">
        <div class="section-header">
          <div class="section-title">Available Roles & Domains</div>
          <div class="section-desc">Click a role to see interview questions submitted by candidates.</div>
        </div>
        <div class="card-grid">
          ${roles.map(r => `
            <div class="card role-card"
              onclick="loadQuestions('${esc(AppState.company)}', '${esc(r.name)}')"
              role="button" tabindex="0" aria-label="View questions for ${r.name}">
              <div class="role-icon"><i class="${r.icon}"></i></div>
              <div class="role-info">
                <div class="role-name">${esc(r.name)}</div>
                <div class="role-meta">Click to view questions</div>
              </div>
              <div class="card-arrow"><i class="fa-solid fa-arrow-right"></i></div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  bindCardKeyboard();
}

/* ── Page: QUESTIONS ─────────────────────────────────────── */

/**
 * Triggered from company-detail cards. Fetches questions then navigates.
 */
async function loadQuestions(company, role) {
  navigate('questions', { company, role, questions: [], searchQuery: '', difficultyFilter: 'All' });
  // renderQuestionsPage will show a spinner and then fetch
}

function renderQuestionsPage(app) {
  const coMeta = ALL_COMPANIES.find(c => c.name === AppState.company) || {};

  app.innerHTML = `
    <!-- Company band -->
    <div class="company-header-band">
      <div class="page-header-inner" style="padding-top:14px;">
        ${renderBreadcrumbsHTML()}
      </div>
      <div class="company-header-inner">
        <div class="company-header-logo" style="background:${coMeta.bg || '#4f46e5'};">
          <i class="${coMeta.icon || 'fa-solid fa-building'}" style="font-size:1.3rem;"></i>
        </div>
        <div class="company-header-info">
          <h1>${esc(AppState.company)} — ${esc(AppState.role)}</h1>
          <p>Interview questions from candidates who applied for this role</p>
        </div>
      </div>
    </div>

    <!-- Sticky toolbar -->
    <div class="questions-toolbar">
      <div class="toolbar-inner">
        <div class="search-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            class="search-input"
            id="search-input"
            placeholder="Search questions…"
            value="${esc(AppState.searchQuery)}"
            oninput="handleSearch(this.value)"
            aria-label="Search questions"
          />
        </div>
        <div class="filter-group" role="group" aria-label="Filter by difficulty">
          <button class="filter-btn ${AppState.difficultyFilter === 'All'    ? 'active' : ''}"
            onclick="handleFilter('All')">All</button>
          <button class="filter-btn easy   ${AppState.difficultyFilter === 'Easy'   ? 'active easy'   : ''}"
            onclick="handleFilter('Easy')"><i class="fa-solid fa-circle" style="font-size:.5rem;"></i> Easy</button>
          <button class="filter-btn medium ${AppState.difficultyFilter === 'Medium' ? 'active medium' : ''}"
            onclick="handleFilter('Medium')"><i class="fa-solid fa-circle" style="font-size:.5rem;"></i> Medium</button>
          <button class="filter-btn hard   ${AppState.difficultyFilter === 'Hard'   ? 'active hard'   : ''}"
            onclick="handleFilter('Hard')"><i class="fa-solid fa-circle" style="font-size:.5rem;"></i> Hard</button>
        </div>
        <button class="btn btn-indigo btn-sm" onclick="openAppliedModal()">
          <i class="fa-solid fa-plus"></i> Add Question
        </button>
      </div>
    </div>

    <!-- Question list area -->
    <div class="section">
      <div class="container">
        <div id="questions-area">
          <div class="spinner-wrap">
            <div class="spinner"></div>
            <p class="spinner-text">Loading questions…</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Fetch and populate
  fetchAndRenderQuestions();
}

async function fetchAndRenderQuestions() {
  try {
    const company = encodeURIComponent(AppState.company);
    const role    = encodeURIComponent(AppState.role);
    const res     = await fetch(`${API_BASE}/questions/${company}/${role}`);

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const data = await res.json();
    AppState.questions = data.questions || [];
    renderQuestionsList();
  } catch (err) {
    const area = document.getElementById('questions-area');
    if (area) {
      area.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon" style="background:#fee2e2;color:#ef4444;">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div class="empty-title">Failed to load questions</div>
          <div class="empty-desc">${esc(err.message)}. Please try again.</div>
          <button class="btn btn-indigo" onclick="fetchAndRenderQuestions()">
            <i class="fa-solid fa-rotate-right"></i> Retry
          </button>
        </div>
      `;
    }
  }
}

function renderQuestionsList() {
  const area = document.getElementById('questions-area');
  if (!area) return;

  const filtered = getFilteredQuestions();

  const totalCount = AppState.questions.length;
  const shown      = filtered.length;

  if (totalCount === 0) {
    area.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-inbox"></i></div>
        <div class="empty-title">No questions yet</div>
        <div class="empty-desc">
          Be the first to add an interview question for
          <strong>${esc(AppState.company)}</strong> — <strong>${esc(AppState.role)}</strong>.
        </div>
        <button class="btn btn-indigo" onclick="openAppliedModal()">
          <i class="fa-solid fa-plus"></i> Add the First Question
        </button>
      </div>
    `;
    return;
  }

  const cardsHTML = filtered.length === 0
    ? `<div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-filter-circle-xmark"></i></div>
        <div class="empty-title">No matching questions</div>
        <div class="empty-desc">Try a different keyword or remove the difficulty filter.</div>
        <button class="btn btn-ghost btn-sm" onclick="clearFilters()">
          <i class="fa-solid fa-xmark"></i> Clear Filters
        </button>
      </div>`
    : `<div class="question-list">
        ${filtered.map((q, i) => renderQuestionCard(q, i + 1)).join('')}
      </div>`;

  const diffLabels = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };
  const diffCounts = AppState.questions.reduce((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {});

  area.innerHTML = `
    <div class="results-meta">
      <div class="results-count">
        Showing <strong>${shown}</strong> of <strong>${totalCount}</strong> question${totalCount !== 1 ? 's' : ''}
        ${AppState.difficultyFilter !== 'All' ? `· filtered by <strong>${AppState.difficultyFilter}</strong>` : ''}
        ${AppState.searchQuery ? `· matching "<strong>${esc(AppState.searchQuery)}</strong>"` : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${Object.entries(diffCounts).map(([diff, cnt]) => `
          <span class="difficulty-badge ${diff.toLowerCase()}">
            <i class="fa-solid fa-circle" style="font-size:.45rem;"></i>
            ${cnt} ${diff}
          </span>
        `).join('')}
      </div>
    </div>
    ${cardsHTML}
  `;
}

function renderQuestionCard(q, num) {
  const diff    = q.difficulty || 'Medium';
  const diffCls = diff.toLowerCase();
  const date    = formatDate(q.date_added);

  return `
    <div class="question-card">
      <div class="question-card-header">
        <div class="question-number">${num}</div>
        <div class="question-text">${esc(q.question)}</div>
        <span class="difficulty-badge ${diffCls}">
          <i class="fa-solid fa-circle" style="font-size:.45rem;"></i>
          ${esc(diff)}
        </span>
      </div>
      <div class="question-card-footer">
        <span class="q-meta-chip">
          <i class="fa-solid fa-building"></i>
          ${esc(AppState.company)}
        </span>
        <span class="q-meta-chip">
          <i class="fa-solid fa-tag"></i>
          ${esc(AppState.role)}
        </span>
        ${q.role_applied_for ? `
          <span class="q-meta-chip">
            <i class="fa-solid fa-user-tie"></i>
            ${esc(q.role_applied_for)}
          </span>
        ` : ''}
        <span class="q-meta-chip">
          <i class="fa-solid fa-calendar"></i>
          ${esc(date)}
        </span>
      </div>
    </div>
  `;
}

/* ── Search & Filter ─────────────────────────────────────── */

function handleSearch(value) {
  AppState.searchQuery = value;
  renderQuestionsList();
}

function handleFilter(level) {
  AppState.difficultyFilter = level;
  // Re-render the toolbar to reflect active button state
  renderQuestionsPage(document.getElementById('app'));
  // But we need to restore the questions first — no re-fetch needed
  fetchAndRenderQuestions();
}

function clearFilters() {
  AppState.searchQuery      = '';
  AppState.difficultyFilter = 'All';
  handleFilter('All');
}

function getFilteredQuestions() {
  return AppState.questions.filter(q => {
    const matchesDiff = AppState.difficultyFilter === 'All' || q.difficulty === AppState.difficultyFilter;
    const query = AppState.searchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      q.question.toLowerCase().includes(query) ||
      (q.role_applied_for || '').toLowerCase().includes(query);
    return matchesDiff && matchesSearch;
  });
}

/* ── Add Question — Modal Flow ───────────────────────────── */

/**
 * Step 1: Ask "Have you applied to this company?"
 */
function openAppliedModal() {
  const overlay = document.getElementById('modal-overlay');
  const box     = document.getElementById('modal-box');
  box.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Close">
      <i class="fa-solid fa-xmark"></i>
    </button>
    <div class="modal-icon">
      <i class="fa-solid fa-building-user"></i>
    </div>
    <h2 class="modal-title">Before you add a question…</h2>
    <p class="modal-subtitle">
      Have you applied to <strong>${esc(AppState.company)}</strong> for a
      <strong>${esc(AppState.role)}</strong> role?
    </p>
    <div class="modal-btn-group">
      <button class="btn btn-indigo" onclick="openAddQuestionForm()">
        <i class="fa-solid fa-check"></i> Yes, I have applied
      </button>
      <button class="btn btn-ghost" onclick="showNotAppliedMessage()">
        <i class="fa-solid fa-xmark"></i> No
      </button>
    </div>
  `;
  overlay.classList.remove('hidden');
}

/**
 * Step 2a: User said "No" — show polite message.
 */
function showNotAppliedMessage() {
  const box = document.getElementById('modal-box');
  box.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Close">
      <i class="fa-solid fa-xmark"></i>
    </button>
    <div class="modal-icon" style="background:linear-gradient(135deg,#fef3c7,#fde68a);color:#b45309;">
      <i class="fa-solid fa-circle-info"></i>
    </div>
    <h2 class="modal-title">No problem!</h2>
    <div class="modal-info-box">
      <i class="fa-solid fa-lightbulb"></i>
      <p>
        Please apply to <strong>${esc(AppState.company)}</strong> before adding interview questions.
        Once you've interviewed, come back and share what you were asked — it helps everyone!
      </p>
    </div>
    <div style="margin-top:24px;">
      <button class="btn btn-indigo" style="width:100%;justify-content:center;" onclick="closeModal()">
        <i class="fa-solid fa-arrow-left"></i> Got it, go back
      </button>
    </div>
  `;
}

/**
 * Step 2b: User said "Yes" — show the add question form.
 */
function openAddQuestionForm() {
  const box = document.getElementById('modal-box');
  box.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Close">
      <i class="fa-solid fa-xmark"></i>
    </button>
    <div style="margin-bottom:20px;">
      <h2 class="modal-title" style="text-align:left;font-size:1.2rem;margin-bottom:4px;">
        <i class="fa-solid fa-plus" style="color:var(--primary);margin-right:6px;"></i>
        Add Interview Question
      </h2>
      <p style="font-size:.85rem;color:var(--text-secondary);">
        Fields marked <span style="color:var(--hard);">*</span> are required.
      </p>
    </div>

    <form id="add-question-form" onsubmit="submitAddQuestion(event)" novalidate>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Company</label>
          <input type="text" class="form-control" value="${esc(AppState.company)}" readonly />
        </div>
        <div class="form-group">
          <label class="form-label">Domain / Role</label>
          <input type="text" class="form-control" value="${esc(AppState.role)}" readonly />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="f-role">
          Role Applied For <span class="form-required">*</span>
        </label>
        <input
          type="text"
          id="f-role"
          class="form-control"
          placeholder="e.g. Audit Associate, SDE II, Data Scientist…"
          maxlength="120"
          autocomplete="off"
        />
        <div class="form-error" id="err-role" style="display:none;">
          <i class="fa-solid fa-circle-exclamation"></i> Role applied for is required.
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="f-question">
          Question Asked <span class="form-required">*</span>
        </label>
        <textarea
          id="f-question"
          class="form-control"
          placeholder="e.g. Explain audit sampling methodology…"
          maxlength="1000"
        ></textarea>
        <div class="form-error" id="err-question" style="display:none;">
          <i class="fa-solid fa-circle-exclamation"></i> Question text is required.
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="f-difficulty">
          Difficulty <span class="form-required">*</span>
        </label>
        <select id="f-difficulty" class="form-control">
          <option value="" disabled selected>Select difficulty…</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <div class="form-error" id="err-difficulty" style="display:none;">
          <i class="fa-solid fa-circle-exclamation"></i> Please select a difficulty level.
        </div>
      </div>

      <div class="form-divider"></div>

      <div style="display:flex;gap:10px;">
        <button type="button" class="btn btn-ghost" style="flex:1;justify-content:center;" onclick="openAppliedModal()">
          <i class="fa-solid fa-arrow-left"></i> Back
        </button>
        <button type="submit" class="btn btn-indigo" style="flex:2;justify-content:center;" id="submit-btn">
          <i class="fa-solid fa-paper-plane"></i> Submit Question
        </button>
      </div>
    </form>
  `;
}

/**
 * Client-side validation + POST to API.
 */
async function submitAddQuestion(event) {
  event.preventDefault();

  const roleEl  = document.getElementById('f-role');
  const qEl     = document.getElementById('f-question');
  const diffEl  = document.getElementById('f-difficulty');
  const submitBtn = document.getElementById('submit-btn');

  const role       = (roleEl.value  || '').trim();
  const question   = (qEl.value     || '').trim();
  const difficulty = (diffEl.value  || '').trim();

  let valid = true;

  // Clear previous errors
  ['err-role','err-question','err-difficulty'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  if (!role) {
    document.getElementById('err-role').style.display = 'flex';
    roleEl.focus();
    valid = false;
  }
  if (!question) {
    document.getElementById('err-question').style.display = 'flex';
    if (valid) qEl.focus();
    valid = false;
  }
  if (!difficulty) {
    document.getElementById('err-difficulty').style.display = 'flex';
    if (valid) diffEl.focus();
    valid = false;
  }

  if (!valid) return;

  // Submit
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting…';

  const payload = {
    company:         AppState.company,
    domain:          AppState.role,
    role_applied_for: role,
    question:         question,
    difficulty:       difficulty,
  };

  try {
    const res = await fetch(`${API_BASE}/questions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    closeModal();
    showToast('Question added successfully!', 'success');
    // Refresh the list
    AppState.questions = [];
    fetchAndRenderQuestions();
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Question';
    showToast(`Failed to add question: ${err.message}`, 'error');
  }
}

/* ── Modal Utilities ─────────────────────────────────────── */

function closeModal(event) {
  // If called from the overlay click, only close if the overlay itself was clicked
  if (event && event.target !== document.getElementById('modal-overlay')) return;
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('hidden');
}

/* ── Toast Notifications ─────────────────────────────────── */

/**
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };

  const toast    = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info}"></i>
    <span>${esc(message)}</span>
  `;
  container.appendChild(toast);

  // Auto-remove after 3.5 s
  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

/* ── Keyboard Accessibility for Cards ────────────────────── */

function bindCardKeyboard() {
  document.querySelectorAll('.card[tabindex="0"]').forEach(card => {
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
}

/* ── Utility Functions ───────────────────────────────────── */

/**
 * Escape HTML special characters to prevent XSS.
 * @param {*} str
 * @returns {string}
 */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format ISO date string to a more readable form.
 * @param {string} dateStr  e.g. "2026-06-24"
 * @returns {string}        e.g. "24 Jun 2026"
 */
function formatDate(dateStr) {
  if (!dateStr) return 'Unknown date';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/* ── Bootstrap ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  render();
});
