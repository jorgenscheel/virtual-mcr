# Stream Deck Plugin Installation for Windows

## Quick Install (Recommended)

### Method 1: PowerShell Auto-Installer

1. **Download the installer script** from the network share or copy it to your Windows machine
2. **Open PowerShell as Administrator** (right-click Start → Windows PowerShell (Admin))
3. **Run the installer:**
   ```powershell
   cd C:\path\to\script
   PowerShell -ExecutionPolicy Bypass -File install-from-share.ps1
   ```

The script will:
- Check if Stream Deck is installed
- Download the plugin from `\\10.15.130.112\vmcr-plugins`
- Install to `%APPDATA%\Elgato\StreamDeck\Plugins\`
- Verify installation

### Method 2: Manual Installation

1. **Access the network share:**
   - Open File Explorer
   - In the address bar, type: `\\10.15.130.112\vmcr-plugins`
   - Press Enter
   - **When prompted for credentials:**
     - Username: `operations`
     - Password: `vmcr2024`
     - (Optional) Check "Remember my credentials"

2. **Copy the plugin folder:**
   - Right-click `com.remoteproduction.vmcr.sdPlugin`
   - Select **Copy**

3. **Navigate to Stream Deck plugins folder:**
   - Press `Win+R` to open Run dialog
   - Type: `%APPDATA%\Elgato\StreamDeck\Plugins`
   - Press Enter

4. **Paste the plugin:**
   - Right-click in the folder → **Paste**
   - Wait for copy to complete

5. **Restart Stream Deck app**

## Configuration

1. **Open Stream Deck app**
2. **Click the gear icon** (Settings)
3. **Find "Virtual MCR"** in the plugins list
4. **Configure settings:**
   - **Backend Mode:** `ndi-router`
   - **Router URL:** `http://10.15.130.112:9400`

## Adding Buttons

### Select Source Button
- **Purpose:** Route an NDI source to a specific output channel
- **Setup:**
  1. Drag "Select Source" action onto a Stream Deck key
  2. In Property Inspector:
     - **Channel:** Select which output (vmcr-1 through vmcr-4)
     - **Source:** Pick from available NDI sources
  3. Press the button to route the source

### Output Status Button
- **Purpose:** Display current routing status for a channel
- **Setup:**
  1. Drag "Output Status" action onto a Stream Deck key
  2. In Property Inspector:
     - **Channel:** Select which output to monitor (vmcr-1 through vmcr-4)
  3. Button shows:
     - Channel color
     - Current source name
     - Connection status (routed/idle/error)

## Troubleshooting

### Cannot Access Network Share
- **Check network connectivity:** `ping 10.15.130.112`
- **Try with IP:** `\\10.15.130.112\vmcr-plugins`
- **Verify Samba is running on Linux server:**
  ```bash
  ssh operations@10.0.10.112 'sudo systemctl status smbd'
  ```

### Plugin Not Appearing
- **Verify plugin folder exists:**
  - `%APPDATA%\Elgato\StreamDeck\Plugins\com.remoteproduction.vmcr.sdPlugin`
- **Check plugin.js exists:**
  - `%APPDATA%\Elgato\StreamDeck\Plugins\com.remoteproduction.vmcr.sdPlugin\bin\plugin.js`
- **Restart Stream Deck app completely** (not just refresh)
- **Check Windows Event Viewer** for Stream Deck errors

### Cannot Connect to NDI Router
- **Verify NDI router is running:**
  ```bash
  curl http://10.15.130.112:9400/api/health
  ```
- **Check Router URL in settings:** Must be `http://10.15.130.112:9400` (no trailing slash)
- **Verify firewall allows port 9400**

### Sources Not Appearing
- **WAIT 4 MINUTES:** Known network latency issue on VLAN 1513 causes API calls to take 4+ minutes. Sources and channels WILL eventually load.
- **Check NDI group matches:** NDI router uses group `vmcr`
- **Verify NDI sources are discoverable:**
  ```bash
  curl http://10.15.130.112:9400/api/sources
  ```
- **Check NDI sources are on VLAN 1513** (10.15.128.0/22)

### Slow Loading (4+ Minutes)
- **Known issue:** API calls to 10.15.130.112:9400 experience extreme latency on VLAN 1513
- **Symptom:** Channel and Source dropdowns take 4+ minutes to populate despite fast ping times
- **Workaround:** Be patient - dropdowns WILL populate after ~4 minutes
- **Root cause:** Under investigation - suspected TCP window scaling or QoS issue
- **Tracking:** See GitHub issue for VLAN 1513 network latency

## Updating the Plugin

When a new version is released:

1. **Update the share** (on Linux server):
   ```bash
   ssh operations@10.0.10.112
   sudo cp -r /path/to/new/com.remoteproduction.vmcr.sdPlugin /opt/vmcr/plugins/
   ```

2. **On Windows, close Stream Deck app**

3. **Run installer script again** or manually copy from share

4. **Restart Stream Deck app**

## Network Share Details

- **Path:** `\\10.15.130.112\vmcr-plugins`
- **Linux path:** `/opt/vmcr/plugins/`
- **Username:** `operations`
- **Password:** `vmcr2024`
- **Protocol:** SMB/CIFS (Samba)

## Support

For issues:
- Check NDI router logs: `ssh operations@10.0.10.112 'pm2 logs ndi-router'`
- Check Stream Deck logs: `%APPDATA%\Elgato\StreamDeck\Logs`
- Verify network connectivity between Windows and Linux (VLAN 1513)
