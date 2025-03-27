import { aiSettings } from './settings.js';

async function callOpenAI(prompt, model = 'text-davinci-003', maxTokens = 150) {
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
            headers['HTTP-Referer'] = window.location.origin;
            headers['X-Title'] = 'AI Slop';
        }

        // Prepare API request
        const response = await fetch(`${baseUrl}/completions`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model,
                prompt,
                max_tokens: maxTokens
            })
        });

        // Handle response
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.text.trim();
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw error;
    }
}

export { callOpenAI };
