# Stream Deck Plugin Installer for Windows
# Installs Virtual MCR plugin from network share on Linux NDI router

param(
    [string]$SharePath = "\\10.15.130.112\vmcr-plugins",
    [string]$PluginName = "com.remoteproduction.vmcr.sdPlugin"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Virtual MCR Stream Deck Plugin Installer ===" -ForegroundColor Cyan
Write-Host ""

# Check if Stream Deck is installed
$streamDeckPath = "$env:APPDATA\Elgato\StreamDeck\Plugins"
if (-not (Test-Path $streamDeckPath)) {
    Write-Host "ERROR: Stream Deck not found. Please install Elgato Stream Deck software first." -ForegroundColor Red
    Write-Host "Expected path: $streamDeckPath" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/4] Stream Deck installation found: $streamDeckPath" -ForegroundColor Green

# Check if share is accessible
$sourcePlugin = Join-Path $SharePath $PluginName
Write-Host "[2/4] Checking network share: $sourcePlugin" -ForegroundColor Yellow

if (-not (Test-Path $sourcePlugin)) {
    Write-Host "ERROR: Cannot access plugin on network share." -ForegroundColor Red
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "  1. Network share is mounted: $SharePath" -ForegroundColor Yellow
    Write-Host "  2. Plugin folder exists: $PluginName" -ForegroundColor Yellow
    Write-Host "  3. You have read permissions" -ForegroundColor Yellow
    exit 1
}

Write-Host "    Network share accessible" -ForegroundColor Green

# Check if plugin is already installed
$destPlugin = Join-Path $streamDeckPath $PluginName
if (Test-Path $destPlugin) {
    Write-Host "[3/4] Existing plugin found. Removing..." -ForegroundColor Yellow

    # Check if Stream Deck is running
    $streamDeckProcess = Get-Process -Name "StreamDeck" -ErrorAction SilentlyContinue
    if ($streamDeckProcess) {
        Write-Host "    WARNING: Stream Deck is running. Please close it first." -ForegroundColor Red
        Write-Host "    Press any key after closing Stream Deck, or Ctrl+C to cancel..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }

    Remove-Item -Path $destPlugin -Recurse -Force
    Write-Host "    Old plugin removed" -ForegroundColor Green
} else {
    Write-Host "[3/4] No existing plugin found" -ForegroundColor Green
}

# Copy plugin from share
Write-Host "[4/4] Installing plugin..." -ForegroundColor Yellow
Copy-Item -Path $sourcePlugin -Destination $streamDeckPath -Recurse -Force

# Verify installation
if (Test-Path (Join-Path $destPlugin "bin\plugin.js")) {
    Write-Host "    Plugin installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Installation Complete ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Start Elgato Stream Deck application"
    Write-Host "  2. Open Stream Deck preferences"
    Write-Host "  3. Find 'Virtual MCR' plugin"
    Write-Host "  4. Configure settings:"
    Write-Host "       - Backend Mode: ndi-router"
    Write-Host "       - Router URL: http://10.15.130.112:9400"
    Write-Host "  5. Add 'Select Source' and 'Output Status' actions to your Stream Deck"
    Write-Host ""
} else {
    Write-Host "ERROR: Installation failed. Plugin files not found." -ForegroundColor Red
    exit 1
}
