#!/bin/bash

echo "🚀 Starting KimatAI Full Stack Development Environment..."

# Check if .env exists
if [ ! -f backend/.env ]; then
    echo "⚠️  No .env file found. Copying .env.example..."
    cp backend/.env.example backend/.env
    echo "📝 Please edit backend/.env and add your GEMINI_API_KEY"
    echo "   You can edit it in VS Code: code backend/.env"
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Start backend in background
echo "🔧 Starting backend server on port 3001..."
cd backend && node server.js &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "🌐 Starting frontend server on port 5000..."
cd ../frontend && python3 -m http.server 5000 &
FRONTEND_PID=$!

echo ""
echo "✅ Development servers are running!"
echo "   Frontend: http://localhost:5000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
