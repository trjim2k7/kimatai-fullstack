#!/bin/bash

echo "🔄 Syncing KimatAI Full Stack..."

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo ""
    echo "📝 You have uncommitted changes:"
    git status --short
    
    read -p "Commit these changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter commit message: " message
        git add .
        git commit -m "$message"
        echo "✅ Changes committed"
    fi
fi

# Pull latest from remote
echo ""
echo "⬇️ Pulling latest changes from GitHub..."
git pull origin main

if [ $? -eq 0 ]; then
    echo "✅ Pull successful!"
else
    echo "❌ Pull failed - resolve conflicts manually"
    exit 1
fi

# Push if there are local commits
ahead=$(git rev-list --count origin/main..HEAD)
if [ $ahead -gt 0 ]; then
    echo ""
    echo "⬆️ Pushing $ahead local commit(s) to GitHub..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ Push successful!"
    else
        echo "❌ Push failed"
        exit 1
    fi
else
    echo ""
    echo "✅ Already up to date with remote"
fi

echo ""
echo "🎉 Sync complete!"
