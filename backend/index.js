require('dotenv').config({ path: 'c:/Users/trjim/Documents/Website/backend/.env' });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://generativelanguage.googleapis.com"]
        }
    }
}));

// CORS configuration
const allowedOrigins = (process.env.FRONTEND_URL || 'http://127.0.0.1:5500').split(',').concat('null');

const corsOptions = {
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            var msg = 'The CORS policy for this site does not ' +
                      'allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));

// Validate environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TRAVELPAYOUTS_ID = process.env.TRAVELPAYOUTS_ID || 'default_id';

if (!GEMINI_API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY in environment variables');
    process.exit(1);
}

console.log('🚀 Secure KimatAI Backend Server starting...');
console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('🛡️  Security middleware loaded');
console.log(`🌍 CORS enabled for: ${corsOptions.origin}`);

// SECURE PROMPT MANAGEMENT - SERVER-SIDE ONLY
function buildSecurePrompt(userInput, metadata = {}) {
    const { hasSpecificDates = false, isMultiCity = false } = metadata;
    
    let multiCityInstructions = '';
    if (isMultiCity) {
        multiCityInstructions = `
**MULTI-CITY TRIP INSTRUCTIONS:**
- Structure the itinerary by city sections with clear transitions
- Include travel days between cities with transportation details (flight times, train durations, bus routes)
- Add specific transportation recommendations between cities (which airline, train service, or bus company)
- Include estimated travel times and costs for budget planning
- Add airport/station pickup suggestions and transportation to city centers
- Recommend optimal arrival/departure times to maximize sightseeing
- Include check-in/check-out times for hotels and logistics planning
- Add city-specific tips for each destination
- Structure days to account for travel fatigue (lighter schedule on arrival days)
        `;
    }

    return `You are KimatAI, a friendly and expert travel planner. Your response MUST be a JSON object with no additional text or markdown formatting.

Create a detailed, personalized itinerary with SPECIFIC venue recommendations. Include:

**SPECIFIC REQUIREMENTS:**
- Real hotel names with brief descriptions and why they fit the traveler's style
- Actual restaurant names with cuisine types and specialties
- Specific museum/attraction names with highlights and tips
- Cafes and snack spots with local favorites
- Icons for each activity type (use these exactly): 🏨 hotels, 🍽️ restaurants, ☕ cafes, 🏛️ museums, 🎨 attractions, 🚶 walking, 🛍️ shopping, 🌳 parks, 🎭 entertainment, 💡 tips, ✈️ travel
- Daily insider tips and practical advice
- Transportation suggestions between locations
- Mark all specific venues (hotels, restaurants, museums, cafes, bars, galleries, etc.) with **bold** formatting and wrap them in [VENUE]...[/VENUE] tags
- Keep descriptions flowing naturally in single paragraphs
- Use SPECIFIC TIMES for all activities (e.g., "9:00 AM", "1:30 PM", "6:00 PM") instead of relative times like "Morning" or "Afternoon"
${hasSpecificDates ? '- Use specific dates provided by user in day titles (format: "Day 1 - 16 Oct 2025 - Title")' : ''}
${multiCityInstructions}

**VENUE TAGGING WITH GOOGLE MAPS LINKS:**
"Visit the magnificent [VENUE]**Acropolis Museum**|https://maps.google.com/?q=Acropolis+Museum+Athens[/VENUE] to see ancient artifacts, then have lunch at [VENUE]**Dionysos Restaurant**|https://maps.google.com/?q=Dionysos+Restaurant+Athens[/VENUE] with stunning Acropolis views."

**VENUE FORMAT:** [VENUE]**VenueName**|GoogleMapsURL[/VENUE]

**JSON STRUCTURE:**
{
  "title": "Descriptive trip title including destination and duration",
  "days": [
    {
      "title": "${hasSpecificDates ? 'Day 1 - [DATE] - Descriptive Day Title' : 'Day 1: Descriptive Day Title'}",
      "activities": [
        {
          "time": "9:00 AM",
          "description": "🏛️ Start your day at [VENUE]**Louvre Museum**|https://maps.google.com/?q=Louvre+Museum+Paris[/VENUE] to see the Mona Lisa and Egyptian collection. Arrive early to avoid crowds. The museum is huge, so focus on specific wings."
        },
        {
          "time": "12:30 PM",
          "description": "🍽️ Lunch at [VENUE]**Le Comptoir du Relais**|https://maps.google.com/?q=Le+Comptoir+du+Relais+Paris[/VENUE] in Saint-Germain, famous for their traditional French bistro fare and excellent wine selection. Try their duck confit."
        }
      ],
      "dailyTip": "💡 **Insider Tip:** Most museums are free for EU residents under 26. Buy a Navigo weekly metro pass for unlimited transport within zones 1-2."
    }
  ],
  "bookingSuggestions": "# Booking Suggestions\\n\\n- **Flights:** [Find the best flight deals to [Destination] on Skyscanner](https://www.skyscanner.com/transport/flights/to/[IATA_CODE]/?associateid=AFF_TRA_00001_${TRAVELPAYOUTS_ID})\\n- **Hotels:** [Book your stay in [Destination] with Booking.com](https://www.booking.com/searchresults.html?ss=[Destination]&aid=2316286&agent_id=${TRAVELPAYOUTS_ID})\\n- **Tours & Activities:** [Explore tours and activities in [Destination] with GetYourGuide](https://www.getyourguide.com/search?q=[Destination]&partner_id=${TRAVELPAYOUTS_ID})"
}

**CRITICAL GUIDELELINES:**
- Your most important instruction is to follow the venue tagging format precisely. Every venue MUST be tagged like this: [VENUE]**VenueName**|GoogleMapsURL[/VENUE]. Do not deviate from this format.
- Use REAL venue names (never use generic placeholders like "local restaurant")
- For EVERY venue, provide REAL Google Maps URLs using your knowledge of actual venues
- Tag ALL specific venues using format: [VENUE]**VenueName**|GoogleMapsURL[/VENUE]
- Google Maps URLs should use the format: https://maps.google.com/?q=VenueName+City
- Do NOT tag general areas, districts, neighborhoods, or geographical features
- NEVER send a partial or incomplete tag. Each [VENUE] tag must be fully formed and contain both the name and the URL.
- Only tag businesses and specific attractions that have real Google Maps locations
- Keep activity descriptions as flowing paragraphs, not broken into separate lines
- Include at least 3-4 specific venues per day with realistic timing
- Add practical details like opening hours, signature dishes, or visit tips
- Use the specified icons consistently
- ALL activities must have specific hour-based times (9:00 AM, 2:30 PM, etc.) - NO relative times like "Morning" or "Afternoon"
- Schedule activities with realistic timing - allow 2-3 hours for major attractions, 1-2 hours for meals, 30-60 minutes for cafes
- Replace [Destination] and [IATA_CODE] with actual values
- Do not include any instruction text in your response

User's request: "${userInput}"`;
}

// Input validation and sanitization
function validateAndSanitizeUserInput(input) {
    if (!input || typeof input !== 'string') {
        throw new Error('Invalid input: must be a non-empty string');
    }
    
    const trimmed = input.trim();
    
    if (trimmed.length === 0) {
        throw new Error('Invalid input: cannot be empty');
    }
    
    if (trimmed.length > 10000) {
        throw new Error('Invalid input: too long (max 10,000 characters)');
    }
    
    // Remove potentially harmful characters but preserve normal punctuation
    const sanitized = trimmed
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control characters
        .replace(/[<>]/g, '') // Remove angle brackets to prevent HTML injection
        .substring(0, 10000); // Ensure length limit
    
    return sanitized;
}

// Extract metadata from user input
function extractMetadata(userInput) {
    const dateRegex = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4}))/gi;
    const foundDates = userInput.match(dateRegex) || [];
    const hasSpecificDates = foundDates.length > 0;
    
    // Detect multi-city trips
    const multiCityIndicators = [
        /\b(multi.?city|cities)\b/i,
        /\bvisiting:?\s*\w+.*,.*\w+/i,
        /\bthen\s+\w+\s*,?\s*\w+/i,
        /\band\s+\w+\s*\(\d+\s*days?\)/i
    ];
    
    const isMultiCity = multiCityIndicators.some(pattern => pattern.test(userInput));
    
    return {
        hasSpecificDates,
        isMultiCity,
        foundDates,
        wordCount: userInput.split(/\s+/).length
    };
}

// Function to find and parse a JSON object from a string that might be wrapped in markdown
function extractJsonFromResponse(text) {
    if (!text) return null;

    // Look for markdown-formatted JSON block
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        try {
            return JSON.parse(match[1]);
        } catch (error) {
            console.error("Failed to parse JSON from markdown block:", error);
            // Fall through to try parsing the whole string
        }
    }

    // Fallback for non-markdown JSON: find the first '{' and the last '}'
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
        console.error("Could not find a valid JSON block in the response.");
        return null;
    }

    const jsonString = text.substring(jsonStart, jsonEnd + 1);

    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Failed to parse extracted JSON string:", error);
        return null;
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// Legacy endpoint for backward compatibility
app.post('/api/gemini', async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Handle both old format (prompt) and new format (userInput)
        const userInput = req.body.prompt || req.body.userInput;
        
        if (!userInput) {
            return res.status(400).json({ error: 'Invalid input: userInput is required' });
        }
        
        // Sanitize and validate input
        const sanitizedInput = validateAndSanitizeUserInput(userInput);
        const metadata = extractMetadata(sanitizedInput);
        
        // Build secure prompt server-side (never exposed to client)
        const fullPrompt = buildSecurePrompt(sanitizedInput, metadata);
        
        console.log(`🤖 Generating itinerary for: "${sanitizedInput.substring(0, 100)}${sanitizedInput.length > 100 ? '...' : ''}"`);
        
        // Call Gemini API with the secure, hidden prompt
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;
        
        const payload = {
            contents: [{ 
                role: 'user', 
                parts: [{ text: fullPrompt }] 
            }],
            generationConfig: { 
                responseMimeType: 'application/json',
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192
            }
        };        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error:', data);
            throw new Error(`Upstream AI service error: ${response.status}`);
        }

        // Extract the raw text and then parse the JSON from it
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const jsonData = extractJsonFromResponse(rawText);

        if (!jsonData) {
            throw new Error('Could not extract valid JSON from AI response.');
        }

        const processingTime = Date.now() - startTime;
        console.log(`✅ Itinerary generated successfully in ${processingTime}ms`);

        // Return the parsed JSON data, ensuring it's in the original expected structure
        res.json({ ...data, candidates: [{ ...data.candidates[0], content: { parts: [{ text: JSON.stringify(jsonData) }] } }] });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ AI request failed after ${processingTime}ms:`, error.message);
        
        // Handle specific error types
        if (error.message.includes('Invalid input')) {
            return res.status(400).json({ error: error.message, code: 'INVALID_INPUT' });
        }
        
        // Generic error response (don't leak internal details)
        res.status(500).json({ 
            error: 'AI service temporarily unavailable. Please try again.',
            code: 'INTERNAL_ERROR'
        });
    }
});

// New secure endpoint for future use
app.post('/api/generate-itinerary', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { userInput, requestType } = req.body;
        
        if (!userInput) {
            return res.status(400).json({ error: 'Invalid input: userInput is required' });
        }
        
        // Sanitize and validate input
        const sanitizedInput = validateAndSanitizeUserInput(userInput);
        const metadata = extractMetadata(sanitizedInput);
        
        // Build secure prompt server-side (never exposed to client)
        const fullPrompt = buildSecurePrompt(sanitizedInput, metadata);
        
        console.log(`🤖 Generating itinerary for: "${sanitizedInput.substring(0, 100)}${sanitizedInput.length > 100 ? '...' : ''}"`);
        
        // Call Gemini API with full prompt
        const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: fullPrompt }]
                }],
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            })
        });        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json();
            console.error('Gemini API Error:', errorData);
            throw new Error(`Upstream AI service error: ${geminiResponse.status}`);
        }
        
        const data = await geminiResponse.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        
        if (!responseText) {
            console.error('Empty response text from Gemini API');
            return res.status(500).json({ 
                error: 'AI service returned an empty response.',
                code: 'EMPTY_RESPONSE'
            });
        }

        // Extract the clean JSON object from the raw text
        const jsonData = extractJsonFromResponse(responseText);

        if (!jsonData) {
            console.error('Could not extract valid JSON from AI response text.');
            return res.status(500).json({ 
                error: 'AI service returned a malformed response.',
                code: 'MALFORMED_RESPONSE'
            });
        }
        
        const processingTime = Date.now() - startTime;
        console.log(`✅ Itinerary generated successfully in ${processingTime}ms`);

        // Return the clean JSON object for the frontend to use directly
        res.json({ itinerary: jsonData });
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ AI request failed after ${processingTime}ms:`, error.message);
        
        // Handle specific error types
        if (error.message.includes('Invalid input')) {
            return res.status(400).json({ error: error.message, code: 'INVALID_INPUT' });
        }
        
        // Generic error response
        res.status(500).json({ 
            error: 'AI service temporarily unavailable. Please try again.',
            code: 'INTERNAL_ERROR'
        });
    }
});

// Chat endpoint for conversational interface with smart response formatting
app.post('/api/chat', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { messages, conversationHistory } = req.body;
        
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Invalid input: messages array is required' });
        }
        
        // Get the last user message
        const lastUserMessage = messages[messages.length - 1];
        const userInput = lastUserMessage.content || lastUserMessage.text || '';
        
        if (!userInput) {
            return res.status(400).json({ error: 'Invalid input: message content is required' });
        }
        
        console.log(`💬 Chat request: "${userInput.substring(0, 100)}${userInput.length > 100 ? '...' : ''}"`);
        
        // Determine if this is an itinerary request or general chat
        const isItineraryRequest = /plan|trip|itinerary|visit|travel to|going to|vacation|holiday/i.test(userInput);
        
        let systemPrompt = '';
        let responseFormat = 'text';
        
        if (isItineraryRequest) {
            // Use the full itinerary prompt
            const metadata = extractMetadata(userInput);
            systemPrompt = buildSecurePrompt(userInput, metadata);
            responseFormat = 'json';
        } else {
            // Simple conversational prompt
            systemPrompt = `You are KimatAI, a friendly travel planning assistant. Respond naturally to the user's question or comment. Keep responses concise and helpful. If they seem to be asking about travel planning, gently guide them to provide destination, dates, budget, and interests.

User message: ${userInput}

Respond with a JSON object in this format:
{
  "type": "chat",
  "message": "your friendly response here"
}`;
            responseFormat = 'json';
        }
        
        // Call Gemini API
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;
        
        const payload = {
            contents: [{ 
                role: 'user', 
                parts: [{ text: systemPrompt }] 
            }],
            generationConfig: { 
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
                ...(responseFormat === 'json' ? { responseMimeType: 'application/json' } : {})
            }
        };
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error:', data);
            throw new Error(`Upstream AI service error: ${response.status}`);
        }

        let responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        
        if (!responseText) {
            throw new Error('Empty response from AI service');
        }

        // Clean up any markdown code blocks
        responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();

        const processingTime = Date.now() - startTime;
        console.log(`✅ Chat response generated in ${processingTime}ms`);

        // Return the response text (should be JSON string)
        res.json({ response: responseText, text: responseText });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ Chat request failed after ${processingTime}ms:`, error.message);
        
        res.status(500).json({ 
            error: 'Chat service temporarily unavailable. Please try again.',
            code: 'INTERNAL_ERROR'
        });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`✅ Secure KimatAI Backend Server running on port ${PORT}`);
    console.log(`📊 Rate limiting: ${limiter.max} requests per ${limiter.windowMs}ms`);
    console.log(`🔒 Prompt security: ENABLED - All AI prompts are server-side protected`);
});
