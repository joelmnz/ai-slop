# AI Slop - Copilot Instructions

## Project Overview
A collection of AI-generated utility tools in vanilla HTML/CSS/JavaScript. Each tool is a standalone web app accessible via a central directory (`index.html`). The project embraces AI-driven development with minimal dependencies.

## Architecture Pattern

### Tool Structure
Each tool follows this self-contained pattern:
```
tool-name/
├── index.html          # Complete standalone page
├── styles.css          # Tool-specific styles  
├── script.js           # Main logic with dynamic imports
└── README.md           # Brief description
```

### Shared Resources
- `/js/llm.js` - Unified LLM API client (OpenAI/OpenRouter/Ollama compatible)
- `/js/settings.js` - Global settings modal with encrypted localStorage  
- `/js/model-selector.js` - Reusable model dropdown component
- `/css/settings.css` - Shared modal and settings styles

## Key Patterns

### Dynamic Module Imports
All tools use dynamic imports with graceful fallbacks:
```javascript
let sendMessages;
try {
    const module = await import('../js/llm.js');
    sendMessages = module.sendMessages;
} catch (error) {
    console.error('Error importing llm.js:', error);
    sendMessages = async () => { throw new Error('LLM module not loaded'); };
}
```

### LLM Integration
- Use `sendMessages(messages, model, maxTokens, settings)` for chat completions
- Always pass the `settings` object from SettingsManager
- Handle multiple API providers (OpenAI, OpenRouter, Ollama) transparently
- Default model: `deepseek/deepseek-r1:free` (OpenRouter)

### Settings Management
- Global settings accessible via gear icon in header
- Encrypted storage in localStorage using SettingsManager class
- Settings include: `openaiApiKey`, `openaiBaseUrl`, optional session-only storage
- Import SettingsManager: `const settingsManager = new SettingsManager();`

### Dark Theme Only
- CSS variables in `:root` define dark theme colors
- `--dark-bg`, `--dark-text`, `--dark-border`, `--dark-accent`, `--dark-highlight`
- No light mode implementation (by design)

## Development Workflow

### Local Server
```bash
python3 -m http.server 8000
```

### Adding New Tools
1. Create `tool-name/` directory with standard structure
2. Add entry to main `index.html` project list with FontAwesome icon
3. Import shared modules using dynamic imports pattern
4. Follow dark theme CSS variable conventions
5. Include settings integration if using LLM APIs

### File Operations
Tools use `browser-fs-access` for save/load via Skypack CDN:
```javascript
const browserFs = await import('https://cdn.skypack.dev/browser-fs-access');
```

## Tool-Specific Notes

### Chart.js Integration (wage-vs-inflation)
- Include Chart.js via CDN: `https://cdn.jsdelivr.net/npm/chart.js`
- Use `Chart.getContext('2d')` pattern for canvas setup

### Model Selection Component
- Import `ModelSelector` from `../js/model-selector.js`
- Provides consistent model dropdown across LLM tools
- Automatically populates with available models from current API endpoint

### Error Handling
- Use try/catch for all dynamic imports
- Provide meaningful fallback functions when modules fail to load
- Show user-friendly error messages, not technical details

## File Conventions
- All JavaScript uses ES6+ modules and async/await
- CSS uses CSS custom properties extensively
- HTML includes proper meta viewport and charset
- FontAwesome icons via CDN for consistent iconography
