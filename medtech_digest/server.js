const express = require('express');
const axios = require('axios');
const Parser = require('rss-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;
const rssParser = new Parser({ timeout: 10000 });

// ─── Database ──────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'news.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    turkish_title TEXT,
    english_summary TEXT,
    turkish_summary TEXT,
    link TEXT UNIQUE,
    article_url TEXT,
    company_url TEXT,
    source TEXT,
    category TEXT DEFAULT 'general',
    image_url TEXT,
    is_favorite INTEGER DEFAULT 0,
    is_gamechanger INTEGER DEFAULT 0,
    pub_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // Eski DB için kolonları ekle
  ['is_gamechanger INTEGER DEFAULT 0',
   'turkish_title TEXT',
   'article_url TEXT',
   'pub_date DATETIME'
  ].forEach(col => db.run(`ALTER TABLE news ADD COLUMN ${col}`, () => {}));

  db.run(`CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_name TEXT NOT NULL,
    body TEXT DEFAULT 'FDA',
    approval_type TEXT,
    approval_date TEXT,
    applicant TEXT,
    reference_number TEXT UNIQUE,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// ─── RSS Sources — doğrulanmış URL'ler ──────────────────────────────────────
const RSS_SOURCES = [
  // ── Genel MedTech ──
  { name: 'MedTech Dive',           rss: 'https://www.medtechdive.com/feeds/news/',                          company: 'https://www.medtechdive.com' },
  { name: 'MassDevice',             rss: 'https://www.massdevice.com/feed/',                                 company: 'https://www.massdevice.com' },
  { name: 'Med City News',          rss: 'https://medcitynews.com/feed/',                                    company: 'https://medcitynews.com' },
  { name: 'Fierce Biotech',         rss: 'https://www.fiercebiotech.com/rss.xml',                            company: 'https://www.fiercebiotech.com' },
  { name: 'Fierce Healthcare',      rss: 'https://www.fiercehealthcare.com/rss.xml',                         company: 'https://www.fiercehealthcare.com' },
  { name: 'Medical Futurist',       rss: 'https://medicalfuturist.com/feed/',                                company: 'https://medicalfuturist.com' },
  { name: 'MedGadget',              rss: 'https://www.medgadget.com/feed/',                                  company: 'https://www.medgadget.com' },
  { name: 'News Medical',           rss: 'https://www.news-medical.net/rss/news.aspx',                       company: 'https://www.news-medical.net' },
  { name: 'Healthcare IT News',     rss: 'https://www.healthcareitnews.com/rss.xml',                         company: 'https://www.healthcareitnews.com' },
  { name: "Becker's Hospital",      rss: 'https://www.beckershospitalreview.com/rss/devices.rss',            company: 'https://www.beckershospitalreview.com' },
  { name: 'Medical Device Network', rss: 'https://www.medicaldevice-network.com/feed/',                      company: 'https://www.medicaldevice-network.com' },
  { name: 'Healthcare Global',      rss: 'https://healthcareglobal.com/feed/',                               company: 'https://healthcareglobal.com' },
  { name: 'MedLatest',              rss: 'https://www.medlatest.com/feed/',                                  company: 'https://www.medlatest.com' },
  { name: 'Medical Trade Journal',  rss: 'https://medicaltradejournal.com/feed/',                            company: 'https://medicaltradejournal.com' },
  { name: 'Healthcare IT Today',    rss: 'https://www.healthcareittoday.com/feed/',                          company: 'https://www.healthcareittoday.com' },
  { name: 'Rock Health',            rss: 'https://rockhealth.com/feed/',                                     company: 'https://rockhealth.com' },
  { name: 'ITN Online',             rss: 'https://www.itnonline.com/rss.xml',                                company: 'https://www.itnonline.com' },

  // ── Kardiyoloji ──
  { name: 'Dicardiology',           rss: 'https://www.dicardiology.com/rss.xml',                             company: 'https://www.dicardiology.com' },
  { name: 'Interventional News',    rss: 'https://interventionalnews.com/feed/',                             company: 'https://interventionalnews.com' },

  // ── Cerrahi ──
  { name: 'CTSNet',                 rss: 'https://www.ctsnet.org/rss.xml',                                   company: 'https://www.ctsnet.org' },
  { name: 'General Surgery News',   rss: 'https://www.generalsurgerynews.com/feed/',                         company: 'https://www.generalsurgerynews.com' },
  { name: 'OR Manager',             rss: 'https://www.ormanager.com/feed/',                                  company: 'https://www.ormanager.com' },

  // ── Nöroloji ──
  { name: 'Neurosurgery Blog',      rss: 'https://www.neurosurgeryblog.org/feed/',                           company: 'https://www.neurosurgeryblog.org' },

  // ── Pulmoner & Kritik Bakım ──
  { name: 'PulmCCM',                rss: 'https://pulmccm.org/feed/',                                        company: 'https://pulmccm.org' },
  { name: 'CHEST Journal',          rss: 'https://journal.chestnet.org/rss',                                 company: 'https://journal.chestnet.org' },

  // ── Ortopedi ──
  { name: 'Healio Orthopedics',     rss: 'https://www.healio.com/rss/orthopedics',                           company: 'https://www.healio.com/orthopedics' },
  { name: 'OrthoSuperSite',         rss: 'https://orthobuzz.jbjs.org/feed/',                                 company: 'https://orthobuzz.jbjs.org' },

  // ── Üroloji ──
  { name: 'Urology Times',          rss: 'https://www.urologytimes.com/rss.xml',                             company: 'https://www.urologytimes.com' },

  // ── Onkoloji ──
  { name: 'Cancer Network',         rss: 'https://www.cancernetwork.com/feed/',                              company: 'https://www.cancernetwork.com' },

  // ── Dermatoloji ──
  { name: 'Dermatology Times',      rss: 'https://www.dermatologytimes.com/rss.xml',                         company: 'https://www.dermatologytimes.com' },

  // ── Pediatri ──
  { name: 'MDedge Pediatrics',      rss: 'https://www.mdedge.com/rss/pediatrics',                            company: 'https://www.mdedge.com/pediatrics' },

  // ── Kadın Hastalıkları ──
  { name: 'OBGyn.net',              rss: 'https://www.obgyn.net/feed/',                                      company: 'https://www.obgyn.net' },

  // ── Akademik ──
  { name: 'Nature Medicine',        rss: 'https://www.nature.com/nm.rss',                                    company: 'https://www.nature.com/nm' },
  { name: 'Lancet Digital Health',  rss: 'https://www.thelancet.com/rssfeed/landig_current.xml',             company: 'https://www.thelancet.com/journals/landig' },
  { name: 'Medscape',               rss: 'https://www.medscape.com/rss/news',                                company: 'https://www.medscape.com' },
];

// ─── Category Detection ─────────────────────────────────────────────────────
function detectCategory(text) {
  const t = (text || '').toLowerCase();
  if (/robot|surgical|surgery|laparoscop/.test(t)) return 'surgical';
  if (/monitor|wearable|patch|continuous|sensor|watch/.test(t)) return 'monitoring';
  if (/ai |artificial intelligence|machine learning|algorithm|deep learning/.test(t)) return 'ai';
  if (/implant|stent|pacemaker|prosthe/.test(t)) return 'implant';
  if (/crispr|gene|genetic|genomic|therapy/.test(t)) return 'genetic';
  if (/drug delivery|insulin|dose|pump/.test(t)) return 'drug-delivery';
  if (/imaging|scan|ultrasound|mri|ct scan|x-ray|radiology/.test(t)) return 'imaging';
  if (/cardio|heart|cardiac|vascular/.test(t)) return 'cardiology';
  if (/neuro|brain|spine|neural/.test(t)) return 'neurology';
  if (/ortho|bone|joint|spine/.test(t)) return 'orthopedics';
  if (/cancer|oncolog|tumor/.test(t)) return 'oncology';
  if (/diabetes|glucose|insulin/.test(t)) return 'diabetes';
  return 'general';
}

// ─── Oyun Değiştirici Kriterleri ─────────────────────────────────────────────
// Kriter: Aşağıdaki kategorilerden en az 1'ini içeriyorsa "önemli" sayılır:
// A) FDA/CE onay haberi  B) Klinik deneme sonucu  C) Fon/yatırım haberi
// D) İlk-kez/breakthrough  E) Piyasaya çıkış/satın alma
const GC_RULES = {
  'FDA/CE Onay':    ['fda approv','fda clear','fda grant','510(k)','pma','de novo','eua','ce mark','ce certified','ce approv','ce cleared','regulatory approv'],
  'Klinik Deneme':  ['phase 3','phase iii','phase 2','phase ii','clinical trial','pivotal trial','trial result','first-in-human','first human'],
  'Yatırım/Fon':    ['raises $','series a','series b','series c','series d','million funding','ipo','acquisition','acquires','merger','billion'],
  'Breakthrough':   ['breakthrough','first-ever','first-in-class','first-of-its-kind','world first','revolutionary','game.chang'],
  'Piyasaya Çıkış': ['launches','launch','commercially available','market launch','fda-cleared launch','goes live','now available'],
};

function getGCReason(title, summary) {
  const text = ((title || '') + ' ' + (summary || '')).toLowerCase();
  for (const [reason, kws] of Object.entries(GC_RULES)) {
    if (kws.some(kw => text.includes(kw))) return reason;
  }
  return null;
}

function isGameChanger(title, summary) {
  return getGCReason(title, summary) !== null;
}

// ─── Scrape ─────────────────────────────────────────────────────────────────
async function scrapeAllSources() {
  console.log(`[${new Date().toLocaleTimeString()}] Haber taraması başladı... (${RSS_SOURCES.length} kaynak)`);
  let inserted = 0, skipped = 0, failed = 0;

  for (const src of RSS_SOURCES) {
    try {
      const feed = await rssParser.parseURL(src.rss);

      for (const item of (feed.items || []).slice(0, 20)) {
        const title = (item.title || '').trim();
        const articleLink = item.link || item.guid;
        if (!title || !articleLink) continue;

        // En uzun içeriği al — content:encoded > content > contentSnippet > summary
        const rawContent = item['content:encoded'] || item.content || item.contentSnippet || item.summary || '';
        // HTML taglarını temizle
        const summary = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        // Yayın tarihi — RSS pubDate kullan, yoksa şimdiki zaman
        const rawDate = item.pubDate || item.isoDate;
        let pubDate = new Date().toISOString();
        if (rawDate) {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) {
            if (parsed.getFullYear() < 2020) continue; // 2020 öncesi atla
            pubDate = parsed.toISOString();
          }
        }

        const image = extractImage(item);
        const category = detectCategory(title + ' ' + summary);
        const gamechanger = isGameChanger(title, summary) ? 1 : 0;

        const result = await dbRun(
          `INSERT OR IGNORE INTO news
           (title, english_summary, article_url, link, company_url, source, category, image_url, is_gamechanger, pub_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [title, summary.slice(0, 1200), articleLink, articleLink, src.company, src.name, category, image, gamechanger, pubDate, pubDate]
        );
        if (result.changes > 0) inserted++;
      }
      console.log(`  ✓ ${src.name}`);
    } catch (err) {
      console.log(`  ✗ ${src.name}: ${err.message.split('\n')[0]}`);
      failed++;
    }
  }

  // Gerçek FDA verisi çek
  await fetchFDAApprovals();

  // 3 günden eski, favori olmayan haberleri sil
  await dbRun(
    `DELETE FROM news WHERE is_favorite = 0 AND pub_date < datetime('now', '-3 days')`
  );

  console.log(`[${new Date().toLocaleTimeString()}] Tamamlandı: +${inserted} yeni, ${failed} kaynak başarısız`);

  // Arka planda başlıkları Türkçeye çevir
  translatePendingTitles().catch(() => {});
}

// ─── Başlık Çevirisi — MyMemory (ücretsiz, key yok) ─────────────────────────
async function translateWithMyMemory(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|tr`;
  const resp = await axios.get(url, { timeout: 10000 });
  const translated = resp.data?.responseData?.translatedText || '';
  // MyMemory bazen hata mesajı döner
  if (!translated || translated.toUpperCase().startsWith('MYMEMORY WARNING')) return null;
  return translated.trim();
}

async function translatePendingTitles() {
  const rows = await dbAll(
    `SELECT id, title FROM news WHERE turkish_title IS NULL ORDER BY pub_date DESC LIMIT 50`
  );
  if (!rows.length) return;

  // Önce Ollama dene (kuruluysa)
  let ollamaReady = false;
  try {
    await axios.get('http://localhost:11434/api/tags', { timeout: 2000 });
    ollamaReady = true;
  } catch { /* Ollama yok */ }

  if (ollamaReady) {
    console.log(`  📝 ${rows.length} başlık Ollama ile çevriliyor...`);
    for (const row of rows) {
      try {
        const resp = await axios.post('http://localhost:11434/api/chat', {
          model: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
          stream: false,
          options: { temperature: 0.1, num_predict: 80 },
          messages: [
            { role: 'system', content: 'You translate English medical headlines to Turkish. Reply with ONLY the Turkish translation, nothing else. No quotes, no explanations.' },
            { role: 'user', content: row.title }
          ]
        }, { timeout: 30000 });
        const tr = (resp.data.message?.content || '').trim()
          .replace(/^["']|["']$/g, '')
          .split('\n')[0].trim();
        if (tr) await dbRun(`UPDATE news SET turkish_title = ? WHERE id = ?`, [tr, row.id]);
      } catch (e) { console.log(`  Çeviri hatası (Ollama): ${e.message}`); }
    }
    console.log(`  ✅ Başlık çevirisi tamamlandı (Ollama)`);
    return;
  }

  // MyMemory ile çevir — ücretsiz, key yok
  console.log(`  📝 ${rows.length} başlık MyMemory ile çevriliyor...`);
  let success = 0;
  for (const row of rows) {
    try {
      const tr = await translateWithMyMemory(row.title);
      if (tr) {
        await dbRun(`UPDATE news SET turkish_title = ? WHERE id = ?`, [tr, row.id]);
        success++;
      }
      // Rate limit: MyMemory ücretsiz katmanı aşmamak için kısa bekleme
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.log(`  Çeviri hatası (MyMemory): ${e.message}`);
    }
  }
  console.log(`  ✅ Başlık çevirisi tamamlandı (MyMemory: ${success}/${rows.length})`);
}

// ─── Gerçek FDA OpenAPI ──────────────────────────────────────────────────────
async function fetchFDAApprovals() {
  const endpoints = [
    {
      url: 'https://api.fda.gov/device/510k.json?sort=decision_date:desc&limit=20',
      type: '510(k)',
      body: 'FDA'
    },
    {
      url: 'https://api.fda.gov/device/pma.json?sort=decision_date:desc&limit=10',
      type: 'PMA',
      body: 'FDA'
    }
  ];

  for (const ep of endpoints) {
    try {
      const res = await axios.get(ep.url, { timeout: 10000 });
      const results = res.data.results || [];

      for (const item of results) {
        const deviceName = item.device_name || item.trade_name || 'Unknown Device';
        const refNum = item.k_number || item.pma_number || item.supplement_number || null;
        const date = item.decision_date || item.date_received || null;
        const applicant = item.applicant || item.applicant_contact || null;
        // 510(k) ve PMA için farklı FDA sayfaları
        const link = refNum
          ? (ep.type === 'PMA'
              ? `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=${refNum}`
              : `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=${refNum}`)
          : null;

        if (!refNum) continue;

        await dbRun(
          `INSERT OR IGNORE INTO approvals
           (device_name, body, approval_type, approval_date, applicant, reference_number, link)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [deviceName, ep.body, ep.type, date, applicant, refNum, link]
        );
      }
      console.log(`  ✓ FDA ${ep.type} (${results.length} kayıt)`);
    } catch (err) {
      console.log(`  ✗ FDA ${ep.type}: ${err.message}`);
    }
  }
}

function extractImage(item) {
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
    return item['media:content'].$.url;
  }
  const content = item['content:encoded'] || item.content || '';
  const m = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err); else resolve(this);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
}

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ─────────────────────────────────────────────────────────────
app.get('/api/news', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 3;
    const category = req.query.category || null;
    const favOnly = req.query.favorites === '1';
    const gcOnly  = req.query.gamechanger === '1';

    // pub_date'e göre filtrele (gerçek yayın tarihi)
    let sql = `SELECT * FROM news WHERE COALESCE(pub_date, created_at) > datetime('now', '-${days} days')`;
    const params = [];

    if (category) { sql += ` AND category = ?`; params.push(category); }
    if (favOnly)  { sql += ` AND is_favorite = 1`; }
    if (gcOnly)   { sql += ` AND is_gamechanger = 1`; }

    sql += ` ORDER BY is_gamechanger DESC, COALESCE(pub_date, created_at) DESC LIMIT 500`;
    const rows = await dbAll(sql, params);

    // gc_reason alanını ekle (frontend için)
    const enriched = rows.map(r => ({
      ...r,
      gc_reason: r.is_gamechanger ? getGCReason(r.title, r.english_summary) : null
    }));

    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/news/:id/favorite', async (req, res) => {
  try {
    const val = req.body.is_favorite ? 1 : 0;
    await dbRun(`UPDATE news SET is_favorite = ? WHERE id = ?`, [val, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── AI Summary — Ollama önce, Claude fallback ──────────────────────────────
async function generateWithOllama(title, englishSummary) {
  const userMsg = englishSummary
    ? `Title: ${title}\n\nContent: ${englishSummary}`
    : `Title: ${title}`;

  const response = await axios.post('http://localhost:11434/api/chat', {
    model: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
    stream: false,
    options: { temperature: 0.3, num_predict: 300 },
    messages: [
      {
        role: 'system',
        content: 'You are a medical news summarizer. When given medical news, you respond ONLY in Turkish. Do not use any other language. Summarize in 3-4 Turkish sentences using only the facts provided. Never add information not present in the source.'
      },
      {
        role: 'user',
        content: userMsg
      }
    ]
  }, { timeout: 120000 });

  const raw = (response.data.message?.content || '').trim();
  return raw
    .replace(/^(Turkish summary:|Summary:|Özet:)\s*/i, '')
    // Model bazen kaynak atıfı ekler — kaldır
    .replace(/\s*(Bu (bilgi|haber|içerik)[^.]*\.|Kaynak:[^.]*\.)\s*$/i, '')
    .trim();
}

async function generateWithClaude(title, englishSummary, apiKey) {
  const { Anthropic } = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const prompt = `Aşağıdaki tıbbi teknoloji haberini Türkçe olarak 3-5 cümle ile özetle. Teknik terimleri koru, anlaşılır bir dil kullan. Özeti doğrudan yaz, giriş cümlesi ekleme.

Başlık: ${title}
İçerik: ${englishSummary || ''}`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });
  return msg.content[0].text;
}

app.get('/api/ai-status', async (req, res) => {
  let ollama = false;
  try {
    await axios.get('http://localhost:11434/api/tags', { timeout: 2000 });
    ollama = true;
  } catch {}
  res.json({ ollama, mymemory: true, ready: true });
});

app.post('/api/news/:id/summarize', async (req, res) => {
  try {
    const rows = await dbAll(`SELECT * FROM news WHERE id = ?`, [req.params.id]);
    const news = rows[0];
    if (!news) return res.status(404).json({ error: 'Haber bulunamadı' });

    // Cache: zaten var mı?
    if (news.turkish_summary) {
      return res.json({ turkish_summary: news.turkish_summary, source: 'cache' });
    }

    let summary = null;
    let source = null;

    // 1. Önce Ollama dene (ücretsiz, yerel)
    try {
      summary = await generateWithOllama(news.title, news.english_summary);
      source = 'ollama';
    } catch (ollamaErr) {
      // Ollama çalışmıyor, Claude'a geç
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey) {
        try {
          summary = await generateWithClaude(news.title, news.english_summary, apiKey);
          source = 'claude';
        } catch (claudeErr) {
          return res.json({ turkish_summary: null, message: 'no_ai' });
        }
      } else {
        return res.json({ turkish_summary: null, message: 'no_ai' });
      }
    }

    // Kaydet
    await dbRun(`UPDATE news SET turkish_summary = ? WHERE id = ?`, [summary, news.id]);
    res.json({ turkish_summary: summary, source });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/approvals', async (req, res) => {
  try {
    const body = req.query.body || null;
    const days = parseInt(req.query.days) || 30; // varsayılan 30 gün
    let sql = `SELECT * FROM approvals WHERE approval_date >= date('now', '-${days} days')`;
    const params = [];
    if (body) { sql += ` AND body = ?`; params.push(body); }
    sql += ` ORDER BY approval_date DESC LIMIT 100`;
    const rows = await dbAll(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const total = await dbAll(`SELECT COUNT(*) as c FROM news WHERE created_at > datetime('now', '-3 days')`);
    const favs  = await dbAll(`SELECT COUNT(*) as c FROM news WHERE is_favorite = 1`);
    const cats  = await dbAll(`SELECT category, COUNT(*) as c FROM news GROUP BY category ORDER BY c DESC`);
    res.json({ total: total[0].c, favorites: favs[0].c, categories: cats });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/refresh', async (req, res) => {
  scrapeAllSources().catch(console.error);
  res.json({ ok: true, message: 'Tarama başlatıldı' });
});

app.post('/api/translate', async (req, res) => {
  translatePendingTitles().catch(console.error);
  res.json({ ok: true, message: 'Çeviri başlatıldı' });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('════════════════════════════════════════');
  console.log('  🏥  MedTech Digest v2 başlatıldı');
  console.log(`  👉  http://localhost:${PORT}`);
  console.log('  ✅  Çeviri: MyMemory (ücretsiz, key gerekmez)');
  console.log('════════════════════════════════════════');
  console.log('');

  // Önceki kötü özetleri temizle — kısa veya kurulum talimatı içerenleri sıfırla
  db.run(`UPDATE news SET turkish_summary = NULL WHERE length(turkish_summary) < 80 OR turkish_summary LIKE '%ollama.com%' OR turkish_summary LIKE '%kurulum%'`);

  // İlk yükleme
  setTimeout(() => scrapeAllSources(), 1000);

  // Her 6 saatte güncelle
  setInterval(() => scrapeAllSources(), 6 * 60 * 60 * 1000);

  // Her 30 dakikada çevrilmemiş başlıkları çevir
  setInterval(() => translatePendingTitles().catch(() => {}), 30 * 60 * 1000);
});
