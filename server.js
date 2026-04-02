const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const app = express();
const PORT = 3737;
const DIGEST_DIR = path.join(__dirname, 'medtech_digest');
const FAVORITES_DIR = path.join(DIGEST_DIR, 'favorites');
const TRACKED_FILE = path.join(DIGEST_DIR, 'tracked_products.json');

[DIGEST_DIR, FAVORITES_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

if (!fs.existsSync(TRACKED_FILE)) {
  fs.writeFileSync(TRACKED_FILE, JSON.stringify({ products: [], last_updated: null }, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function cleanupArchive() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3);
  const favDates = new Set(
    fs.readdirSync(FAVORITES_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
  );
  fs.readdirSync(DIGEST_DIR)
    .filter(f => /^\d{4}-\d{2}-\d{2}\.(md|json)$/.test(f))
    .forEach(f => {
      const d = new Date(f.substring(0, 10));
      if (d < cutoff && !favDates.has(f.substring(0, 10))) {
        try { fs.unlinkSync(path.join(DIGEST_DIR, f)); } catch {}
      }
    });
}

cleanupArchive();

// List all digests
app.get('/api/digests', (req, res) => {
  const jsonFiles = new Set(
    fs.readdirSync(DIGEST_DIR).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map(f => f.replace('.json', ''))
  );
  const mdFiles = new Set(
    fs.readdirSync(DIGEST_DIR).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).map(f => f.replace('.md', ''))
  );
  const favDates = new Set(
    fs.readdirSync(FAVORITES_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
  );
  const dates = [...new Set([...jsonFiles, ...mdFiles])].sort().reverse();
  res.json(dates.map(date => ({
    date,
    hasStructured: jsonFiles.has(date),
    hasMd: mdFiles.has(date),
    isFavorite: favDates.has(date)
  })));
});

// Get structured JSON data
app.get('/api/data/:date', (req, res) => {
  const fp = path.join(DIGEST_DIR, `${req.params.date}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Veri yok' });
  res.json(JSON.parse(fs.readFileSync(fp, 'utf-8')));
});

// Get markdown
app.get('/api/digest/:date', (req, res) => {
  const fp = path.join(DIGEST_DIR, `${req.params.date}.md`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Özet yok' });
  const raw = fs.readFileSync(fp, 'utf-8');
  res.json({ html: marked(raw), raw });
});

// Toggle favorite
app.post('/api/favorite/:date', (req, res) => {
  const { date } = req.params;
  const favPath = path.join(FAVORITES_DIR, `${date}.json`);
  if (fs.existsSync(favPath)) {
    fs.unlinkSync(favPath);
    return res.json({ saved: false });
  }
  const src = path.join(DIGEST_DIR, `${date}.json`);
  fs.existsSync(src)
    ? fs.copyFileSync(src, favPath)
    : fs.writeFileSync(favPath, JSON.stringify({ date, saved: true }));
  res.json({ saved: true });
});

// Get favorites
app.get('/api/favorites', (req, res) => {
  const files = fs.readdirSync(FAVORITES_DIR).filter(f => f.endsWith('.json'));
  res.json(files.map(f => f.replace('.json', '')).sort().reverse());
});

// Stats
app.get('/api/stats', (req, res) => {
  const tracked = JSON.parse(fs.readFileSync(TRACKED_FILE, 'utf-8'));
  res.json({ total_tracked: tracked.products?.length || 0, last_updated: tracked.last_updated });
});

app.listen(PORT, () => console.log(`\n🏥 MedTech Intelligence → http://localhost:${PORT}\n`));
