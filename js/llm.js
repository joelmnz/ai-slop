import { aiSettings } from './settings.js';

async function callOpenAI(prompt, model = 'text-davinci-003', maxTokens = 150, textContext = '') {
    try {
        // Retrieve settings
        const settings = await aiSettings.getSettings();
        const apiKey = settings.openaiApiKey;
        const baseUrl = settings.openaiBaseUrl || 'https://api.openai.com/v1';

        if (!apiKey) {
            throw new Error('API key is missing. Please configure it in the settings.');
        }

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
        
        // Add OpenRouter specific headers if using OpenRouter
        if (baseUrl.includes('openrouter')) {
            headers['HTTP-Referer'] = 'https://joelmnz.github.io/ai-slop/';
            headers['X-Title'] = 'AI Slop';
        }

        // Determine if we need to use the chat or completions API format
        const isChat = model.includes('gpt') || baseUrl.includes('openrouter');
        const endpoint = isChat ? '/chat/completions' : '/completions';
        
        let requestBody;
        
        if (isChat) {
            // Prepare the message content
            let userContent = prompt;
            
            // If textContext is provided, include it in the messages
            if (textContext) {
                userContent = `${prompt}\n\nContext:\n${textContext}`;
            }
            
            requestBody = {
                model: model,
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: userContent }
                ],
                max_tokens: maxTokens
            };
        } else {
            // Legacy completions API format
            requestBody = {
                model: model,
                prompt: textContext ? `${prompt}\n\nContext:\n${textContext}` : prompt,
                max_tokens: maxTokens
            };
        }

        // Prepare API request
        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        // Handle response
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        // Handle different response formats
        if (isChat) {
            return data.choices[0]?.message?.content?.trim() || '';
        } else {
            return data.choices[0]?.text?.trim() || '';
        }
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw error;
    }
}

export { callOpenAI };
