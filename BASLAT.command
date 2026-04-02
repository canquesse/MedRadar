#!/bin/bash
# MedRadar — Tanımlama + Kurulum scripti

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
LOG="$HOME/Desktop/medradar-log.txt"

# Hem terminale hem dosyaya yaz
exec > >(tee "$LOG") 2>&1

echo "════════════════════════════════════════"
echo "  MedRadar Tanılama Raporu"
echo "  $(date)"
echo "════════════════════════════════════════"
echo ""

echo "── SİSTEM ──────────────────────────────"
echo "macOS: $(sw_vers -productVersion)"
echo "Mimari: $(uname -m)"
echo "Hostname: $(hostname)"
echo ""

echo "── NODE.JS ─────────────────────────────"
echo "which node: $(which node 2>/dev/null || echo 'BULUNAMADI')"
echo "which npm:  $(which npm 2>/dev/null || echo 'BULUNAMADI')"
echo ""

for p in /usr/local/bin /opt/homebrew/bin /opt/homebrew/opt/node@18/bin /opt/homebrew/opt/node@20/bin; do
  if [ -f "$p/node" ]; then
    echo -n "$p/node → sürüm: "
    "$p/node" --version 2>&1 || echo "ÇALIŞMIYOR (dyld/abi hatası)"
    echo -n "$p/node → çalışıyor mu: "
    "$p/node" -e "console.log('OK')" 2>&1
  fi
done
echo ""

echo "── NPM ─────────────────────────────────"
if command -v npm &>/dev/null; then
  npm --version 2>&1 || echo "npm çalışmıyor"
else
  echo "npm bulunamadı"
fi
echo ""

echo "── GIT ─────────────────────────────────"
echo "which git: $(which git 2>/dev/null || echo 'BULUNAMADI')"
git --version 2>&1 || echo "git çalışmıyor"
echo ""

echo "── XCODE CLT ───────────────────────────"
xcode-select -p 2>&1
echo ""

echo "── MASAÜSTÜ MedRadar KLASÖRÜ ───────────"
APP="$HOME/Desktop/MedRadar"
if [ -d "$APP" ]; then
  echo "Klasör mevcut: $APP"
  ls "$APP" 2>&1
  echo ""
  echo "medtech_digest:"
  ls "$APP/medtech_digest" 2>&1
  echo ""
  echo "node_modules var mı: $([ -d "$APP/medtech_digest/node_modules" ] && echo 'EVET' || echo 'HAYIR')"
  echo "package.json: $(cat "$APP/medtech_digest/package.json" 2>/dev/null | head -5 || echo 'YOK')"
else
  echo "Klasör YOK: $APP"
fi
echo ""

echo "── PORT 3000 ────────────────────────────"
lsof -ti:3000 2>/dev/null && echo "3000 portu kullanımda" || echo "3000 portu boş"
echo ""

echo "── KURULUM BAŞLIYOR ─────────────────────"
echo ""

# Xcode CLT
if ! xcode-select -p &>/dev/null; then
  echo "! Xcode CLT kuruluyor..."
  xcode-select --install
  echo "  Açılan pencereden 'Yükle' tıkla, bitince tekrar çalıştır."
  read -p "  Enter'a bas..."
  exit 0
fi
echo "✓ Xcode CLT hazır"

# Node.js kontrolü — çalışıp çalışmadığına bak
NODE_OK=false
NODE_BIN=""
for p in /usr/local/bin /opt/homebrew/bin /opt/homebrew/opt/node@18/bin; do
  if [ -f "$p/node" ]; then
    TEST=$("$p/node" -e "console.log('ok')" 2>&1)
    if [ "$TEST" = "ok" ]; then
      VER=$("$p/node" --version 2>&1)
      MAJOR=$(echo "$VER" | sed 's/v//' | cut -d. -f1)
      if [ "$MAJOR" -eq 18 ]; then
        NODE_OK=true
        NODE_BIN="$p/node"
        NPM_BIN="$p/npm"
        echo "✓ Node.js $VER çalışıyor ($p)"
        break
      else
        echo "! Node.js $VER var ama uyumsuz (Catalina için 18 gerekli)"
      fi
    else
      echo "! $p/node ÇALIŞMIYOR: $TEST"
    fi
  fi
done

if [ "$NODE_OK" = false ]; then
  echo ""
  echo "→ Node.js 18 indiriliyor..."
  curl -L --progress-bar \
    "https://nodejs.org/dist/v18.20.7/node-v18.20.7.pkg" \
    -o /tmp/node18.pkg
  echo "→ Kuruluyor (şifre istenebilir)..."
  sudo installer -pkg /tmp/node18.pkg -target /
  rm -f /tmp/node18.pkg
  hash -r
  TEST=$(/usr/local/bin/node -e "console.log('ok')" 2>&1)
  if [ "$TEST" = "ok" ]; then
    echo "✓ Node.js 18 kuruldu"
    NODE_BIN="/usr/local/bin/node"
    NPM_BIN="/usr/local/bin/npm"
  else
    echo "✗ Node.js hâlâ çalışmıyor: $TEST"
    echo ""
    echo "Log dosyası masaüstünde: medradar-log.txt"
    echo "Bu dosyayı geliştiriciye gönder."
    read -p "Enter'a bas..."
    exit 1
  fi
fi

# Repo
if [ ! -d "$APP/.git" ]; then
  echo "→ MedRadar indiriliyor..."
  git clone https://github.com/canquesse/MedRadar.git "$APP" 2>&1
else
  echo "→ Güncelleniyor..."
  cd "$APP" && git pull origin main 2>&1
fi

# npm install
cd "$APP/medtech_digest"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  echo "→ npm install..."
  "$NPM_BIN" install 2>&1
fi

# Eski process durdur
OLD=$(lsof -ti:3000 2>/dev/null)
[ -n "$OLD" ] && kill "$OLD" 2>/dev/null && sleep 1

# Başlat
echo ""
echo "→ Server başlatılıyor..."
"$NPM_BIN" start &
PID=$!

echo -n "  Bekleniyor"
for i in {1..20}; do
  sleep 1; echo -n "."
  curl -s http://localhost:3000 &>/dev/null && break
done
echo ""

if curl -s http://localhost:3000 &>/dev/null; then
  echo "✅ Hazır! Tarayıcı açılıyor."
  open http://localhost:3000
else
  echo "✗ Server başlamadı."
  echo "Log dosyası masaüstünde: medradar-log.txt"
fi

echo ""
echo "════════════════════════════════════════"
echo "Log kaydedildi: $LOG"
echo "════════════════════════════════════════"

wait $PID
