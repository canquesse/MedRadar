# 🏥 MedTech Digest

Global tıbbi teknoloji haberlerini Türkçe olarak takip eden, FDA & CE onaylarını listeleyen kişisel platform.

---

## Kurulum (Windows veya Mac)

### 1. Node.js Kur

- **Windows / Mac:** [nodejs.org](https://nodejs.org) adresine git, **LTS** sürümünü indir ve kur.

### 2. Projeyi İndir

Terminali (Mac: Terminal, Windows: Komut İstemi) aç ve şunu çalıştır:

```
git clone https://github.com/canquesse/medtech-digest.git
cd medtech-digest
```

> Git kurulu değilse: [git-scm.com](https://git-scm.com) adresinden kur.

### 3. Bağımlılıkları Kur

```
cd medtech_digest
npm install
```

### 4. Başlat

**Windows:** `medtech_digest` klasöründeki `BAŞLAT.bat` dosyasına çift tıkla.

**Mac:** `medtech_digest` klasöründeki `BAŞLAT.command` dosyasına çift tıkla.
> İlk açılışta "açılamıyor" derse: dosyaya sağ tıkla → Aç → Aç.

**Elle başlatmak istersen:**
```
cd medtech_digest
npm start
```

Tarayıcıda aç: **http://localhost:3000**

---

## Özellikler

- 30+ kaynaktan gerçek zamanlı medikal teknoloji haberleri
- Otomatik Türkçe başlık çevirisi (ücretsiz, internet bağlantısı yeterli)
- FDA 510(k), PMA ve CE/MDR onayları
- Kategori filtreleme, favori kaydetme
- Oyun değiştirici haberleri öne çıkarma

---

## Notlar

- Uygulama bilgisayarında çalışır, internet bağlantısı yalnızca haber çekmek için gerekir.
- Veriler `medtech_digest/news.db` dosyasında saklanır (git'e yüklenmez).
- Haberler her açılışta otomatik güncellenir; elle güncellemek için **🔄 Yenile** butonunu kullan.
