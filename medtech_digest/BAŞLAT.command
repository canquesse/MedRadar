#!/bin/bash
# MedTech Digest — Mac başlatıcı
# Bu dosyaya çift tıkla, uygulama açılır

cd "$(dirname "$0")"

echo "🏥 MedTech Digest başlatılıyor..."

# Ollama çalışıyor mu kontrol et
if ! curl -s http://localhost:11434 > /dev/null 2>&1; then
  echo "⚙️  Ollama başlatılıyor..."
  open -a Ollama
  sleep 3
fi

# Model var mı kontrol et (qwen2.5:3b — llama3.2:3b'den çok daha iyi Türkçe)
if ! ollama list 2>/dev/null | grep -q "qwen2.5:3b"; then
  echo "📥 AI modeli indiriliyor (ilk kurulum ~2GB, bekleyiniz)..."
  ollama pull qwen2.5:3b
fi

echo "🚀 Server başlatılıyor..."
npm start &
SERVER_PID=$!

sleep 2
echo "✅ Hazır! Tarayıcı açılıyor..."
open http://localhost:3000

echo ""
echo "Kapatmak için bu pencereyi kapatın."
wait $SERVER_PID
