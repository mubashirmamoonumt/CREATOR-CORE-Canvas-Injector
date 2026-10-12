#!/bin/bash

# =========================================================================================
#   CREATOR CORE - Canvas Automation Injector (macOS Uninstaller)
#   [ Developed by Mubashir Mamoon ]
# =========================================================================================

echo "========================================================================================="
echo "                 C R E A T O R   C O R E  (macOS Uninstaller)"
echo "              [ Developed by Mubashir Mamoon ]"
echo "========================================================================================="
echo ""

# 1. Kill background processes
echo "[*] Stopping running processes..."
pkill -f relay_server.py 2>/dev/null
pkill -f ngrok 2>/dev/null
echo "[OK] Processes stopped."

# 2. Delete installation directory
TARGET_DIR="$HOME/CREATOR-CORE-Canvas-Injector"
if [ -d "$TARGET_DIR" ]; then
    echo "[*] Deleting installation folder: $TARGET_DIR..."
    rm -rf "$TARGET_DIR"
    echo "[OK] Installation folder deleted."
else
    echo "[*] Installation folder not found."
fi

echo ""
echo "========================================================================================="
echo "               SYSTEM CLEANUP COMPLETED SUCCESSFULLY ON macOS!"
echo "========================================================================================="
echo ""
echo "To remove the extension from Chrome:"
echo "1. Open chrome://extensions"
echo "2. Find CREATOR CORE Canvas Injector and click 'Remove'."
echo "========================================================================================="
