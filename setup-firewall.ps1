# TrustConnect Firewall Setup
# This script adds a Windows Firewall rule to allow your phone to connect to the backend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TrustConnect Firewall Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ERROR] This script requires Administrator privileges" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "  1. Right-click on this file (setup-firewall.ps1)" -ForegroundColor Yellow
    Write-Host "  2. Select 'Run with PowerShell as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "[INFO] Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# Check if rule already exists
$existingRule = Get-NetFirewallRule -DisplayName "Node.js Server Port 3000" -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "[INFO] Firewall rule already exists" -ForegroundColor Yellow
    Write-Host "[INFO] Removing old rule..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName "Node.js Server Port 3000" -ErrorAction SilentlyContinue
}

# Add new firewall rule
Write-Host "[1/2] Adding Windows Firewall rule for port 3000..." -ForegroundColor Cyan
try {
    New-NetFirewallRule `
        -DisplayName "Node.js Server Port 3000" `
        -Description "Allow TrustConnect mobile app to connect to backend server" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 3000 `
        -Action Allow `
        -Profile Any `
        -Enabled True
    
    Write-Host "[SUCCESS] Firewall rule added!" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to add firewall rule: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "[2/2] Verifying firewall rule..." -ForegroundColor Cyan
$rule = Get-NetFirewallRule -DisplayName "Node.js Server Port 3000"
if ($rule) {
    Write-Host "[SUCCESS] Firewall rule is active!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Firewall rule not found after creation" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your phone can now connect to:" -ForegroundColor White
Write-Host "  http://10.80.246.216:3000/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Make sure:" -ForegroundColor Yellow
Write-Host "  1. Your phone is on the SAME WiFi as your laptop" -ForegroundColor Yellow
Write-Host "  2. Backend server is running (npm run dev)" -ForegroundColor Yellow
Write-Host "  3. Expo app is running on your phone" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
