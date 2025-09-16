#!/usr/bin/env pwsh
# PocketBase Tesla Data Setup Script

Write-Host "🚀 Tesla PocketBase Setup" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Navigate to pocketbase directory
Set-Location -Path "C:\ANFA\pocketbase"

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Run the setup
Write-Host "`n🔧 Running Tesla data setup..." -ForegroundColor Yellow
npx tsx setup-tesla-data.ts

Write-Host "`n✨ Setup process initiated!" -ForegroundColor Green
Write-Host "The PocketBase server should be running at http://127.0.0.1:8090" -ForegroundColor Cyan
