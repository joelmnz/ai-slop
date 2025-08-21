/**
 * Theme Manager for AI Slop
 * Handles dark/light theme switching and persistence
 */
class ThemeManager {
    constructor() {
        this.themeKey = 'ai_slop_theme';
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        const storedTheme = localStorage.getItem(this.themeKey);
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        let currentTheme = storedTheme;

        if (!currentTheme) {
            currentTheme = systemPrefersDark ? 'dark' : 'light';
        }

        this.setTheme(currentTheme);

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem(this.themeKey)) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem(this.themeKey, theme);
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.checked = theme === 'dark';
        }
    }

    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
}

/**
 * Settings Manager for AI Slop
 * Handles secure storage of API keys and other settings
 */

class SettingsManager {
    constructor() {
        this.settingsKey = 'ai_slop_settings';
        this.sessionKey = 'ai_slop_session_settings';
        this._cryptoKey = null;
        
        // Don't initialize immediately, wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this._initSettingsModal();
                this._bindEvents();
            });
        } else {
            // DOM is already loaded
            this._initSettingsModal();
            this._bindEvents();
        }
    }

    /**
     * Initialize the settings modal in the DOM
     */
    _initSettingsModal() {
        // Create modal if it doesn't exist
        if (!document.getElementById('settings-modal')) {
            const modalHtml = `
                <div id="settings-modal" class="settings-modal">
                    <div class="settings-modal-content">
                        <div class="settings-modal-header">
                            <h2>AI Settings</h2>
                            <span class="settings-close">&times;</span>
                        </div>
                        <div class="settings-modal-body">
                            <div class="settings-form">
                                <div class="settings-group">
                                    <label>Theme</label>
                                    <div class="theme-toggle-container">
                                        <i class="fas fa-sun"></i>
                                        <label class="theme-toggle-switch">
                                            <input type="checkbox" id="theme-toggle">
                                            <span class="theme-toggle-slider"></span>
                                        </label>
                                        <i class="fas fa-moon"></i>
                                    </div>
                                </div>
                                <div class="settings-group">
                                    <label for="openai-base-url">OpenAI Base URL:</label>
                                    <input type="text" id="openai-base-url" placeholder="https://api.openai.com/v1" />
                                    <p class="settings-help">Change this to use <a href="#" class="service-link" data-url="https://openrouter.ai/api/v1">OpenRouter</a>, <a href="#" class="service-link" data-url="http://localhost:11434">Ollama</a>, or other API-compatible services</p>
                                </div>
                                <div class="settings-group">
                                    <label for="openai-api-key">OpenAI API Key:</label>
                                    <div class="api-key-container">
                                        <input type="password" id="openai-api-key" placeholder="sk-..." />
                                        <button id="toggle-api-key-visibility" type="button">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </div>
                                    <p class="settings-help">
                                        <span class="security-warning"><i class="fas fa-shield-alt"></i> Security Notice:</span> 
                                        Browser storage has inherent security limitations.
                                    </p>
                                </div>
                                <div class="settings-group">
                                    <label>Storage Options:</label>
                                    <div class="storage-options">
                                        <label class="radio-option">
                                            <input type="radio" name="storage-type" id="storage-session" value="session"> 
                                            <span>Session storage only (cleared when browser closes)</span>
                                        </label>
                                        <label class="radio-option">
                                            <input type="radio" name="storage-type" id="storage-local" value="local"> 
                                            <span>Local storage (persists between sessions)</span>
                                        </label>
                                    </div>
                                    <p class="settings-help">Session storage is more secure but requires re-entering your API key each time you reopen your browser.</p>
                                </div>
                            </div>
                        </div>
                        <div class="settings-modal-footer">
                            <button id="save-settings" class="save-settings-btn">Save Settings</button>
                            <button id="clear-settings" class="clear-settings-btn">Clear Settings</button>
                        </div>
                    </div>
                </div>
            `;
            
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHtml;
            document.body.appendChild(modalContainer.firstElementChild);
        }
    }

    /**
     * Bind event listeners to the settings modal elements
     */
    _bindEvents() {
        // Modal open/close
        const settingsButton = document.getElementById('settings-button');
        if (settingsButton) {
            settingsButton.addEventListener('click', () => this.openSettings());
        }
        
        const closeBtn = document.querySelector('.settings-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSettings());
        }
        
        // Close on click outside modal
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('settings-modal');
            if (event.target === modal) {
                this.closeSettings();
            }
        });
        
        // Toggle API key visibility
        const toggleVisibilityBtn = document.getElementById('toggle-api-key-visibility');
        if (toggleVisibilityBtn) {
            toggleVisibilityBtn.addEventListener('click', (e) => {
                const apiKeyInput = document.getElementById('openai-api-key');
                const icon = e.currentTarget.querySelector('i');
                
                if (apiKeyInput.type === 'password') {
                    apiKeyInput.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    apiKeyInput.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        }
        
        // Service link click handlers
        document.querySelectorAll('.service-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const url = e.target.getAttribute('data-url');
                if (url) {
                    document.getElementById('openai-base-url').value = url;
                }
            });
        });
        
        // Save and clear buttons
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }
        
        const clearBtn = document.getElementById('clear-settings');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSettings());
        }

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('change', () => {
                if (window.themeManager) {
                    window.themeManager.toggleTheme();
                }
            });
        }
    }

    /**
     * Generate a secure encryption key using Web Crypto API
     * @returns {Promise<CryptoKey>} The generated crypto key
     */
    async _generateEncryptionKey() {
        try {
            return await window.crypto.subtle.generateKey(
                {
                    name: "AES-GCM",
                    length: 256
                },
                true, // extractable
                ["encrypt", "decrypt"]
            );
        } catch (e) {
            console.error("Error generating encryption key:", e);
            throw e;
        }
    }

    /**
     * Encrypt the API key using Web Crypto API
     * @param {string} apiKey - The API key to encrypt
     * @returns {Promise<Object>} - Object containing the encrypted key and iv
     */
    async _encryptApiKey(apiKey) {
        if (!apiKey) return '';
        
        try {
            // Generate a new initialization vector for each encryption
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            
            // Generate encryption key if we don't have one
            if (!this._cryptoKey) {
                this._cryptoKey = await this._generateEncryptionKey();
            }
            
            // Export the key for storage
            const exportedKey = await window.crypto.subtle.exportKey("raw", this._cryptoKey);
            const exportedKeyBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array(exportedKey)));
            
            // Convert API key string to bytes
            const encoder = new TextEncoder();
            const data = encoder.encode(apiKey);
            
            // Encrypt the data
            const encryptedData = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                this._cryptoKey,
                data
            );
            
            // Combine IV and encrypted data for storage
            const encryptedArray = new Uint8Array(iv.length + encryptedData.byteLength);
            encryptedArray.set(iv);
            encryptedArray.set(new Uint8Array(encryptedData), iv.length);
            
            // Convert to Base64 for storage
            return {
                encryptedKey: btoa(String.fromCharCode.apply(null, encryptedArray)),
                keyMaterial: exportedKeyBase64
            };
        } catch (e) {
            console.error('Encryption error:', e);
            return { encryptedKey: '', keyMaterial: '' };
        }
    }

    /**
     * Decrypt the API key using Web Crypto API
     * @param {string} encryptedKey - Base64 encoded encrypted data
     * @param {string} keyMaterial - Base64 encoded key material
     * @returns {Promise<string>} - Decrypted API key
     */
    async _decryptApiKey(encryptedKey, keyMaterial) {
        if (!encryptedKey || !keyMaterial) return '';
        
        try {
            // Import the key if we don't have one
            if (!this._cryptoKey && keyMaterial) {
                const keyData = Uint8Array.from(atob(keyMaterial), c => c.charCodeAt(0));
                this._cryptoKey = await window.crypto.subtle.importKey(
                    "raw",
                    keyData,
                    { name: "AES-GCM" },
                    true,
                    ["encrypt", "decrypt"]
                );
            }
            
            // Convert Base64 to array
            const encryptedBytes = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
            
            // Extract IV (first 12 bytes)
            const iv = encryptedBytes.slice(0, 12);
            const encryptedData = encryptedBytes.slice(12);
            
            // Decrypt the data
            const decryptedData = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                this._cryptoKey,
                encryptedData
            );
            
            // Convert bytes to string
            const decoder = new TextDecoder();
            return decoder.decode(decryptedData);
        } catch (e) {
            console.error('Decryption error:', e);
            return '';
        }
    }

    /**
     * Open the settings modal and populate with current settings
     */
    async openSettings() {
        const settings = await this.getSettings();
        const modal = document.getElementById('settings-modal');
        
        // Populate form fields
        document.getElementById('openai-base-url').value = settings.openaiBaseUrl || '';
        document.getElementById('openai-api-key').value = settings.openaiApiKey || '';
        
        // Set storage type radio button
        const storageType = settings.storageType || 'session';
        document.getElementById(`storage-${storageType}`).checked = true;
        
        // Show modal
        modal.style.display = 'block';
    }

    /**
     * Close the settings modal
     */
    closeSettings() {
        const modal = document.getElementById('settings-modal');
        modal.style.display = 'none';
    }

    /**
     * Save the settings to storage
     */
    async saveSettings() {
        const baseUrl = document.getElementById('openai-base-url').value.trim();
        const apiKey = document.getElementById('openai-api-key').value.trim();
        const storageType = document.querySelector('input[name="storage-type"]:checked')?.value || 'session';
        
        try {
            // Encrypt the API key
            const { encryptedKey, keyMaterial } = await this._encryptApiKey(apiKey);
            
            const settings = {
                openaiBaseUrl: baseUrl,
                encryptedApiKey: encryptedKey,
                keyMaterial: keyMaterial,
                storageType: storageType
            };
            
            // Store in the appropriate storage
            if (storageType === 'session') {
                sessionStorage.setItem(this.sessionKey, JSON.stringify(settings));
                // Clear from localStorage if it was there
                localStorage.removeItem(this.settingsKey);
            } else {
                localStorage.setItem(this.settingsKey, JSON.stringify(settings));
                // Clear from sessionStorage
                sessionStorage.removeItem(this.sessionKey);
            }
            
            this.closeSettings();
            this._showNotification('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this._showNotification('Error saving settings: ' + error.message, 'error');
        }
    }

    /**
     * Clear all saved settings
     */
    clearSettings() {
        if (confirm('Are you sure you want to clear all settings?')) {
            localStorage.removeItem(this.settingsKey);
            sessionStorage.removeItem(this.sessionKey);
            this._cryptoKey = null;
            
            document.getElementById('openai-base-url').value = '';
            document.getElementById('openai-api-key').value = '';
            document.getElementById('storage-session').checked = true;
            
            this._showNotification('Settings cleared', 'info');
        }
    }

    /**
     * Get the current settings
     * @returns {Promise<Object>} The settings object with decrypted values
     */
    async getSettings() {
        // Try to get from sessionStorage first, then localStorage
        const sessionData = sessionStorage.getItem(this.sessionKey);
        const localData = localStorage.getItem(this.settingsKey);
        
        let settings = {};
        
        if (sessionData) {
            try {
                settings = JSON.parse(sessionData);
                settings.storageType = 'session';
            } catch (e) {
                console.error('Error parsing session settings:', e);
            }
        } else if (localData) {
            try {
                settings = JSON.parse(localData);
                settings.storageType = 'local';
            } catch (e) {
                console.error('Error parsing local settings:', e);
            }
        }
        
        // If we have encrypted API key and key material, try to decrypt
        if (settings.encryptedApiKey && settings.keyMaterial) {
            try {
                const decryptedKey = await this._decryptApiKey(settings.encryptedApiKey, settings.keyMaterial);
                return {
                    ...settings,
                    openaiApiKey: decryptedKey
                };
            } catch (e) {
                console.error('Error decrypting API key:', e);
            }
        }
        
        return settings;
    }

    /**
     * Display a notification to the user
     */
    _showNotification(message, type = 'info') {
        // Check if notification container exists
        let notifContainer = document.getElementById('notification-container');
        if (!notifContainer) {
            notifContainer = document.createElement('div');
            notifContainer.id = 'notification-container';
            document.body.appendChild(notifContainer);
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notifContainer.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notifContainer.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize managers when DOM is ready
let settingsManager;
let themeManager;

function initializeManagers() {
    themeManager = new ThemeManager();
    settingsManager = new SettingsManager();

    // Expose to global scope
    window.aiSettings = {
        openSettings: () => settingsManager.openSettings(),
        getSettings: () => settingsManager.getSettings()
    };
    window.themeManager = themeManager;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeManagers);
} else {
    initializeManagers();
}
