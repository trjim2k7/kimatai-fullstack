# Quick Deploy Script for KimatAI Backend
param(
    [string]$message = "Update backend"
)

Write-Host "🚀 Deploying KimatAI Backend..." -ForegroundColor Cyan
Write-Host "📝 Commit message: $message" -ForegroundColor Yellow

# Navigate to backend directory
Set-Location backend-files

# Check for changes
$status = git status --porcelain
if ($status) {
    Write-Host "📦 Changes detected:" -ForegroundColor Yellow
    Write-Host $status
    
    # Add, commit, and push
    git add .
    git commit -m $message
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Pushed to GitHub successfully!" -ForegroundColor Green
        Write-Host "⏳ Render.com will auto-deploy in 2-5 minutes..." -ForegroundColor Yellow
        Write-Host "🌐 Check status: https://dashboard.render.com" -ForegroundColor Cyan
        
        # Open Render dashboard
        Start-Process "https://dashboard.render.com"
    } else {
        Write-Host "❌ Push failed!" -ForegroundColor Red
    }
} else {
    Write-Host "ℹ️ No changes to deploy" -ForegroundColor Yellow
}

# Return to parent directory
Set-Location ..
