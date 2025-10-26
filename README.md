# KimatAI Full Stack - Travel Planning App

Complete full-stack application with AI-powered travel itinerary generation.

## Project Structure

```
kimatai-fullstack/
├── backend/          # Node.js Express API with Gemini AI
├── frontend/         # Single-page HTML application
├── .devcontainer/    # GitHub Codespaces configuration
└── README.md
```

## 🚀 Quick Start in Codespaces

1. Click **Code** → **Codespaces** → **Create codespace on main**
2. Wait for the container to build and dependencies to install
3. Copy `.env.example` to `.env` and add your API keys:
   ```bash
   cp backend/.env.example backend/.env
   ```
4. Edit `backend/.env` and add your `GEMINI_API_KEY`
5. Start the servers:
   ```bash
   npm run dev
   ```

## 🖥️ Local Development

### Prerequisites
- Node.js 18+ 
- Python 3.x (for frontend server)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/kimatai-fullstack.git
   cd kimatai-fullstack
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   node server.js
   ```

3. **Frontend Setup** (in a new terminal)
   ```bash
   cd frontend
   python -m http.server 5000
   ```

4. **Open your browser**
   - Frontend: http://localhost:5000
   - Backend API: http://localhost:3001

## 🔑 Environment Variables

Create `backend/.env` with:

```env
GEMINI_API_KEY=your_api_key_here
TRAVELPAYOUTS_ID=your_id_here
NODE_ENV=development
SESSION_SECRET=your_secret_here
FRONTEND_URL=http://localhost:5000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📦 NPM Scripts

```bash
npm run dev          # Start both frontend and backend
npm run backend      # Start backend only
npm run frontend     # Start frontend only
```

## 🧪 Testing

```bash
cd backend
node test-chat-endpoint.js
```

## 🚢 Deployment

- **Backend**: Deploy to Render.com (connects to GitHub automatically)
- **Frontend**: Deploy to Firebase Hosting

See [DEPLOYMENT_GUIDE.md](backend/documentation/DEPLOYMENT_GUIDE.md) for details.

## 📝 Features

- ✨ AI-powered travel itinerary generation
- 🗺️ Interactive maps with Google Maps integration
- 💬 Conversational chat interface
- 📱 Responsive design
- 🔐 Firebase authentication
- ☁️ Cloud storage for saved itineraries
- 💳 Stripe payment integration for Pro features

## 🛠️ Tech Stack

**Frontend:**
- HTML/CSS/JavaScript
- Tailwind CSS
- Firebase (Auth + Firestore)
- Google Maps API
- Leaflet.js

**Backend:**
- Node.js + Express
- Google Gemini AI
- Security: Helmet, CORS, Rate Limiting
- Environment: dotenv

## 📚 Documentation

See `backend/SETUP-GUIDE.md` and `backend/documentation/` for detailed documentation.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
