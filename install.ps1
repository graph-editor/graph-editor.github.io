# CP Graph Editor — 1-Click Installer for Windows
# Usage in PowerShell:
#   irm https://raw.githubusercontent.com/graph-editor/graph-editor.github.io/master/install.ps1 | iex

$ErrorActionPreference = "Stop"
$Repo = "graph-editor/graph-editor.github.io"
$Tag = "v2.1.0"
$Url = "https://github.com/$Repo/releases/download/$Tag/CP.Graph.Editor_2.1.0_x64-setup.exe"
$TempInstaller = "$env:TEMP\CP_Graph_Editor_Setup.exe"

Write-Host "🚀 Downloading CP Graph Editor ($Tag) 1-Click Setup..." -ForegroundColor Cyan
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $Url -OutFile $TempInstaller -UseBasicParsing

Write-Host "📦 Installing CP Graph Editor silently..." -ForegroundColor Cyan
Start-Process -FilePath $TempInstaller -ArgumentList "/S" -Wait

Write-Host "✅ Installation complete! Launching application..." -ForegroundColor Green
$ExePath = "$env:LOCALAPPDATA\Programs\CP Graph Editor\CP Graph Editor.exe"
if (Test-Path $ExePath) {
    Start-Process -FilePath $ExePath
} else {
    $AltPath = "$env:ProgramFiles\CP Graph Editor\CP Graph Editor.exe"
    if (Test-Path $AltPath) {
        Start-Process -FilePath $AltPath
    }
}
Remove-Item -Path $TempInstaller -Force -ErrorAction SilentlyContinue
