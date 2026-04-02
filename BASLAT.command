#!/bin/bash
# MedRadar — Çift tıkla, her şeyi halleder

cd "$(dirname "$0")"

# ── Renkler ────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC}  $1"; }
info() { echo -e "${YELLOW}…${NC}  $1"; }
err()  { echo -e "${RED}✗${NC}  $1"; }

echo ""
echo "  🏥  MedRadar başlatılıyor..."
echo "  ────────────────────────────"
echo ""

# ── 1. Node.js kontrolü ────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  err "Node.js kurulu değil!"
  echo ""
  echo "  Lütfen şu adımları izle:"
  echo "  1) https://nodejs.org adresine git"
  echo "  2) LTS yazan yeşil butona tıkla"
  echo "  3) İndirilen .pkg dosyasını aç ve kur"
  echo "  4) Bilgisayarı yeniden başlat"
  echo "  5) Bu dosyaya tekrar çift tıkla"
  echo ""
  read -p "  Kapatmak için Enter'a bas..."
  exit 1
fi
ok "Node.js $(node -v) bulundu"

# ── 2. Git kontrolü ────────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  info "Git kuruluyor (bir kez gerekli, onay ver)..."
  xcode-select --install 2>/dev/null
  sleep 3
  echo ""
  echo "  Açılan pencereden 'Yükle' / 'Install' butonuna tıkla."
  echo "  Kurulum bitince bu dosyaya tekrar çift tıkla."
  echo ""
  read -p "  Kapatmak için Enter'a bas..."
  exit 0
fi
ok "Git $(git --version | awk '{print $3}') bulundu"

# ── 3. Repo var mı? → Klonla ya da güncelle ────────────────────────────────
APP_DIR="$HOME/Desktop/MedRadar"

if [ ! -d "$APP_DIR/.git" ]; then
  info "Uygulama ilk kez indiriliyor..."
  git clone https://github.com/canquesse/MedRadar.git "$APP_DIR" 2>&1 | grep -v "^$"
  ok "İndirildi"
else
  info "Güncelleme kontrol ediliyor..."
  cd "$APP_DIR"
  git pull --quiet origin main && ok "Güncelleme tamam" || info "Zaten güncel"
fi

cd "$APP_DIR/medtech_digest"

# ── 4. node_modules kurulu mu? ────────────────────────────────────────────
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  info "Gerekli paketler kuruluyor (ilk seferinde 1-2 dk sürebilir)..."
  npm install --silent
  ok "Paketler kuruldu"
else
  ok "Paketler hazır"
fi

# ── 5. Server başlat ───────────────────────────────────────────────────────
info "Server başlatılıyor..."
npm start &
SERVER_PID=$!

# Server hazır olana kadar bekle (max 15 sn)
for i in {1..15}; do
  sleep 1
  if curl -s http://localhost:3000 &>/dev/null; then
    break
  fi
done

ok "Hazır!"
echo ""
echo "  👉  Tarayıcıda açılıyor: http://localhost:3000"
echo ""
open http://localhost:3000

echo "  Bu pencereyi açık bırak. Kapatırsan uygulama durur."
echo ""

# Server bitene kadar bekle
wait $SERVER_PID
