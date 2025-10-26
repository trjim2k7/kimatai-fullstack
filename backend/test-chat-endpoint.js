// TEST SCRIPT FOR NEW /api/chat ENDPOINT
// Run this with: node test-chat-endpoint.js

const BACKEND_URL = 'http://localhost:3001';

async function testChatEndpoint(testName, messages, conversationHistory = []) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST: ${testName}`);
    console.log(`${'='.repeat(60)}`);
    console.log('Sending messages:', JSON.stringify(messages, null, 2));
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                conversationHistory
            })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ ERROR:', errorText);
            return null;
        }
        
        const data = await response.json();
        console.log('\n📦 Response data:', JSON.stringify(data, null, 2));
        
        // Try to parse the AI response
        try {
            const aiResponse = JSON.parse(data.response);
            console.log('\n✅ PARSED AI RESPONSE:');
            console.log('Type:', aiResponse.type);
            
            if (aiResponse.type === 'chat') {
                console.log('Message:', aiResponse.message);
            } else if (aiResponse.type === 'itinerary') {
                console.log('Title:', aiResponse.title);
                console.log('Days:', aiResponse.days?.length || 0);
            } else if (aiResponse.type === 'refinement') {
                console.log('Refinement:', aiResponse.message);
            }
            
            return aiResponse;
        } catch (parseError) {
            console.log('\n⚠️  Response is not JSON (plain text):', data.response);
            return { type: 'chat', message: data.response };
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return null;
    }
}

async function runAllTests() {
    console.log('\n🚀 TESTING NEW /api/chat ENDPOINT\n');
    
    // Test 1: General question
    await testChatEndpoint(
        'General Chat - Simple Question',
        [
            { role: 'user', content: 'What is the capital of France?' }
        ]
    );
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    // Test 2: Travel question (not itinerary)
    await testChatEndpoint(
        'General Chat - Travel Info',
        [
            { role: 'user', content: 'What is the best time to visit Japan?' }
        ]
    );
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Request full itinerary
    await testChatEndpoint(
        'Itinerary Generation',
        [
            { role: 'user', content: 'Plan a 3-day trip to Tokyo' }
        ]
    );
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4: Conversation with context
    const conversationHistory = [
        { role: 'user', content: 'Plan a 3-day trip to Tokyo' },
        { role: 'assistant', content: '{"type":"itinerary","title":"3-Day Tokyo Adventure","days":[...]}' }
    ];
    
    await testChatEndpoint(
        'Refinement with Context',
        [
            { role: 'user', content: 'Add more food recommendations' }
        ],
        conversationHistory
    );
    
    console.log('\n✅ ALL TESTS COMPLETED\n');
}

// Run tests
runAllTests().catch(console.error);
