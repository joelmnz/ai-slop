/**
 * Call the OpenAI API with the provided settings
 * @param {string} prompt - The prompt to send to the API
 * @param {string} model - The model to use
 * @param {number} maxTokens - Maximum tokens to generate
 * @param {Object} settings - Required settings object containing openaiApiKey and openaiBaseUrl
 * @returns {Promise<string>} - The API response text
 */
async function callOpenAI(prompt, model = 'deepseek/deepseek-r1:free', maxTokens = 8000, settings) {
    // Convert the prompt string to a messages array and call sendMessages
    const messages = [{ role: "user", content: prompt }];
    return sendMessages(messages, model, maxTokens, settings);
}

/**
 * Call the OpenAI API with an array of messages instead of a single prompt
 * @param {Array} messages - Array of message objects with role and content
 * @param {string} model - The model to use
 * @param {number} maxTokens - Maximum tokens to generate
 * @param {Object} settings - Required settings object containing openaiApiKey and openaiBaseUrl
 * @returns {Promise<string>} - The API response text
 */
async function sendMessages(messages, model = 'deepseek/deepseek-r1:free', maxTokens = 8000, settings) {
    try {
        // Validate that settings were provided
        if (!settings) {
            throw new Error('Settings object is required');
        }
        
        const apiKey = settings.openaiApiKey;
        const baseUrl = settings.openaiBaseUrl || 'https://api.openai.com/v1';

        if (!apiKey) {
            throw new Error('API key is missing. Please configure it in the settings.');
        }

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}` // Ensure key is trimmed
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
            requestBody = {
                model: model,
                messages: messages,
                max_tokens: maxTokens
            };
        } else {
            // For legacy completions API, combine messages into a single prompt
            const combinedPrompt = messages
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n\n');
                
            requestBody = {
                model: model,
                prompt: combinedPrompt,
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
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || response.statusText;
            console.error('API Response Error:', response.status, errorMessage, errorData);
            throw new Error(`API Error: ${errorMessage}`);
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

/**
 * Fetches available models from the specified API
 * @param {Object} settings - Required settings object containing openaiApiKey and openaiBaseUrl
 * @returns {Promise<Array>} - Array of available model objects
 */
async function getAvailableModels(settings) {
    try {
        // Validate that settings were provided
        if (!settings) {
            throw new Error('Settings object is required');
        }
        
        const apiKey = settings.openaiApiKey;
        const baseUrl = settings.openaiBaseUrl || 'https://api.openai.com/v1';

        if (!apiKey) {
            throw new Error('API key is missing. Please configure it in the settings.');
        }

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`
        };
        
        // Add OpenRouter specific headers if using OpenRouter
        if (baseUrl.includes('openrouter')) {
            headers['HTTP-Referer'] = 'https://joelmnz.github.io/ai-slop/';
            headers['X-Title'] = 'AI Slop';
        }

        // Different endpoints depending on the API
        let endpoint = '/models';
        
        // Fetch models from the API
        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'GET',
            headers: headers
        });

        // Handle response
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || response.statusText;
            console.error('API Response Error:', response.status, errorMessage, errorData);
            throw new Error(`API Error: ${errorMessage}`);
        }

        const data = await response.json();
        
        // Format is different between OpenAI and other providers
        let models = [];
        
        if (baseUrl.includes('openrouter')) {
            // OpenRouter format
            models = data.data || [];
        } else if (baseUrl.includes('openai')) {
            // OpenAI format
            models = data.data || [];
        } else {
            // Generic format - try to extract model IDs
            models = data.data || data.models || [];
        }
        
        // Return sorted list of model IDs
        return models
            .filter(model => !model.id.includes('deprecated') && !model.id.includes('-instruct'))
            .map(model => model.id)
            .sort();
    } catch (error) {
        console.error('Error fetching available models:', error);
        throw error;
    }
}

export { callOpenAI, sendMessages, getAvailableModels };
