# Git auto-push script for truyen_chu project
# Usage: powershell -File scripts\git-push.ps1 "commit message"
param([string]$Message = "chore: auto-push")

$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "📁 Project root: $projectRoot"
Set-Location $projectRoot

$status = git status --short
if (-not $status) {
  Write-Host "✅ Nothing to commit, working tree clean."
  exit 0
}

Write-Host "📝 Changes:"
git status --short

git add -A
git commit -m $Message
git push

Write-Host "🚀 Pushed to remote!"
