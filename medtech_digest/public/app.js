'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let allNews = [];
let favorites = new Set(JSON.parse(localStorage.getItem('fav_ids') || '[]'));
let currentView = 'news';

// ── Category Meta ──────────────────────────────────────────────────────────
const CAT = {
  surgical:     { label: 'Cerrahi Robot',       icon: '🤖' },
  monitoring:   { label: 'İzleme Cihazı',       icon: '📊' },
  ai:           { label: 'Yapay Zeka',           icon: '🧠' },
  implant:      { label: 'İmplant',              icon: '🔩' },
  genetic:      { label: 'Gen Terapisi',         icon: '🧬' },
  'drug-delivery':{ label: 'İlaç Sistemi',       icon: '💊' },
  imaging:      { label: 'Görüntüleme',          icon: '🖥️' },
  cardiology:   { label: 'Kardiyoloji',          icon: '❤️' },
  neurology:    { label: 'Nöroloji',             icon: '🧪' },
  orthopedics:  { label: 'Ortopedi',             icon: '🦴' },
  oncology:     { label: 'Onkoloji',             icon: '🔬' },
  diabetes:     { label: 'Diyabet',              icon: '🩸' },
  general:      { label: 'Genel',                icon: '📋' },
};

function catLabel(k) { return CAT[k]?.label || 'Genel'; }
function catIcon(k)  { return CAT[k]?.icon  || '📋'; }

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  document.getElementById('dayFilter').addEventListener('change', () => loadNews());
  document.getElementById('gcFilter').addEventListener('change', () => loadNews());
  loadNews();
  loadApprovals('FDA');
  loadApprovals('CE');
  loadStats();
  checkAIStatus();
});

// ── Navigation ─────────────────────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view);
    });
  });
}

function switchView(view) {
  currentView = view;

  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));

  const titles = {
    news:       'Tüm Haberler',
    categories: 'Kategoriler',
    fda:        'FDA Onayları (ABD)',
    ce:         'CE Onayları (Avrupa)',
    favorites:  'Favorilerim',
  };
  document.getElementById('viewTitle').textContent = titles[view] || '';

  if (view === 'favorites') renderFavorites();
  if (view === 'categories') renderCategories();
}

// ── News ───────────────────────────────────────────────────────────────────
async function loadNews(category) {
  const days = document.getElementById('dayFilter').value;
  const gcOnly = document.getElementById('gcFilter').checked;
  const params = new URLSearchParams({ days });
  if (category) params.set('category', category);
  if (gcOnly) params.set('gamechanger', '1');

  try {
    const res = await fetch('/api/news?' + params);
    allNews = await res.json();
    renderNews(allNews, 'newsList');
    renderCategories();
    if (currentView === 'favorites') renderFavorites();
    loadStats();
  } catch (e) {
    document.getElementById('newsList').innerHTML = empty('⚠️', 'Sunucuya bağlanılamadı.');
  }
}

function renderNews(list, containerId) {
  const el = document.getElementById(containerId);
  if (!list.length) {
    el.innerHTML = empty('📭', 'Haber bulunamadı.');
    return;
  }
  el.innerHTML = list.map(n => newsCard(n)).join('');
}

function newsCard(n) {
  const isFav = favorites.has(n.id);
  const date = fmtDate(n.pub_date || n.created_at);
  const catK = n.category || 'general';
  const thumb = n.image_url
    ? `<img class="news-thumb" src="${esc(n.image_url)}" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="news-thumb" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:2em;">${catIcon(catK)}</div>`;

  const gcBadge = n.is_gamechanger
    ? `<span class="badge-gc" title="Neden önemli: ${esc(n.gc_reason || 'Önemli gelişme')}">🔥 ${esc(n.gc_reason || 'Önemli')}</span>`
    : '';

  const displayTitle = n.turkish_title || n.title;

  return `
  <div class="news-card" onclick="openDetail(${n.id})">
    ${thumb}
    <div class="news-body">
      <div>
        <div class="news-tags">
          <span class="tag tag-source">${esc(n.source)}</span>
          <span class="tag tag-${catK}">${catLabel(catK)}</span>
        </div>
        <div class="news-title">${esc(displayTitle)}${gcBadge}</div>
      </div>
      <div class="news-footer">
        <span class="news-date">${date}</span>
        <div class="news-actions">
          <button class="btn-fav ${isFav ? 'on' : ''}" onclick="toggleFav(event,${n.id})" title="${isFav ? 'Favoriden çıkar' : 'Favoriye ekle'}">${isFav ? '⭐' : '☆'}</button>
          <button class="btn-read" onclick="openDetail(${n.id});event.stopPropagation()">Detay</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Favorites ──────────────────────────────────────────────────────────────
function toggleFav(e, id) {
  e.stopPropagation();
  const had = favorites.has(id);
  if (had) favorites.delete(id); else favorites.add(id);
  saveFavs();
  fetch(`/api/news/${id}/favorite`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ is_favorite: !had }) });

  // Update button in card list
  document.querySelectorAll(`.btn-fav`).forEach(btn => {
    const card = btn.closest('.news-card');
    if (card && card.getAttribute('onclick')?.includes(`(${id})`)) {
      btn.classList.toggle('on', !had);
      btn.textContent = !had ? '⭐' : '☆';
      btn.title = !had ? 'Favoriden çıkar' : 'Favoriye ekle';
    }
  });

  // Update modal fav btn if open
  const mFav = document.getElementById('modalFavBtn');
  if (mFav && parseInt(mFav.dataset.id) === id) {
    mFav.classList.toggle('on', !had);
    mFav.textContent = (!had ? '⭐' : '☆') + (mFav.textContent.slice(2));
  }

  loadStats();
}

function saveFavs() { localStorage.setItem('fav_ids', JSON.stringify([...favorites])); }

function renderFavorites() {
  const favNews = allNews.filter(n => favorites.has(n.id));
  renderNews(favNews, 'favList');
}

// ── Detail Modal ───────────────────────────────────────────────────────────
async function openDetail(id) {
  const n = allNews.find(x => x.id === id);
  if (!n) return;

  const modal = document.getElementById('modal');
  const body  = document.getElementById('modalBody');
  const isFav = favorites.has(id);
  const catK  = n.category || 'general';
  const displayTitle = n.turkish_title || n.title;
  const gcReason = n.gc_reason;

  const imgHtml = n.image_url
    ? `<img class="md-image" src="${esc(n.image_url)}" onerror="this.style.display='none'">`
    : '';

  body.innerHTML = `
    ${imgHtml}
    <div class="md-inner">
      <div class="md-tags">
        <span class="tag tag-source">${esc(n.source)}</span>
        <span class="tag tag-${catK}">${catIcon(catK)} ${catLabel(catK)}</span>
        ${gcReason ? `<span class="badge-gc">🔥 ${esc(gcReason)}</span>` : ''}
      </div>
      <div class="md-title">${esc(displayTitle)}</div>
      ${n.turkish_title && n.turkish_title !== n.title ? `<div style="font-size:0.8em;color:var(--text3);margin-bottom:4px;font-style:italic;">${esc(n.title)}</div>` : ''}
      <div class="md-date">📅 ${fmtDateLong(n.pub_date || n.created_at)}</div>

      <div class="md-links">
        <div class="md-link-block">
          <span class="md-link-label">📰 Kaynak: ${esc(n.source)}</span>
          <a href="${esc(n.article_url || n.link)}" target="_blank" rel="noopener" class="md-link-btn primary">Haberin Tamamını Oku →</a>
        </div>
        <div class="md-link-block">
          <span class="md-link-label">🏭 Ürün / Şirket</span>
          <a href="https://www.google.com/search?q=${encodeURIComponent(extractCompany(n.title) + ' medical device official site')}" target="_blank" rel="noopener" class="md-link-btn secondary">Şirketi Bul →</a>
        </div>
      </div>

      <div class="md-summary-box" id="trSummary">
        <div class="md-summary-title">🇹🇷 Türkçe Özet</div>
        <div class="md-summary-text loading" id="trText">
          <span class="spinner"></span> Yükleniyor…
        </div>
      </div>

      ${n.english_summary ? `
      <div class="md-en-summary">
        <div class="md-en-title">📄 İngilizce Özet (Kaynak)</div>
        <div class="md-en-text">${esc(n.english_summary)}</div>
      </div>` : ''}

      <button id="modalFavBtn" data-id="${id}" class="md-fav-btn ${isFav ? 'on' : ''}" onclick="toggleFav(event,${id})">
        ${isFav ? '⭐' : '☆'} ${isFav ? 'Favoriden Çıkar' : 'Favorilere Ekle'}
      </button>
    </div>`;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Load Turkish summary
  loadTurkishSummary(n, id);
}

async function loadTurkishSummary(n, id) {
  const trText = document.getElementById('trText');
  if (!trText) return;

  // Önbellekte var mı?
  if (n.turkish_summary) {
    trText.className = 'md-summary-text';
    trText.textContent = n.turkish_summary;
    return;
  }

  try {
    const res = await fetch(`/api/news/${id}/summarize`, { method: 'POST' });
    const data = await res.json();

    if (data.turkish_summary) {
      n.turkish_summary = data.turkish_summary;
      trText.className = 'md-summary-text';
      trText.textContent = data.turkish_summary;
      const badge = data.source === 'ollama' ? '🤖 Ollama (Yerel AI)' : data.source === 'claude' ? '✨ Claude AI' : '🌐 MyMemory';
      const badgeEl = document.createElement('div');
      badgeEl.style.cssText = 'font-size:0.72em;color:var(--text3);margin-top:8px;';
      badgeEl.textContent = badge;
      trText.appendChild(badgeEl);
    } else {
      // AI yok — kurulum talimatını göster
      trText.className = 'md-summary-text';
      trText.innerHTML = `
        <em style="color:var(--text3)">Türkçe detaylı özet şu an mevcut değil.</em>
        <div style="margin-top:10px;padding:12px;background:var(--bg0);border-radius:6px;border:1px solid var(--border)">
          <div style="font-size:0.8em;color:var(--text2);line-height:1.8;">
            <strong style="color:var(--accent2)">Daha iyi özetler için (isteğe bağlı):</strong><br>
            1. <a href="https://ollama.com" target="_blank" style="color:var(--accent2)">ollama.com</a> → İndir & Kur<br>
            2. Terminal aç, şunu çalıştır:<br>
            <code style="background:var(--bg3);padding:3px 8px;border-radius:4px;color:var(--green)">ollama pull llama3.2:3b</code><br>
            3. MedTech'i yeniden başlat — otomatik çalışır ✅
          </div>
        </div>`;
    }
  } catch {
    trText.className = 'md-summary-text';
    trText.innerHTML = `<em style="color:var(--text3)">Bağlantı hatası.</em>`;
  }
}

// ── AI Status Indicator ──────────────────────────────────────────────────────
async function checkAIStatus() {
  try {
    const res = await fetch('/api/ai-status');
    const s = await res.json();

    const footer = document.querySelector('.sidebar-bottom');
    const indicator = document.createElement('div');
    indicator.style.cssText = 'margin-top:8px;padding:6px 8px;border-radius:5px;font-size:0.75em;text-align:center;';

    if (s.ollama) {
      indicator.style.background = 'rgba(63,185,80,0.1)';
      indicator.style.color = 'var(--green)';
      indicator.style.border = '1px solid rgba(63,185,80,0.3)';
      indicator.textContent = '🤖 Ollama Aktif';
    } else {
      indicator.style.background = 'rgba(63,185,80,0.1)';
      indicator.style.color = 'var(--green)';
      indicator.style.border = '1px solid rgba(63,185,80,0.3)';
      indicator.textContent = '🌐 MyMemory Çeviri Aktif';
    }

    footer.appendChild(indicator);
  } catch {}
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
}

function handleModalClick(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

// ── Categories ─────────────────────────────────────────────────────────────
function renderCategories() {
  const grid = document.getElementById('categoryGrid');

  const counts = {};
  allNews.forEach(n => { counts[n.category || 'general'] = (counts[n.category || 'general'] || 0) + 1; });

  const entries = Object.entries(CAT).map(([k, v]) => ({ k, ...v, count: counts[k] || 0 }));

  grid.innerHTML = entries.map(c => `
    <div class="cat-card" onclick="filterByCategory('${c.k}')">
      <div class="cat-icon">${c.icon}</div>
      <div class="cat-name">${c.label}</div>
      <div class="cat-count">${c.count} haber</div>
    </div>`).join('');
}

function filterByCategory(cat) {
  switchView('news');
  loadNews(cat);
  document.getElementById('viewTitle').textContent = catIcon(cat) + ' ' + catLabel(cat);
}

// ── Approvals ──────────────────────────────────────────────────────────────
function setApprovalFilter(body, days, btn) {
  btn.closest('.approval-filter').querySelectorAll('.af-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadApprovals(body, days);
}

async function loadApprovals(body, days = 7) {
  const listId = body === 'FDA' ? 'fdaList' : 'ceList';
  const el = document.getElementById(listId);
  if (!el) return;

  try {
    const res = await fetch(`/api/approvals?body=${body}&days=${days}`);
    const list = await res.json();

    if (!list.length) {
      el.innerHTML = empty('📋', `${body} onayı bulunamadı.`);
      return;
    }

    el.innerHTML = list.map(a => {
      let verifyUrl, verifyLabel;
      if (body === 'FDA') {
        // K numarası → 510(k) direkt kayıt; PMA numarası → PMA direkt kayıt
        if (a.link) {
          verifyUrl = a.link;
        } else if (a.reference_number && a.reference_number.startsWith('P')) {
          verifyUrl = `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=${a.reference_number}`;
        } else if (a.reference_number) {
          verifyUrl = `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=${a.reference_number}`;
        } else {
          verifyUrl = `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm`;
        }
        verifyLabel = `🔗 FDA\'da ${esc(a.reference_number || 'Kayıt')} →`;
      } else {
        // EUDAMED SPA direct deep-link desteklemiyor — cihaz adıyla arama
        verifyUrl = `https://ec.europa.eu/tools/eudamed/#/screen/search-device?currentPage=1&fullTextSearch=${encodeURIComponent(a.device_name)}`;
        verifyLabel = `🔗 EUDAMED\'da Ara →`;
      }
      return `
      <div class="approval-card">
        <div class="approval-top">
          <span class="approval-type">✅ ${a.approval_type || body}</span>
          <span class="approval-date">${a.approval_date || ''}</span>
        </div>
        <div class="approval-name">${esc(a.device_name)}</div>
        <div class="approval-ref">${a.reference_number || ''} ${a.applicant ? '· ' + esc(a.applicant) : ''}</div>
        <a href="${esc(verifyUrl)}" target="_blank" rel="noopener" class="approval-verify-link">${verifyLabel}</a>
      </div>`;
    }).join('');
  } catch {
    el.innerHTML = empty('⚠️', 'Onay verisi alınamadı.');
  }
}

// ── Stats ──────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const s = await res.json();
    document.getElementById('totalNews').textContent = s.total || 0;
    document.getElementById('totalFavs').textContent = s.favorites || 0;
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  } catch {}
}

// ── Refresh ────────────────────────────────────────────────────────────────
async function doRefresh() {
  const btn = document.querySelector('.refresh-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Taranıyor…';

  try {
    await fetch('/api/refresh', { method: 'POST' });
    // Wait for scrape to finish, then translate titles, then reload
    setTimeout(async () => {
      await fetch('/api/translate', { method: 'POST' });
      setTimeout(async () => {
        await loadNews();
        await loadApprovals('FDA');
        await loadApprovals('CE');
        btn.disabled = false;
        btn.textContent = '🔄 Yenile';
      }, 8000);
    }, 4000);
  } catch {
    btn.disabled = false;
    btn.textContent = '🔄 Yenile';
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function esc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('tr-TR', { day:'numeric', month:'short', year:'numeric' });
}

function fmtDateLong(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// Başlıktan şirket/ürün adını çıkar
function extractCompany(title) {
  if (!title) return title;
  // "Company X launches/receives/raises/announces/gets/wins/unveils..." → Company X
  const m = title.match(/^([\w][^\n]+?)\s+(?:launches?|receives?|gets?|wins?|raises?|secures?|acquires?|announces?|unveils?|presents?|develops?|gains?|earns?|clears?|approves?|cleared|approved)\b/i);
  if (m) return m[1].trim();
  // Büyük harfle başlayan ilk 2-3 kelime
  const words = title.split(' ').slice(0, 4);
  const company = words.filter(w => /^[A-Z]/.test(w)).join(' ');
  return company || title.split(' ').slice(0, 2).join(' ');
}

function empty(icon, text) {
  return `<div class="empty"><div class="empty-icon">${icon}</div><div class="empty-text">${text}</div></div>`;
}
