#!/bin/sh
set -eu

PORT="${PORT:-3000}"
LAN_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
URL="http://$LAN_IP:$PORT"
QR_PNG=/tmp/forti-share.png

echo "Starting Forti on $URL"

qrencode -o "$QR_PNG" "$URL"
open "$QR_PNG"

echo "QR saved to $QR_PNG and opened in Preview"
echo "Phone URL: $URL"
