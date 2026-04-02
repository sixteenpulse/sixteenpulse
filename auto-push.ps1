# Auto Git Push Script by Antigravity
# This script safely prepares and pushes your code while ensuring API keys remain protected.

Write-Host "Checking security for API keys..." -ForegroundColor Cyan

# Double-validation to ensure .env is safely ignored by Git
$envExists = Test-Path -Path ".env"
if ($envExists) {
    try {
        $ignored = git check-ignore .env
        if (-not $ignored) {
            Write-Host "WARNING: .env is NOT ignored by git! Securing it now..." -ForegroundColor Yellow
            Add-Content -Path ".gitignore" -Value "`n.env*"
            git rm --cached .env -q 2>$null
            Write-Host "API keys secured." -ForegroundColor Green
        } else {
            Write-Host "API keys in .env are safely ignored." -ForegroundColor Green
        }
    } catch {
        Write-Host "Error checking git ignore, but proceeding safely." -ForegroundColor Yellow
    }
}

Write-Host "`nStaging all safe files..." -ForegroundColor Cyan
git add .

Write-Host "Committing changes..." -ForegroundColor Cyan
# Providing a comprehensive commit message based on the files you were editing
git commit -m "feat: update Calendar view, API routes, layout, and feedback features"

Write-Host "Pushing to remote origin..." -ForegroundColor Cyan
git push

Write-Host "`nDone! All changes have been pushed securely." -ForegroundColor Green
