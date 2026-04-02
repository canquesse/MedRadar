#!/bin/bash
# MedRadar — Tam Otomatik Kurulum ve Başlatma
# macOS Catalina 10.15 + Intel uyumlu

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║       🏥  MedRadar Başlatılıyor      ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Xcode Command Line Tools ────────────────────────────────────────────
if ! xcode-select -p &>/dev/null; then
  echo "⚙️  Geliştirici araçları kuruluyor (bir kez gerekli)..."
  xcode-select --install
  echo ""
  echo "   Açılan pencereden 'Yükle' butonuna tıkla."
  echo "   Kurulum bitince bu pencereyi kapat ve tekrar çift tıkla."
  read -p "   Enter'a bas..."
  exit 0
fi
echo "✓  Geliştirici araçları hazır"

# ── 2. Node.js sürüm kontrolü ─────────────────────────────────────────────
NEED_NODE=true
NODE_BIN="/usr/local/bin/node"

if [ -f "$NODE_BIN" ]; then
  NODE_VER=$("$NODE_BIN" --version 2>/dev/null)
  if [ $? -eq 0 ]; then
    MAJOR=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
    if [ "$MAJOR" -eq 18 ]; then
      NEED_NODE=false
      echo "✓  Node.js $NODE_VER hazır"
    elif [ "$MAJOR" -gt 18 ]; then
      echo "⚠️  Node.js $NODE_VER bu Mac ile uyumsuz (macOS Catalina için Node.js 18 gerekli)"
      echo "   Uyumlu sürüm kuruluyor, mevcut sürüm otomatik değiştirilecek..."
    else
      echo "⚠️  Node.js $NODE_VER eski — Node.js 18 kuruluyor..."
    fi
  else
    echo "⚠️  Node.js çalışmıyor — Node.js 18 kuruluyor..."
  fi
else
  echo "ℹ️  Node.js bulunamadı — kuruluyor..."
fi

if [ "$NEED_NODE" = true ]; then
  echo ""
  echo "📥  Node.js 18 indiriliyor (~33MB)..."
  curl -L --progress-bar \
    "https://nodejs.org/dist/v18.20.7/node-v18.20.7.pkg" \
    -o /tmp/medradar-node18.pkg

  if [ $? -ne 0 ]; then
    echo "✗  İndirme başarısız. İnternet bağlantını kontrol et ve tekrar dene."
    read -p "Enter'a bas..."; exit 1
  fi

  echo "📦  Node.js 18 kuruluyor (şifre istenebilir)..."
  sudo installer -pkg /tmp/medradar-node18.pkg -target /
  rm -f /tmp/medradar-node18.pkg

  # PATH yenile
  hash -r
  NODE_VER=$("$NODE_BIN" --version 2>/dev/null)
  echo "✓  Node.js $NODE_VER kuruldu"
fi

# ── 3. Repo klonla ya da güncelle ──────────────────────────────────────────
APP="$HOME/Desktop/MedRadar"

if [ ! -d "$APP/.git" ]; then
  echo ""
  echo "📥  MedRadar indiriliyor..."
  git clone https://github.com/canquesse/MedRadar.git "$APP"
  if [ $? -ne 0 ]; then
    echo "✗  İndirme başarısız. İnternet bağlantını kontrol et."
    read -p "Enter'a bas..."; exit 1
  fi
  echo "✓  İndirildi"
else
  echo "🔄  Güncelleniyor..."
  cd "$APP" && git pull --quiet origin main 2>/dev/null && echo "✓  Güncel" || echo "ℹ️  Zaten güncel"
fi

# ── 4. Bağımlılıkları kur ──────────────────────────────────────────────────
cd "$APP/medtech_digest"

if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  echo ""
  echo "📦  Bağımlılıklar kuruluyor (ilk seferinde 2-3 dk sürebilir)..."
  /usr/local/bin/npm install
  if [ $? -ne 0 ]; then
    echo "✗  Kurulum başarısız oldu."
    read -p "Enter'a bas..."; exit 1
  fi
  echo "✓  Bağımlılıklar hazır"
fi

# ── 5. Server başlat ───────────────────────────────────────────────────────
echo ""
echo "🚀  Server başlatılıyor..."

# Varsa eski process'i durdur
OLD_PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$OLD_PID" ]; then
  kill "$OLD_PID" 2>/dev/null
  sleep 1
fi

/usr/local/bin/npm start &
SERVER_PID=$!

# Hazır olana kadar bekle (max 20 sn)
echo -n "   Bekleniyor"
for i in {1..20}; do
  sleep 1
  echo -n "."
  if curl -s http://localhost:3000 &>/dev/null; then
    break
  fi
done
echo ""

echo "✅  Hazır! Tarayıcı açılıyor..."
open http://localhost:3000
echo ""
echo "   Bu pencereyi açık bırak — kapatırsan uygulama durur."
echo ""

wait $SERVER_PID
