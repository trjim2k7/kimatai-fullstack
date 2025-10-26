# Quick sync script for KimatAI development

Write-Host "🔄 Syncing KimatAI Full Stack..." -ForegroundColor Cyan

# Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "`n📝 You have uncommitted changes:" -ForegroundColor Yellow
    git status --short
    
    $commit = Read-Host "`nCommit these changes? (y/n)"
    if ($commit -eq 'y') {
        $message = Read-Host "Enter commit message"
        git add .
        git commit -m "$message"
        Write-Host "✅ Changes committed" -ForegroundColor Green
    }
}

# Pull latest from remote
Write-Host "`n⬇️ Pulling latest changes from GitHub..." -ForegroundColor Cyan
git pull origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Pull successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Pull failed - resolve conflicts manually" -ForegroundColor Red
    exit 1
}

# Push if there are local commits
$ahead = git rev-list --count origin/main..HEAD
if ($ahead -gt 0) {
    Write-Host "`n⬆️ Pushing $ahead local commit(s) to GitHub..." -ForegroundColor Cyan
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Push successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ Push failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n✅ Already up to date with remote" -ForegroundColor Green
}

Write-Host "`n🎉 Sync complete!" -ForegroundColor Green
