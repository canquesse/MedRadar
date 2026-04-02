const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'news.db'));

const sampleNews = [
  { title: 'Apple Watch Gains FDA Approval for New ECG Feature', source: 'MedTech Dive', company_url: 'https://www.medtechdive.com', link: 'https://www.medtechdive.com/example1', category: 'monitoring', image_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop' },
  { title: 'AI-Powered Diagnostic Tool Shows 95% Accuracy in Cancer Detection', source: 'Medical Futurist', company_url: 'https://medicalfuturist.com', link: 'https://medicalfuturist.com/example2', category: 'ai', image_url: 'https://images.unsplash.com/photo-1579154204601-01d8e8eda5b6?w=400&h=300&fit=crop' },
  { title: 'Real-Time Glucose Monitoring System Wins FDA 510(k) Clearance', source: 'MassDevice', company_url: 'https://www.massdevice.com', link: 'https://www.massdevice.com/example3', category: 'diabetes', image_url: 'https://images.unsplash.com/photo-1631217314997-dc3ec22e4381?w=400&h=300&fit=crop' },
  { title: 'Robotic Surgery Platform Expands to 50th Hospital Network', source: 'Med City News', company_url: 'https://medcitynews.com', link: 'https://medcitynews.com/example4', category: 'surgical', image_url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde0b?w=400&h=300&fit=crop' },
  { title: 'Portable Ultrasound Device Gets Cleared for Emergency Use', source: 'Healthcare IT News', company_url: 'https://www.healthcareitnews.com', link: 'https://www.healthcareitnews.com/example5', category: 'imaging', image_url: 'https://images.unsplash.com/photo-1576091160699-112d7cb3c0fa?w=400&h=300&fit=crop' },
  { title: 'Wearable Patch Detects Drug Dosage in Real Time', source: 'MedGadget', company_url: 'https://www.medgadget.com', link: 'https://www.medgadget.com/example6', category: 'drug-delivery', image_url: 'https://images.unsplash.com/photo-1631217314986-cdbb20caf635?w=400&h=300&fit=crop' },
  { title: 'CRISPR Gene Therapy Device Achieves Breakthrough Clinical Trial Results', source: 'Fierce Biotech', company_url: 'https://www.fiercebiotech.com', link: 'https://www.fiercebiotech.com/example7', category: 'genetic', image_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop' },
  { title: 'Neural Interface System Enables Brain-Computer Communication', source: 'News Medical', company_url: 'https://www.news-medical.net', link: 'https://www.news-medical.net/example8', category: 'neurology', image_url: 'https://images.unsplash.com/photo-1579154204601-01d8e8eda5b6?w=400&h=300&fit=crop' },
  { title: 'Smart Inhaler Combines IoT and AI for Asthma Management', source: 'Medical Device Network', company_url: 'https://www.medicaldevice-network.com', link: 'https://www.medicaldevice-network.com/example9', category: 'monitoring', image_url: 'https://images.unsplash.com/photo-1631217314997-dc3ec22e4381?w=400&h=300&fit=crop' },
  { title: 'FDA Approves First-of-Its-Kind Implantable Biofuel Cell', source: 'MedTech Dive', company_url: 'https://www.medtechdive.com', link: 'https://www.medtechdive.com/example10', category: 'implant', image_url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde0b?w=400&h=300&fit=crop' },
  { title: 'Non-Invasive Brain Stimulation Device Launches in 15 Countries', source: 'Healthcare Global', company_url: 'https://healthcareglobal.com', link: 'https://healthcareglobal.com/example11', category: 'neurology', image_url: 'https://images.unsplash.com/photo-1576091160699-112d7cb3c0fa?w=400&h=300&fit=crop' },
  { title: 'Artificial Retina Implant Restores Vision to Blind Patients', source: 'Medical Futurist', company_url: 'https://medicalfuturist.com', link: 'https://medicalfuturist.com/example12', category: 'implant', image_url: 'https://images.unsplash.com/photo-1631217314986-cdbb20caf635?w=400&h=300&fit=crop' },
];

const sampleApprovals = [
  { device_name: 'Continuous Glucose Monitoring System Model X', body: 'FDA', approval_type: '510(k)', reference_number: 'K240001', applicant: 'Abbott Diabetes Care', approval_date: '2026-03-28' },
  { device_name: 'AI-Assisted Cardiac Imaging Software', body: 'FDA', approval_type: 'De Novo', reference_number: 'DEN240002', applicant: 'Viz.ai Inc.', approval_date: '2026-03-27' },
  { device_name: 'Portable Ultrasound Scanner Pro', body: 'FDA', approval_type: '510(k)', reference_number: 'K240003', applicant: 'Butterfly Network', approval_date: '2026-03-26' },
  { device_name: 'Smart Insulin Pen with Connectivity', body: 'FDA', approval_type: '510(k)', reference_number: 'K240004', applicant: 'Novo Nordisk', approval_date: '2026-03-25' },
  { device_name: 'Real-Time EMG Monitoring Device', body: 'FDA', approval_type: '510(k)', reference_number: 'K240005', applicant: 'Delsys Inc.', approval_date: '2026-03-24' },
  { device_name: 'AI Skin Lesion Analysis System', body: 'CE', approval_type: 'MDR Class IIa', reference_number: 'CE-MDR-2026-0041', applicant: 'DermaScan GmbH', approval_date: '2026-03-27' },
  { device_name: 'Implantable Cardiac Loop Recorder v3', body: 'CE', approval_type: 'MDR Class III', reference_number: 'CE-MDR-2026-0039', applicant: 'Medtronic Europe', approval_date: '2026-03-26' },
  { device_name: 'Robotic Knee Replacement System', body: 'CE', approval_type: 'MDR Class IIb', reference_number: 'CE-MDR-2026-0038', applicant: 'Stryker Corporation', approval_date: '2026-03-25' },
];

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    english_summary TEXT,
    turkish_summary TEXT,
    link TEXT UNIQUE,
    company_url TEXT,
    source TEXT,
    category TEXT DEFAULT 'general',
    image_url TEXT,
    is_favorite INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

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

  const TR = `Bu haber, sağlık teknolojisi sektöründe önemli bir gelişmeyi anlatmaktadır. Yeni cihaz veya teknoloji, hastalıkların teşhis ve tedavisinde önemli katkı sunmaktadır. Pazar analizcileri bu gelişmenin endüstride büyük etki yaratacağını öngörmektedir. Klinik çalışmalar başarılı sonuçlar vermiş olup yakında geniş kullanıma sunulması beklenmektedir.`;

  sampleNews.forEach((item, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (idx % 3));
    db.run(
      `INSERT OR IGNORE INTO news (title, source, company_url, link, image_url, category, turkish_summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.title, item.source, item.company_url, item.link, item.image_url, item.category, TR, d.toISOString()],
      (err) => { if (err && !err.message.includes('UNIQUE')) console.error(err.message); }
    );
  });

  sampleApprovals.forEach((item) => {
    db.run(
      `INSERT OR IGNORE INTO approvals (device_name, body, approval_type, reference_number, applicant, approval_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [item.device_name, item.body, item.approval_type, item.reference_number, item.applicant, item.approval_date],
      (err) => { if (err && !err.message.includes('UNIQUE')) console.error(err.message); }
    );
  });

  console.log('✅ Seed data yüklendi.');
});

setTimeout(() => db.close(), 1000);
