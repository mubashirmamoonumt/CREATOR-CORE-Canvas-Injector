#!/bin/bash

# =========================================================================================
#   CREATOR CORE - Canvas Automation Injector (macOS Installer)
#   [ Developed by Mubashir Mamoon ]
# =========================================================================================

echo "========================================================================================="
echo "                 C R E A T O R   C O R E  (macOS Setup)"
echo "              [ Developed by Mubashir Mamoon ]"
echo "========================================================================================="
echo ""

# 1. Target Directory Set karein
DEFAULT_DIR="$HOME/CREATOR-CORE-Canvas-Injector"
TARGET_DIR="$DEFAULT_DIR"

mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR" || exit

# 2. Check Homebrew, Git & Python3
if ! command -v git &> /dev/null; then
    echo "[!] Git install nahi hai. Xcode Command Line Tools install ho rahe hain..."
    xcode-select --install
fi

if ! command -v python3 &> /dev/null; then
    echo "[!] Python3 install nahi hai. Please install Python from https://www.python.org/downloads/"
    exit 1
fi

# 3. Clone / Update Repository
if [ -d "$TARGET_DIR/.git" ]; then
    echo "[*] Repository update ho rahi hai..."
    git pull origin main
else
    echo "[*] Repository clone ho rahi hai..."
    git clone https://github.com/mubashirmamoonumt/CREATOR-CORE-Canvas-Injector.git "$TARGET_DIR"
fi

# 4. Install Python Dependencies
echo "[*] Python libraries install ho rahi hain..."
python3 -m pip install --upgrade pip
python3 -m pip install aiohttp websockets requests

# 5. Check Ngrok for macOS
if ! command -v ngrok &> /dev/null; then
    if [ ! -f "$TARGET_DIR/ngrok" ]; then
        echo "[*] Ngrok for macOS download ho raha hai..."
        ARCH=$(uname -m)
        if [ "$ARCH" = "arm64" ]; then
            curl -sO https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-darwin-arm64.zip
            unzip -q ngrok-v3-stable-darwin-arm64.zip
            rm ngrok-v3-stable-darwin-arm64.zip
        else
            curl -sO https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-darwin-amd64.zip
            unzip -q ngrok-v3-stable-darwin-amd64.zip
            rm ngrok-v3-stable-darwin-amd64.zip
        fi
        chmod +x "$TARGET_DIR/ngrok"
    fi
fi

# 6. Background Service Start Script
cat << 'EOF' > "$TARGET_DIR/start_services.sh"
#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
pkill -f relay_server.py
pkill -f ngrok
nohup python3 "$DIR/relay_server.py" > "$DIR/relay.log" 2>&1 &
nohup "$DIR/ngrok" http 5000 > "$DIR/ngrok.log" 2>&1 &
echo "[OK] Services running in background."
EOF
chmod +x "$TARGET_DIR/start_services.sh"
"$TARGET_DIR/start_services.sh"

# 7. Copy Path to macOS Clipboard (pbcopy)
echo -n "$TARGET_DIR" | pbcopy

echo ""
echo "========================================================================================="
echo "               INSTALLATION COMPLETED SUCCESSFULLY ON macOS!"
echo "========================================================================================="
echo ""
echo "  [!] EXTENSION FOLDER PATH CLIPBOARD MEIN COPY HO GAYA HAI!"
echo "  FOLDER PATH: $TARGET_DIR"
echo ""
echo "  GOOGLE CHROME MEIN LOAD KARNE KA TAREEQA:"
echo "   1. Google Chrome open karein aur URL dalein: chrome://extensions"
echo "   2. Top-right se 'Developer mode' toggle ON karein."
echo "   3. 'Load unpacked' par click karein."
echo "   4. (Cmd + Shift + G) press karke path paste (Cmd + V) karein aur open karein."
echo "========================================================================================="
open -a "Google Chrome" "chrome://extensions" 2>/dev/null || open "chrome://extensions"
