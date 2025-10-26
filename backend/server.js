const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { handleGeminiRequest, handleStreamingGeminiRequest } = require('./secure-prompts');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Let frontend handle CSP
    crossOriginEmbedderPolicy: false
}));

app.use(compression());

// CORS configuration - Explicit setup for production
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [
        'https://kimatai-app.web.app',
        'https://kimatai-app.firebaseapp.com',
        'https://kimatai.com',
        'https://www.kimatai.com',
        'https://kimatai.co.uk',
        'https://www.kimatai.co.uk',
        process.env.FRONTEND_URL
    ].filter(Boolean)
    : [
        'http://localhost:3000', 
        'http://localhost:5000', // Python HTTP server
        'http://127.0.0.1:5000',
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'http://localhost:8001',
        'http://localhost:8002',
        'http://localhost:8003',
        'null', // for file:// protocol
        process.env.FRONTEND_URL
    ].filter(Boolean);

// CORS middleware with explicit preflight handling
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('❌ CORS blocked origin:', origin);
            console.log('✅ Allowed origins:', allowedOrigins);
            callback(null, false); // Reject but don't throw error
        }
    },
    credentials: true, // Enable credentials for production
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-JSON'],
    maxAge: 86400 // 24 hours
}));

// Body parsing middleware
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        // Verify JSON payload
        try {
            JSON.parse(buf);
        } catch (e) {
            throw new Error('Invalid JSON');
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: { 
        error: 'Too many requests from this IP. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.ip === '127.0.0.1' // Skip rate limiting for localhost in development
});

app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Explicit preflight handler for all API routes
app.options('/api/*', (req, res) => {
    console.log('✈️  Preflight request received for:', req.path);
    console.log('📍 Origin:', req.headers.origin);
    console.log('🔑 Access-Control-Request-Headers:', req.headers['access-control-request-headers']);
    
    // Explicitly set CORS headers for preflight
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400');
        console.log('✅ Preflight approved for:', origin);
    } else {
        console.log('❌ Preflight rejected for:', origin);
    }
    
    res.status(200).end();
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} from ${req.headers.origin || 'unknown origin'}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '2.0.0-secure',
        environment: process.env.NODE_ENV || 'development'
    });
});

// API status endpoint
app.get('/api/status', (req, res) => {
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    const hasTravelPayoutsId = !!process.env.TRAVELPAYOUTS_ID;
    
    res.json({
        status: 'ready',
        services: {
            gemini: hasGeminiKey ? 'configured' : 'missing_api_key',
            travelpayouts: hasTravelPayoutsId ? 'configured' : 'missing_id'
        },
        security: {
            rateLimit: 'enabled',
            cors: 'configured',
            helmet: 'enabled'
        }
    });
});

// Stripe checkout endpoint (secure server-side handling)
app.post('/api/create-checkout', async (req, res) => {
    try {
        const { userId, userEmail, plan } = req.body;
        
        // Validate request
        if (!userId || !userEmail || !plan) {
            return res.status(400).json({ 
                error: 'Missing required fields: userId, userEmail, plan' 
            });
        }
        
        // Return the configured Payment Link for Globetrotter Pro
        // In production, you'd create a dynamic Stripe Checkout Session here
        const paymentLink = process.env.STRIPE_PRO_PAYMENT_LINK || 'https://buy.stripe.com/test_your_globetrotter_pro_link_here';
        
        // Validate that Stripe is properly configured
        if (!paymentLink || paymentLink.includes('your_') || paymentLink.includes('_here')) {
            return res.status(503).json({ 
                error: 'Stripe checkout not configured. Please contact support.' 
            });
        }
        
        // Only support 'pro' plan since you only have Explorer (free) and Globetrotter Pro
        if (plan !== 'pro') {
            return res.status(400).json({ 
                error: 'Invalid plan. Only "pro" (Globetrotter Pro) plan is available for purchase.' 
            });
        }
        
        // Log the checkout request for analytics (don't log sensitive data)
        console.log(`Checkout requested - Plan: ${plan}, User authenticated: ${!!userId}`);
        
        res.json({ 
            checkoutUrl: paymentLink,
            plan: plan,
            message: 'Checkout session created successfully'
        });
        
    } catch (error) {
        console.error('Checkout creation error:', error);
        res.status(500).json({ 
            error: 'Failed to create checkout session' 
        });
    }
});

// SECURE AI endpoint - prompts handled server-side only
app.post('/api/gemini', async (req, res) => {
    // Check if streaming is requested
    if (req.body.stream) {
        return handleStreamingGeminiRequest(req, res);
    } else {
        return handleGeminiRequest(req, res);
    }
});

// NEW: Smart conversational chat endpoint
app.post('/api/chat', async (req, res) => {
    const { handleConversationalChat } = require('./secure-prompts');
    return handleConversationalChat(req, res);
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        availableEndpoints: ['/health', '/api/status', '/api/gemini', '/api/create-checkout']
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({ 
        error: 'Internal server error',
        ...(isDevelopment && { details: error.message })
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🔒 SECURE KimatAI Backend Server`);
    console.log(`📡 Running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ AI prompts are now protected server-side`);
    console.log('='.repeat(50));
    
    // Configuration validation
    const warnings = [];
    
    if (!process.env.GEMINI_API_KEY) {
        warnings.push('⚠️  GEMINI_API_KEY not configured');
    }
    if (!process.env.TRAVELPAYOUTS_ID) {
        warnings.push('⚠️  TRAVELPAYOUTS_ID not configured');
    }
    if (!process.env.SESSION_SECRET) {
        warnings.push('⚠️  SESSION_SECRET not configured');
    }
    
    if (warnings.length > 0) {
        console.log('\n🔧 Configuration Warnings:');
        warnings.forEach(warning => console.log(warning));
        console.log('\n💡 Update your .env file to resolve these warnings.\n');
    } else {
        console.log('✅ All environment variables configured correctly\n');
    }
});