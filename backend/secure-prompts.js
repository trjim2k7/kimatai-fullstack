// SECURE AI PROMPT MANAGEMENT - SERVER-SIDE ONLY
// This file should NEVER be accessible to the client browser

const TRAVELPAYOUTS_ID = process.env.TRAVELPAYOUTS_ID || '669212';

// Master AI prompt template - PROTECTED SERVER-SIDE
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

    return `Create a travel itinerary in JSON format.

Requirements:
- Real venue names with specific times (9:00 AM, not "Morning")  
- Venue tagging: [VENUE]**VenueName**|https://maps.google.com/?q=VenueName+City[/VENUE]
- Informative descriptions with practical details (what to expect, tips, highlights)
- Include estimated costs, booking tips, and insider knowledge when relevant
- Add context about why each activity is recommended (historical significance, unique features, local favorites)
- CRITICAL: When user requests a single country, ALL destinations MUST be within that country only. Do NOT suggest neighboring countries or other countries unless the user explicitly requests a multi-country itinerary.
- Use the MOST FAMOUS and CORRECT geographic location for the requested destination
- Always assume the primary/famous destination unless explicitly stated otherwise (e.g., "Paris" = Paris, France not Paris, Texas)
- Pay careful attention to the country/region context in the user's request
${hasSpecificDates ? '- Use provided dates in day titles' : ''}
${multiCityInstructions}

Return ONLY the JSON object, no markdown.

JSON Structure:
{
  "title": "Trip title", 
  "days": [
    {
      "title": "Day 1: Location",
      "activities": [
        {
          "time": "9:00 AM",
          "description": "Visit [VENUE]**Museum Name**|https://maps.google.com/?q=Museum+Name+City[/VENUE]. Include what makes this special, what to see, estimated visit time (e.g., 2-3 hours), and any practical tips (arrive early to beat crowds, skip-the-line tickets available, etc.)."
        }
      ],
      "insiderTip": "💡 A genuine local insider tip that tourists wouldn't normally know - specific timing to avoid crowds, hidden viewpoints, secret menu items, lesser-known entrances, local customs, money-saving tricks, or neighborhood secrets. Make it actionable and specific to THIS day's location."
    }
  ],
  "bookingSuggestions": "Generate SPECIFIC booking links with the actual destination name from the itinerary. Use [LINK] tags for clickable links.\\n\\n### Flights\\nSearch flights to [DESTINATION]: [LINK]Skyscanner|https://www.skyscanner.net/?associateid=${TRAVELPAYOUTS_ID}[/LINK] or [LINK]Kiwi.com|https://www.kiwi.com/deep?affilid=${TRAVELPAYOUTS_ID}[/LINK]\\n\\n### Hotels\\nBook hotels in [DESTINATION]: [LINK]Booking.com|https://www.booking.com/searchresults.html?aid=${TRAVELPAYOUTS_ID}&ss=[DESTINATION][/LINK] or [LINK]Hotels.com|https://www.hotels.com/search.do?affcid=${TRAVELPAYOUTS_ID}&destination=[DESTINATION][/LINK]\\n\\n### Activities\\nFind tours in [DESTINATION]: [LINK]GetYourGuide|https://www.getyourguide.com/s/?partner_id=${TRAVELPAYOUTS_ID}&q=[DESTINATION][/LINK] or [LINK]Viator|https://www.viator.com/searchResults/all?pid=${TRAVELPAYOUTS_ID}&text=[DESTINATION][/LINK]\\n\\nIMPORTANT: Replace [DESTINATION] with the PRIMARY city/country from this itinerary (e.g., 'Athens', 'Rome', 'Paris', 'Tokyo'). Use the main destination city name."
}

CRITICAL REQUIREMENTS:
- Include 4-6 activities per day minimum (more for longer days, fewer for travel days)
- EVERY activity MUST have a specific time (9:00 AM, 2:30 PM, etc.) - NO missing times
- Each activity description should be 2-3 sentences with actionable information
- Include practical details: estimated duration, cost range if relevant, best time to visit, booking requirements
- Add insider tips: hidden gems, local favorites, time-saving tricks, what to avoid
- For meals, suggest specific restaurant types or local dishes to try
- Ensure the last day has complete time entries for ALL activities
- ALWAYS include the "bookingSuggestions" field with DESTINATION-SPECIFIC links (replace [DESTINATION] with actual city name like "Athens", "Rome", "Paris")
- GEOGRAPHIC ACCURACY: If user mentions "Greece", use Greek destinations (Athens, Greece; Santorini; Mykonos, etc.) NOT Athens, USA or other countries
- MANDATORY: Every day MUST have an "insiderTip" field with a genuine local secret - specific restaurants locals love, hidden viewpoints, best times to avoid tourist crowds, money-saving tricks (e.g., "Buy metro tickets at tobacco shops to skip ticket office lines"), cultural customs, secret shortcuts, or neighborhood gems tourists miss. Make tips SPECIFIC and ACTIONABLE.

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
        wordCount: userInput.split(/\s+/).length,
        containsUrls: /https?:\/\//.test(userInput)
    };
}

// Updated API endpoint handler
async function handleGeminiRequest(req, res) {
    const startTime = Date.now();
    
    try {
        // Input validation
        const { userInput, requestType } = req.body;
        
        if (!userInput) {
            return res.status(400).json({ 
                error: 'Missing required field: userInput',
                code: 'MISSING_INPUT'
            });
        }
        
        if (requestType && requestType !== 'itinerary_generation') {
            return res.status(400).json({ 
                error: 'Invalid request type. Only "itinerary_generation" is supported.',
                code: 'INVALID_REQUEST_TYPE'
            });
        }
        
        // Sanitize and validate input
        const sanitizedInput = validateAndSanitizeUserInput(userInput);
        const metadata = extractMetadata(sanitizedInput);
        
        // Rate limiting check (additional to middleware)
        const requestsThisMinute = req.rateLimit?.current || 0;
        if (requestsThisMinute > 50) { // More restrictive for AI requests
            return res.status(429).json({
                error: 'Too many AI requests. Please wait before trying again.',
                retryAfter: 60,
                code: 'RATE_LIMITED'
            });
        }
        
        // Build secure prompt server-side (never exposed to client)
        const fullPrompt = buildSecurePrompt(sanitizedInput, metadata);
        
        // Log the full prompt for debugging
        console.log('📝 Full prompt being sent to Gemini:');
        console.log('=' .repeat(60));
        console.log(fullPrompt);
        console.log('=' .repeat(60));
        
        // Verify Gemini API key is configured
        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY not configured');
            return res.status(500).json({ 
                error: 'AI service not properly configured',
                code: 'SERVICE_UNAVAILABLE'
            });
        }
        
        // Call Gemini API with full prompt
        console.log(`🤖 Generating itinerary for: "${sanitizedInput.substring(0, 100)}${sanitizedInput.length > 100 ? '...' : ''}"`);
        
        // Check available models first
        console.log('🔍 Checking available models...');
        try {
            const listResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
                headers: {
                    'x-goog-api-key': process.env.GEMINI_API_KEY
                }
            });
            
            if (listResponse.ok) {
                const models = await listResponse.json();
                const availableModels = models.models?.map(m => m.name).filter(name => 
                    name.includes('flash') || name.includes('pro')
                ) || [];
                console.log('📋 Available models:', availableModels.join(', '));
            }
        } catch (error) {
            console.log('⚠️ Could not list models:', error.message);
        }
        
        // Try multiple model names - use only confirmed available models from the API
        const modelNames = [
            'models/gemini-2.0-flash',       // Reliable and working (12.4s response time)
            'models/gemini-2.5-flash',       // Sometimes faster but timing out lately
            'models/gemini-flash-latest',    // Available latest
            'models/gemini-2.5-pro'          // Available pro version
        ];
        
        let geminiResponse = null;
        let lastError = null;
        
        for (const modelName of modelNames) {
            let timeoutId;
            try {
                const modelStartTime = Date.now();
                console.log(`🔄 Trying model: ${modelName}`);
                const url = modelName.startsWith('models/') 
                    ? `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`
                    : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
                    
                // Add timeout for faster failure if model is slow
                const controller = new AbortController();
                timeoutId = setTimeout(() => {
                    console.log(`⏱️ Model ${modelName} timed out after 120 seconds`);
                    controller.abort();
                }, 120000); // 120 second timeout (2 minutes) for long itineraries
                
                geminiResponse = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': process.env.GEMINI_API_KEY
                    },
                    signal: controller.signal,
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: fullPrompt }]
                        }],
                        generationConfig: {
                            temperature: 0.5,        // Slightly higher for more creative, detailed responses
                            topK: 30,               // More choices for varied recommendations
                            topP: 0.85,             // Good balance of variety and coherence
                            maxOutputTokens: 32768, // Increased for longer itineraries (14+ days)
                            candidateCount: 1       // Only generate one candidate for speed
                        }
                    })
                });
                
                if (timeoutId) clearTimeout(timeoutId); // Clear timeout on success
                
                if (geminiResponse.ok) {
                    const modelTime = Date.now() - modelStartTime;
                    console.log(`✅ Successfully using model: ${modelName} (${modelTime}ms)`);
                    break;
                } else {
                    const errorText = await geminiResponse.text();
                    console.log(`❌ Model ${modelName} failed: ${geminiResponse.status} - ${errorText}`);
                    lastError = errorText;
                    geminiResponse = null;
                }
            } catch (error) {
                if (timeoutId) clearTimeout(timeoutId); // Clear timeout on error
                console.log(`❌ Model ${modelName} error: ${error.message}`);
                lastError = error.message;
                geminiResponse = null;
            }
        }
        
        if (!geminiResponse) {
            throw new Error(`All Gemini models failed. Last error: ${lastError}`);
        }
        
        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
            
            if (geminiResponse.status === 429) {
                return res.status(429).json({
                    error: 'AI service is temporarily overloaded. Please try again in a few moments.',
                    retryAfter: 30,
                    code: 'AI_RATE_LIMITED'
                });
            }
            
            if (geminiResponse.status === 403) {
                return res.status(500).json({
                    error: 'AI service authentication failed',
                    code: 'AI_AUTH_ERROR'
                });
            }
            
            throw new Error(`Gemini API error: ${geminiResponse.status}`);
        }
        
        const data = await geminiResponse.json();
        console.log('📄 Full Gemini response data:', JSON.stringify(data, null, 2));
        
        let responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        
        // Clean up markdown code blocks if present
        if (responseText.startsWith('```json')) {
            console.log('🧹 Removing markdown code block wrapper...');
            responseText = responseText.replace(/```json\s*/, '').replace(/\s*```$/, '');
        } else if (responseText.startsWith('```')) {
            console.log('🧹 Removing generic code block wrapper...');
            responseText = responseText.replace(/```\s*/, '').replace(/\s*```$/, '');
        }
        
        if (!responseText) {
            console.error('❌ Empty response from Gemini API');
            console.log('🔍 Response structure:', {
                candidates: data?.candidates?.length || 0,
                firstCandidate: data?.candidates?.[0] || null,
                finishReason: data?.candidates?.[0]?.finishReason || 'unknown',
                safetyRatings: data?.candidates?.[0]?.safetyRatings || []
            });
            
            // Check for specific finish reasons
            if (data?.candidates?.[0]?.finishReason === 'SAFETY') {
                return res.status(400).json({
                    error: 'Content was filtered by safety systems. Please try a different request.',
                    code: 'SAFETY_FILTERED'
                });
            }
            
            if (data?.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
                console.log('⚠️ Response truncated due to token limit, trying to extract partial content...');
                // Try to get partial content if available
                const partialText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (partialText.length > 100) {
                    console.log('📝 Using partial response:', partialText.substring(0, 200) + '...');
                    // Try to return the partial response and let frontend handle it
                    return res.json({ 
                        response: partialText,
                        metadata: {
                            processingTime: Date.now() - startTime,
                            wordCount: metadata.wordCount,
                            hasSpecificDates: metadata.hasSpecificDates,
                            isMultiCity: metadata.isMultiCity,
                            truncated: true
                        }
                    });
                }
                return res.status(500).json({
                    error: 'Response too long for AI service. Please try a shorter or more specific request.',
                    code: 'MAX_TOKENS_EXCEEDED'
                });
            }
            
            return res.status(500).json({
                error: 'AI service returned an empty response',
                code: 'EMPTY_RESPONSE'
            });
        }
        
        // Log successful generation
        const processingTime = Date.now() - startTime;
        console.log(`✅ Itinerary generated successfully in ${processingTime}ms`);
        
        // Return only the AI response (no prompt exposure)
        res.json({ 
            response: responseText,
            metadata: {
                processingTime,
                wordCount: metadata.wordCount,
                hasSpecificDates: metadata.hasSpecificDates,
                isMultiCity: metadata.isMultiCity
            }
        });
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ AI request failed after ${processingTime}ms:`, error.message);
        
        // Handle specific error types
        if (error.message.includes('Invalid input')) {
            return res.status(400).json({ 
                error: error.message,
                code: 'INVALID_INPUT'
            });
        }
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return res.status(503).json({
                error: 'Unable to connect to AI service. Please try again later.',
                code: 'SERVICE_UNAVAILABLE'
            });
        }
        
        // Generic error response (don't leak internal details)
        res.status(500).json({ 
            error: 'AI service temporarily unavailable. Please try again.',
            code: 'INTERNAL_ERROR'
        });
    }
}

// Streaming version of the Gemini request handler
async function handleStreamingGeminiRequest(req, res) {
    const startTime = Date.now();
    
    try {
        // Input validation (same as regular handler)
        const { userInput, requestType } = req.body;
        
        if (!userInput) {
            return res.status(400).json({ 
                error: 'Missing required field: userInput',
                code: 'MISSING_INPUT'
            });
        }
        
        // Sanitize and validate input
        const sanitizedInput = validateAndSanitizeUserInput(userInput);
        const metadata = extractMetadata(sanitizedInput);
        
        // Build secure prompt server-side
        const fullPrompt = buildSecurePrompt(sanitizedInput, metadata);
        
        // Verify Gemini API key is configured
        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY not configured');
            return res.status(500).json({ 
                error: 'AI service not properly configured',
                code: 'SERVICE_UNAVAILABLE'
            });
        }
        
        console.log(`🤖 Generating streaming itinerary for: "${sanitizedInput.substring(0, 100)}${sanitizedInput.length > 100 ? '...' : ''}"`);
        
        // Set up streaming response headers
        res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
            'Cache-Control': 'no-cache'
        });
        
        // Try to get streaming response from Gemini
        const modelNames = [
            'models/gemini-2.5-flash',
            'models/gemini-2.0-flash',
            'models/gemini-flash-latest'
        ];
        
        let success = false;
        
        for (const modelName of modelNames) {
            try {
                console.log(`🔄 Trying streaming model: ${modelName}`);
                const url = modelName.startsWith('models/') 
                    ? `https://generativelanguage.googleapis.com/v1beta/${modelName}:streamGenerateContent`
                    : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent`;
                    
                const geminiResponse = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': process.env.GEMINI_API_KEY
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: fullPrompt }]
                        }],
                        generationConfig: {
                            temperature: 0.5,        // Slightly higher for more detailed responses
                            topK: 30,
                            topP: 0.85,
                            maxOutputTokens: 32768, // Increased for longer itineraries (14+ days)
                            candidateCount: 1
                        }
                    })
                });
                
                if (!geminiResponse.ok) {
                    console.log(`❌ Streaming model ${modelName} failed: ${geminiResponse.status}`);
                    continue;
                }
                
                console.log(`✅ Successfully using streaming model: ${modelName}`);
                
                // Read the streaming response
                const reader = geminiResponse.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    
                    // Process complete JSON objects from the buffer
                    let newlineIndex;
                    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                        const line = buffer.slice(0, newlineIndex).trim();
                        buffer = buffer.slice(newlineIndex + 1);
                        
                        if (line && !line.startsWith('data: [DONE]')) {
                            try {
                                // Parse the streaming JSON response
                                let jsonData;
                                if (line.startsWith('data: ')) {
                                    jsonData = JSON.parse(line.slice(6));
                                } else {
                                    jsonData = JSON.parse(line);
                                }
                                
                                // Extract text from the response
                                const textChunk = jsonData?.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (textChunk) {
                                    // Stream the chunk to the client
                                    res.write(textChunk);
                                }
                            } catch (parseError) {
                                // Ignore parsing errors for malformed chunks
                                console.log('Skipping malformed chunk:', line.substring(0, 50));
                            }
                        }
                    }
                }
                
                success = true;
                break;
                
            } catch (error) {
                console.log(`❌ Streaming model ${modelName} error: ${error.message}`);
                continue;
            }
        }
        
        if (!success) {
            // Fallback to regular non-streaming response
            console.log('🔄 Falling back to non-streaming response...');
            return handleGeminiRequest(req, res);
        }
        
        // End the streaming response
        res.end();
        
        const processingTime = Date.now() - startTime;
        console.log(`✅ Streaming itinerary completed in ${processingTime}ms`);
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ Streaming AI request failed after ${processingTime}ms:`, error.message);
        
        // If headers already sent, we can't send JSON error
        if (res.headersSent) {
            res.end();
        } else {
            res.status(500).json({ 
                error: 'AI service temporarily unavailable. Please try again.',
                code: 'STREAMING_ERROR'
            });
        }
    }
}

// NEW: Smart conversational chat handler
async function handleConversationalChat(req, res) {
    const startTime = Date.now();
    
    try {
        const { messages, conversationHistory } = req.body;
        
        if (!messages || messages.length === 0) {
            return res.status(400).json({ 
                error: 'Missing messages array',
                code: 'MISSING_MESSAGES'
            });
        }
        
        const latestMessage = messages[messages.length - 1].content;
        
        // Build conversation context
        let conversationContext = '';
        if (conversationHistory && conversationHistory.length > 0) {
            conversationContext = conversationHistory.slice(-6).map(msg => 
                `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
            ).join('\n');
        }
        
        // Smart system prompt that handles everything
        const systemPrompt = `You are KimatAI, an intelligent travel planning assistant with these capabilities:

**Core Abilities:**
1. **General Conversation** - Answer questions about travel, culture, geography, weather, etc.
2. **Itinerary Planning** - Create detailed day-by-day travel itineraries when requested
3. **Itinerary Refinement** - Modify existing plans based on user feedback

**Current Conversation Context:**
${conversationContext || 'This is the start of a new conversation'}

**User's Latest Message:**
"${latestMessage}"

**Response Guidelines:**

IF the user is requesting a FULL ITINERARY (keywords: "plan", "itinerary", "X days in", "trip to"):
- Respond with a JSON object in this exact format:
{
  "type": "itinerary",
  "title": "Trip title",
  "days": [
    {
      "title": "Day 1: Location",
      "activities": [
        {
          "time": "9:00 AM",
          "description": "Visit [VENUE]**Venue Name**|https://maps.google.com/?q=Venue+Name+City[/VENUE]. Brief description."
        }
      ],
      "insiderTip": "💡 A genuine local insider tip - hidden spots, best timing, money-saving tricks, or local secrets tourists miss."
    }
  ],
  "bookingSuggestions": "### Flights\\nSearch flights to [DESTINATION]: [LINK]Skyscanner|https://www.skyscanner.net/?associateid=${TRAVELPAYOUTS_ID}[/LINK]\\n\\n### Hotels\\nBook hotels in [DESTINATION]: [LINK]Booking.com|https://www.booking.com/searchresults.html?aid=${TRAVELPAYOUTS_ID}&ss=[DESTINATION][/LINK]\\n\\n### Activities\\nFind tours in [DESTINATION]: [LINK]GetYourGuide|https://www.getyourguide.com/s/?partner_id=${TRAVELPAYOUTS_ID}&q=[DESTINATION][/LINK]\\n\\nReplace [DESTINATION] with the main city name from the itinerary."
}

IF the user wants to REFINE an existing itinerary (context shows they already have a plan):
- Respond with: { "type": "refinement", "message": "Your conversational update here with specific recommendations" }

IF it's a GENERAL QUESTION or CONVERSATION:
- Respond with: { "type": "chat", "message": "Your helpful, friendly response here" }

**Important:**
- Always respond in JSON format with a "type" field
- Be concise and helpful
- For itineraries, use real venue names with [VENUE] tags
- For chat, use friendly Markdown formatting
- Remember conversation context for natural dialogue`;

        // Call Gemini API
        const modelNames = [
            'gemini-2.0-flash-exp',
            'gemini-exp-1206',
            'models/gemini-flash-latest'
        ];
        
        let geminiResponse = null;
        
        for (const modelName of modelNames) {
            try {
                const url = modelName.startsWith('models/') 
                    ? `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`
                    : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
                
                geminiResponse = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': process.env.GEMINI_API_KEY
                    },
                    signal: controller.signal,
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: systemPrompt }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 8192,
                            candidateCount: 1
                        }
                    })
                });
                
                clearTimeout(timeoutId);
                
                if (geminiResponse.ok) {
                    console.log(`✅ Conversational chat using model: ${modelName}`);
                    break;
                }
            } catch (error) {
                console.log(`❌ Model ${modelName} failed:`, error.message);
                continue;
            }
        }
        
        if (!geminiResponse || !geminiResponse.ok) {
            throw new Error('All AI models failed');
        }
        
        const data = await geminiResponse.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        console.log(`✅ Conversational chat completed in ${Date.now() - startTime}ms`);
        
        res.json({
            response: responseText,
            processingTime: Date.now() - startTime,
            model: 'gemini'
        });
        
    } catch (error) {
        console.error('❌ Conversational chat error:', error.message);
        res.status(500).json({ 
            error: 'Chat service temporarily unavailable',
            code: 'CHAT_ERROR'
        });
    }
}

module.exports = {
    handleGeminiRequest,
    handleStreamingGeminiRequest,
    handleConversationalChat,
    buildSecurePrompt,
    validateAndSanitizeUserInput,
    extractMetadata
};