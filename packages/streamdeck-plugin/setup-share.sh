#!/bin/bash
# Setup Samba share on Linux NDI router for Stream Deck plugin distribution

set -e

SHARE_NAME="vmcr-plugins"
SHARE_PATH="/opt/vmcr/plugins"
PLUGIN_SOURCE="$HOME/vmcr/packages/streamdeck-plugin/com.remoteproduction.vmcr.sdPlugin"

echo "=== Virtual MCR Plugin Share Setup ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: Please run as root (sudo)"
    exit 1
fi

# Install Samba if not present
if ! command -v smbpasswd &> /dev/null; then
    echo "[1/5] Installing Samba..."
    apt-get update
    apt-get install -y samba samba-common-bin
else
    echo "[1/5] Samba already installed"
fi

# Create share directory
echo "[2/5] Creating share directory: $SHARE_PATH"
mkdir -p "$SHARE_PATH"

# Copy plugin to share
echo "[3/5] Copying plugin to share..."
if [ -d "$PLUGIN_SOURCE" ]; then
    cp -r "$PLUGIN_SOURCE" "$SHARE_PATH/"
    echo "    Plugin copied successfully"
else
    echo "    WARNING: Plugin source not found at: $PLUGIN_SOURCE"
    echo "    You'll need to copy it manually later"
fi

# Set permissions
chmod -R 755 "$SHARE_PATH"

# Configure Samba share
echo "[4/5] Configuring Samba share..."

if ! grep -q "\[$SHARE_NAME\]" /etc/samba/smb.conf; then
    cat >> /etc/samba/smb.conf << EOF

[$SHARE_NAME]
   comment = Virtual MCR Stream Deck Plugins
   path = $SHARE_PATH
   browseable = yes
   read only = yes
   guest ok = yes
   create mask = 0644
   directory mask = 0755
EOF
    echo "    Samba configuration added"
else
    echo "    Samba share already configured"
fi

# Restart Samba
echo "[5/5] Restarting Samba service..."
systemctl restart smbd
systemctl enable smbd

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Share details:"
echo "  Path: \\\\10.15.130.112\\$SHARE_NAME"
echo "  Local: $SHARE_PATH"
echo ""
echo "To update the plugin on the share:"
echo "  sudo cp -r <path-to-plugin> $SHARE_PATH/"
echo ""
echo "Windows installation command:"
echo "  PowerShell -ExecutionPolicy Bypass -File install-from-share.ps1"
echo ""
