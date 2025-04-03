document.addEventListener('DOMContentLoaded', async () => {
    // Try to dynamically import the getAvailableModels function from llm.js
    let getAvailableModels;
    let sendMessages;
    try {
        const module = await import('../js/llm.js');
        getAvailableModels = module.getAvailableModels;
        sendMessages = module.sendMessages;
    } catch (error) {
        console.error('Error importing llm.js:', error);
        // Create fallback if import fails
        getAvailableModels = async (settings) => {
            throw new Error('LLM API module could not be loaded. Please check the console for details.');
        };
        sendMessages = async (messages, model, maxTokens, settings) => {
            throw new Error('LLM API module could not be loaded. Please check the console for details.');
        };
    }

    // Import browser-fs-access for file saving and loading
    let fileSave;
    let fileOpen;
    try {
        // Use the ESM version from Skypack CDN instead
        const browserFs = await import('https://cdn.skypack.dev/browser-fs-access');
        fileSave = browserFs.fileSave;
        fileOpen = browserFs.fileOpen;
    } catch (error) {
        console.error('Error importing browser-fs-access:', error);
        fileSave = null; // Will use fallback save method
        fileOpen = null; // Will use fallback load method
    }

    // Import ModelSelector
    let ModelSelector;
    try {
        const module = await import('../js/model-selector.js');
        ModelSelector = module.default;
    } catch (error) {
        console.error('Error importing model-selector.js:', error);
        // Will use fallback if import fails
    }

    // --- DOM References ---
    const newBtn = document.getElementById('newBtn');
    const addColumnBtn = document.getElementById('addColumnBtn');
    const saveBtn = document.getElementById('saveBtn');
    const toggleMarkdownBtn = document.getElementById('toggleMarkdownBtn');
    const loadBtn = document.getElementById('loadBtn');
    const loadFile = document.getElementById('loadFile');
    const columnsContainer = document.getElementById('comparisonColumns');
    const comparisonTitleInput = document.getElementById('comparisonTitle');
    const systemPromptTextarea = document.getElementById('systemPrompt');
    let systemPromptMarkdown = document.getElementById('systemPromptMarkdown');
    const userPromptTextarea = document.getElementById('userPrompt');
    let userPromptMarkdown = document.getElementById('userPromptMarkdown');
    const toastContainer = document.getElementById('toastContainer');
    const metaToggle = document.getElementById('metaToggle');
    const comparisonMeta = document.querySelector('.comparison-meta');
    const settingsButton = document.getElementById('settings-button');

    // Ensure highlight.js is initialized
    if (typeof hljs !== 'undefined') {
        hljs.highlightAll();
    }

    // --- State ---
    let columnCounter = 0; // Initialize counter
    let markdownViewActive = false; // Track markdown view state
    let availableModels = []; // Will store objects with {id, name}
    let lastUsedFilename = null; // Track last used filename for saving
    
    // --- API Settings Cache ---
    let apiSettings = null;
    
    // Shared ModelSelector instance
    let modelSelector = null;
    
    // Initialize ModelSelector if available
    if (ModelSelector) {
        modelSelector = new ModelSelector({
            container: document.body,
            onModelSelect: (model) => {
                // This will be called when a model is selected
                if (modelSelector.currentInput) {
                    modelSelector.currentInput.dispatchEvent(new Event('input'));
                }
            }
        });
    }
    
    // Retrieve API settings once and cache them
    async function getApiSettings() {
        if (apiSettings !== null) {
            return apiSettings;
        }
        
        if (typeof window.aiSettings === 'undefined') {
            throw new Error('Settings manager is not available. Please refresh the page and try again.');
        }
        
        apiSettings = await window.aiSettings.getSettings();
        
        if (!apiSettings.openaiApiKey && !apiSettings.openrouterApiKey) {
            throw new Error('API key is missing. Please configure it in the settings.');
        }
        
        return apiSettings;
    }

    // --- Fetch available models ---
    async function fetchAvailableModels() {
        try {
            if (typeof window.aiSettings === 'undefined') {
                throw new Error('Settings manager is not available');
            }
            
            const settings = await getApiSettings();
            availableModels = await getAvailableModels(settings);
            
            // Update the model selector with the available models
            if (modelSelector) {
                modelSelector.setModels(availableModels);
            }
            
            return availableModels;
        } catch (error) {
            console.error('Error fetching available models:', error);
            setStatus(`Failed to load model list: ${error.message}`, 'error', 5000);
            return [];
        }
    }
    
    // Show model selector popup function
    function showModelSelector(modelInput) {
        if (modelSelector) {
            // Use the shared ModelSelector component
            modelSelector.show(modelInput);
            
            // If models are not loaded yet, fetch them
            if (availableModels.length === 0) {
                modelSelector.showLoading('Loading models...');
                fetchAvailableModels().then(() => {
                    modelSelector.updateModelsList(modelInput.value.toLowerCase());
                });
            }
        } else {
            // Fallback for when ModelSelector is not available
            setStatus('Model selector component is not available', 'error', 3000);
        }
    }

    // --- Configure marked options ---
    marked.setOptions({
        highlight: function(code, lang) {
            if (typeof hljs === 'undefined') {
                return code; // Fallback if hljs is not available
            }
            
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
    });

    // --- Utility Functions ---
    function setStatus(message, type = 'info', duration = 3000) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Add appropriate icon based on type
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Add close button functionality
        const closeButton = toast.querySelector('.toast-close');
        closeButton.addEventListener('click', () => {
            toast.classList.add('hiding');
            setTimeout(() => {
                if (toast.parentNode === toastContainer) {
                    toastContainer.removeChild(toast);
                }
            }, 300); // Match with CSS transition duration
        });
        
        // Show toast with animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.add('hiding');
                setTimeout(() => {
                    if (toast.parentNode === toastContainer) {
                        toastContainer.removeChild(toast);
                    }
                }, 300); // Match with CSS transition duration
            }, duration);
        }
    }

    // Toggle Markdown View Function
    function toggleMarkdownView() {
        markdownViewActive = !markdownViewActive;
        
        // Helper function to safely highlight code
        const safeHighlight = (element) => {
            if (typeof hljs !== 'undefined') {
                hljs.highlightElement(element);
            }
        };
        
        // Handle column responses
        const columns = columnsContainer.querySelectorAll('.column');
        columns.forEach(column => {
            const textarea = column.querySelector('.llm-response-textarea');
            let markdownView = column.querySelector('.markdown-view');
            
            // Create markdown view div if it doesn't exist
            if (!markdownView) {
                markdownView = document.createElement('div');
                markdownView.classList.add('markdown-view');
                
                // Insert markdown view after textarea
                textarea.insertAdjacentElement('afterend', markdownView);
            }
            
            if (markdownViewActive) {
                // Render markdown
                markdownView.innerHTML = marked.parse(textarea.value);
                
                // Highlight code blocks
                markdownView.querySelectorAll('pre code').forEach(safeHighlight);
                
                // Show markdown view, hide textarea
                textarea.style.display = 'none';
                markdownView.style.display = 'block';
            } else {
                // Show textarea, hide markdown view
                textarea.style.display = 'block';
                markdownView.style.display = 'none';
            }
        });
        
        // Handle both system and user prompts in markdown view
        if (markdownViewActive) {
            // System prompt markdown
            if (!systemPromptMarkdown) {
                systemPromptMarkdown = document.getElementById('systemPromptMarkdown');
            }
            
            if (systemPromptMarkdown) {
                systemPromptMarkdown.innerHTML = marked.parse(systemPromptTextarea.value || '');
                systemPromptMarkdown.querySelectorAll('pre code').forEach(safeHighlight);
                systemPromptTextarea.style.display = 'none';
                systemPromptMarkdown.style.display = 'block';
            }
            
            // User prompt markdown
            if (!userPromptMarkdown) {
                userPromptMarkdown = document.getElementById('userPromptMarkdown');
            }
            
            if (userPromptMarkdown) {
                userPromptMarkdown.innerHTML = marked.parse(userPromptTextarea.value || '');
                userPromptMarkdown.querySelectorAll('pre code').forEach(safeHighlight);
                userPromptTextarea.style.display = 'none';
                userPromptMarkdown.style.display = 'block';
            }
        } else {
            // Show textareas, hide markdown views
            systemPromptTextarea.style.display = 'block';
            if (systemPromptMarkdown) {
                systemPromptMarkdown.style.display = 'none';
            }
            
            userPromptTextarea.style.display = 'block';
            if (userPromptMarkdown) {
                userPromptMarkdown.style.display = 'none';
            }
        }
        
        // Update button text and icon
        if (markdownViewActive) {
            toggleMarkdownBtn.innerHTML = '<i class="fas fa-font"></i> Show Raw Text';
        } else {
            toggleMarkdownBtn.innerHTML = '<i class="fas fa-code"></i> Toggle Markdown';
        }
        
        setStatus(markdownViewActive ? 'Showing rendered markdown' : 'Showing raw text', 'info');
    }

    // --- Template System ---
    const templates = {
        column: (id, data = null) => ({
            type: 'div',
            classes: ['column'],
            children: [
                {
                    type: 'label',
                    classes: ['model-name-label'],
                    attributes: { for: `modelName${id}` },
                    text: 'Model Name:'
                },
                {
                    type: 'div',
                    classes: ['model-input-group'],
                    children: [
                        {
                            type: 'input',
                            classes: ['model-name-input'],
                            attributes: {
                                type: 'text',
                                id: `modelName${id}`,
                                placeholder: 'Model Name',
                                value: data?.modelName || ''
                            }
                        },
                        {
                            type: 'button',
                            classes: ['model-lookup-btn'],
                            attributes: { 
                                'data-input-id': `modelName${id}`,
                                'title': 'Look up available models'
                            },
                            html: '<i class="fas fa-search"></i>'
                        }
                    ]
                },
                {
                    type: 'label',
                    classes: ['llm-response-label'],
                    attributes: { for: `llmResponse${id}` },
                    text: 'LLM Response:'
                },
                {
                    type: 'textarea',
                    classes: ['llm-response-textarea'],
                    attributes: {
                        id: `llmResponse${id}`,
                        placeholder: 'Paste LLM response here...',
                        value: data?.llmResponse || ''
                    }
                },
                {
                    type: 'div',
                    classes: ['markdown-view'],
                    attributes: {
                        style: markdownViewActive ? 'display: block;' : 'display: none;'
                    },
                    html: data?.llmResponse && markdownViewActive ? marked.parse(data.llmResponse) : ''
                },
                {
                    type: 'div',
                    classes: ['rating-container'],
                    children: [
                        {
                            type: 'div',
                            classes: ['rating-controls'],
                            children: [
                                {
                                    type: 'label',
                                    classes: ['rating-label'],
                                    attributes: { for: `rating${id}` },
                                    text: 'Rating (1-5):'
                                },
                                {
                                    type: 'input',
                                    classes: ['rating-input'],
                                    attributes: {
                                        type: 'number',
                                        id: `rating${id}`,
                                        min: '1',
                                        max: '5',
                                        step: '1',
                                        placeholder: 'e.g., 3',
                                        value: data?.rating || ''
                                    }
                                },
                                {
                                    type: 'button',
                                    classes: ['run-model-btn', 'btn-success'],
                                    attributes: {
                                        title: 'Run this model'
                                    },
                                    html: '<i class="fas fa-play"></i> Run'
                                }
                            ]
                        },
                        {
                            type: 'button',
                            classes: ['remove-column-btn'],
                            html: '<i class="fas fa-trash-alt"></i> '
                        }
                    ]
                }
            ]
        })
    };

    // --- Renderer Function ---
    function renderTemplate(template, parent = null) {
        const element = document.createElement(template.type);
        if (template.classes) element.classList.add(...template.classes);
        if (template.attributes) {
            Object.entries(template.attributes).forEach(([key, value]) => {
                if (key === 'value' && (template.type === 'textarea' || template.type === 'input')) {
                    element.value = value;
                } else if (value !== undefined) {
                    element.setAttribute(key, value);
                }
            });
        }
        if (template.text) element.textContent = template.text;
        if (template.html) element.innerHTML = template.html;
        if (template.children) {
            template.children.forEach(childTemplate => renderTemplate(childTemplate, element));
        }
        if (parent) parent.appendChild(element);
        return element;
    }

    // --- Refactored Column Creation ---
    function createColumn(data = null) {
        columnCounter++;
        const columnTemplate = templates.column(columnCounter, data);
        return renderTemplate(columnTemplate);
    }

    // --- Setup Initial Columns ---
    // Sets placeholders and IDs for newly created default columns
    function setupInitialColumn(columnIndex, modelPlaceholder, ratingPlaceholder) {
        // Find the specific column element based on its index in the container
        const column = columnsContainer.children[columnIndex - 1];
        if (!column) return;

        const modelNameInput = column.querySelector('.model-name-input');
        const modelNameLabel = column.querySelector('.model-name-label');
        const responseTextarea = column.querySelector('.llm-response-textarea');
        const responseLabel = column.querySelector('.llm-response-label');
        const ratingInput = column.querySelector('.rating-input');
        const ratingLabel = column.querySelector('.rating-label');

        // IDs are already set by createColumn, just set placeholders
        if (modelNameInput) modelNameInput.placeholder = modelPlaceholder;
        if (ratingInput) ratingInput.placeholder = ratingPlaceholder;
    }


    // --- Reset Function ---
    function resetToDefaultState() {
         // Clear metadata
        comparisonTitleInput.value = '';
        systemPromptTextarea.value = 'You are a helpful AI assistant. Provide clear, concise, and accurate responses.';
        userPromptTextarea.value = '';

        // Clear existing columns
        columnsContainer.innerHTML = '';

        // Reset column counter
        columnCounter = 0;

        // Reset last used filename
        lastUsedFilename = null;

        // Add two default columns
        const column1 = createColumn(); // Creates column with ID suffix 1
        const column2 = createColumn(); // Creates column with ID suffix 2
        columnsContainer.appendChild(column1);
        columnsContainer.appendChild(column2);

        // Setup placeholders for the new default columns
        setupInitialColumn(1, 'e.g., GPT-4', 'e.g., 4');
        setupInitialColumn(2, 'e.g., Claude 3', 'e.g., 5');

        setStatus('Comparison reset to default state.', 'info');
    }

    // Run a model and update the response textarea
    async function runModel(column) {
        try {
            // Get the model name from the column
            const modelNameInput = column.querySelector('.model-name-input');
            const modelName = modelNameInput.value.trim();

            // Get the response textarea to update
            const responseTextarea = column.querySelector('.llm-response-textarea');
            
            // Get the system and user prompts
            const systemPrompt = systemPromptTextarea.value.trim();
            const userPrompt = userPromptTextarea.value.trim();
            
            // Validate inputs
            if (!modelName) {
                setStatus('Model name cannot be empty', 'error');
                return;
            }
            
            if (!userPrompt) {
                setStatus('User prompt cannot be empty', 'error');
                return;
            }
            
            // Check if settings are available
            if (typeof window.aiSettings === 'undefined') {
                setStatus('Settings not available. Please refresh the page.', 'error', 5000);
                return;
            }
            
            // Update UI to show processing
            const runButton = column.querySelector('.run-model-btn');
            const originalButtonHTML = runButton.innerHTML;
            runButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            runButton.disabled = true;
            
            // Build messages array with system and user messages
            const messages = [
                { 
                    role: "system", 
                    content: systemPrompt || "You are a helpful AI assistant. Provide clear, concise, and accurate responses."
                },
                { 
                    role: "user", 
                    content: userPrompt 
                }
            ];
            
            // Get cached settings
            const settings = await getApiSettings();
            
            // Call the sendMessages function with the messages array
            const response = await sendMessages(messages, modelName, 8000, settings);
            
            // Update the response textarea
            responseTextarea.value = response;
            
            // If markdown view is active, update the response markdown view
            if (markdownViewActive) {
                const markdownView = column.querySelector('.markdown-view');
                if (markdownView) {
                    markdownView.innerHTML = marked.parse(response);
                    markdownView.querySelectorAll('pre code').forEach(block => {
                        if (typeof hljs !== 'undefined') {
                            hljs.highlightElement(block);
                        }
                    });
                }
            }
            
            setStatus(`${modelName} response generated successfully!`, 'success');
        } catch (error) {
            console.error('Error running model:', error);
            setStatus(`Error: ${error.message}`, 'error', 6000);
        } finally {
            // Reset button state
            const runButton = column.querySelector('.run-model-btn');
            runButton.innerHTML = '<i class="fas fa-play"></i> Run';
            runButton.disabled = false;
        }
    }

    // --- Event Listeners ---

    // New Comparison
    newBtn.addEventListener('click', () => {
        // Optional: Add a confirmation dialog
        if (confirm('Are you sure you want to start a new comparison? All current data will be lost.')) {
            resetToDefaultState();
        }
    });

    // Add Column
    addColumnBtn.addEventListener('click', () => {
        const newColumn = createColumn();
        columnsContainer.appendChild(newColumn);
        setStatus('New column added.', 'info');
    });

    // Remove Column (Event Delegation)
    columnsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-column-btn') || 
           event.target.closest('.remove-column-btn')) {
            const columnToRemove = event.target.closest('.column');
            if (columnToRemove) {
                columnToRemove.remove();
                setStatus('Column removed.', 'info');
                // Note: columnCounter is not decremented
            }
        }
    });

    // Save Comparison
    saveBtn.addEventListener('click', async () => {
        try {
            const comparisonData = {
                comparisonTitle: comparisonTitleInput.value || "Untitled Comparison",
                systemPrompt: systemPromptTextarea.value || "",
                userPrompt: userPromptTextarea.value || "",
                responses: []
            };

            const columnElements = columnsContainer.querySelectorAll('.column');
            columnElements.forEach(column => {
                const modelName = column.querySelector('.model-name-input').value;
                const llmResponse = column.querySelector('.llm-response-textarea').value;
                const ratingValue = column.querySelector('.rating-input').value;
                const rating = ratingValue ? parseInt(ratingValue, 10) : null;

                comparisonData.responses.push({
                    modelName: modelName || "Unnamed Model",
                    llmResponse: llmResponse || "",
                    rating: (rating >= 1 && rating <= 5) ? rating : null
                });
            });

            const jsonString = JSON.stringify(comparisonData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Generate default filename from the comparison title if no filename is remembered
            const safeTitle = comparisonData.comparisonTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const defaultFilename = lastUsedFilename || `${safeTitle || 'llm_comparison'}.json`;
            
            if (fileSave) {
                // Use browser-fs-access library for modern file saving
                const savedFile = await fileSave(blob, {
                    fileName: defaultFilename,
                    extensions: ['.json'],
                    description: 'JSON Files',
                });
                
                // Store the filename for next save
                if (savedFile && savedFile.name) {
                    lastUsedFilename = savedFile.name;
                }
                
                setStatus('Comparison saved successfully!', 'success');
            } else {
                // Fallback to traditional method if browser-fs-access isn't available
                const url = URL.createObjectURL(blob);
                const defaultNameWithoutExt = defaultFilename.replace(/\.json$/, '');
                
                // Prompt user for filename
                const userFilename = prompt("Enter filename for saving (without extension):", defaultNameWithoutExt);
                
                // If user cancels the prompt, abort the save
                if (userFilename === null) {
                    URL.revokeObjectURL(url);
                    return;
                }
                
                // Use user's filename or default if empty, and sanitize
                const finalFilename = (userFilename.trim() || defaultNameWithoutExt).replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const fullFilename = `${finalFilename}.json`;
                
                // Remember this filename for next save
                lastUsedFilename = fullFilename;

                const a = document.createElement('a');
                a.href = url;
                a.download = fullFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setStatus('Comparison saved successfully!', 'success');
            }
        } catch (error) {
            console.error("Error saving comparison:", error);
            setStatus(`Error saving file: ${error.message}`, 'error', 5000);
        }
    });

    // Load Comparison - Trigger file picker or input
    loadBtn.addEventListener('click', async () => {
        if (fileOpen) {
            try {
                // Use the modern File System Access API via browser-fs-access
                const file = await fileOpen({
                    extensions: ['.json'],
                    description: 'JSON Files',
                    mimeTypes: ['application/json'],
                });
                
                // Remember the filename for future saves
                if (file && file.name) {
                    lastUsedFilename = file.name;
                }
                
                // Process the file
                const content = await file.text();
                let loadedData;
                
                try {
                    loadedData = JSON.parse(content);
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                    setStatus(`Error: Could not parse file. Ensure it's valid JSON. (${error.message})`, 'error', 5000);
                    return;
                }
                
                processLoadedData(loadedData);
            } catch (error) {
                // User cancelled or other error
                if (error.name !== 'AbortError') {
                    console.error("Error opening file:", error);
                    setStatus(`Error opening file: ${error.message}`, 'error', 5000);
                }
            }
        } else {
            // Fallback to traditional file input
            loadFile.click();
        }
    });

    // Handle traditional file input (fallback method)
    loadFile.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Remember the filename for future saves
        if (file.name) {
            lastUsedFilename = file.name;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target.result;
            let loadedData;

            try {
                loadedData = JSON.parse(content);
            } catch (error) {
                console.error("Error parsing JSON:", error);
                setStatus(`Error: Could not parse file. Ensure it's valid JSON. (${error.message})`, 'error', 5000);
                loadFile.value = null;
                return;
            }

            processLoadedData(loadedData);
        };

        reader.onerror = (e) => {
            console.error("Error reading file:", e);
            setStatus(`Error reading file: ${reader.error}`, 'error', 5000);
            loadFile.value = null;
        };

        reader.readAsText(file);
    });

    // Helper function to process the loaded data (extracted to avoid code duplication)
    function processLoadedData(loadedData) {
        if (typeof loadedData !== 'object' || loadedData === null ||
            typeof loadedData.comparisonTitle === 'undefined' ||
            typeof loadedData.userPrompt === 'undefined' ||
            !Array.isArray(loadedData.responses))
        {
            setStatus('Error: Invalid file format. Missing required fields.', 'error', 5000);
            loadFile.value = null;
            return;
        }

        try {
            // Clear existing content and reset counter before loading
            columnsContainer.innerHTML = '';
            columnCounter = 0; // Reset counter is crucial here

            comparisonTitleInput.value = loadedData.comparisonTitle || "";
            
            // Handle systemPrompt - if field exists use it, otherwise use default
            const defaultSystemPrompt = "You are a helpful AI assistant. Provide clear, concise, and accurate responses.";
            systemPromptTextarea.value = typeof loadedData.systemPrompt !== 'undefined' 
                ? loadedData.systemPrompt 
                : defaultSystemPrompt;
                
            userPromptTextarea.value = loadedData.userPrompt || "";

            if (loadedData.responses.length === 0) {
                 setStatus('Loaded comparison has no responses.', 'info');
                 // If no responses, add the two default columns
                 resetToDefaultState(); // Or just add two empty columns? Resetting seems safer.
                 
                 // Re-apply metadata after reset
                 comparisonTitleInput.value = loadedData.comparisonTitle || "";
                 systemPromptTextarea.value = typeof loadedData.systemPrompt !== 'undefined'
                    ? loadedData.systemPrompt
                    : defaultSystemPrompt;
                 userPromptTextarea.value = loadedData.userPrompt || "";
            } else {
                loadedData.responses.forEach(response => {
                    if (typeof response === 'object' && response !== null) {
                        const newColumn = createColumn(response);
                        columnsContainer.appendChild(newColumn);
                    } else {
                        console.warn("Skipping invalid response item during load:", response);
                    }
                });
                 setStatus(`Comparison loaded successfully with ${loadedData.responses.length} response(s).`, 'success');
            }

        } catch (error) {
             console.error("Error populating page from loaded data:", error);
             setStatus(`Error applying loaded data: ${error.message}`, 'error', 5000);
        } finally {
             loadFile.value = null;
        }
    }

    // Toggle Markdown View
    toggleMarkdownBtn.addEventListener('click', toggleMarkdownView);
    
    // Update markdown view when response textarea or user prompt changes
    document.addEventListener('input', (event) => {
        if (markdownViewActive) {
            if (event.target.classList.contains('llm-response-textarea')) {
                const column = event.target.closest('.column');
                const markdownView = column.querySelector('.markdown-view');
                
                markdownView.innerHTML = marked.parse(event.target.value);
                markdownView.querySelectorAll('pre code').forEach((block) => {
                    if (typeof hljs !== 'undefined') {
                        hljs.highlightElement(block);
                    }
                });
            } else if (event.target === systemPromptTextarea) {
                systemPromptMarkdown.innerHTML = marked.parse(systemPromptTextarea.value);
                systemPromptMarkdown.querySelectorAll('pre code').forEach((block) => {
                    if (typeof hljs !== 'undefined') {
                        hljs.highlightElement(block);
                    }
                });
            } else if (event.target === userPromptTextarea) {
                userPromptMarkdown.innerHTML = marked.parse(userPromptTextarea.value);
                userPromptMarkdown.querySelectorAll('pre code').forEach((block) => {
                    if (typeof hljs !== 'undefined') {
                        hljs.highlightElement(block);
                    }
                });
            }
        }
    });

    // Toggle comparison meta
    metaToggle.addEventListener('click', () => {
        comparisonMeta.classList.toggle('collapsed');
        
        // Update status message
        if (comparisonMeta.classList.contains('collapsed')) {
            setStatus('Metadata collapsed', 'info', 2000);
        } else {
            setStatus('Metadata expanded', 'info', 2000);
        }
    });
    
    // Event delegation for column actions
    columnsContainer.addEventListener('click', async (event) => {
        // Handle run model button clicks
        if (event.target.classList.contains('run-model-btn') || 
            event.target.closest('.run-model-btn')) {
            
            const button = event.target.classList.contains('run-model-btn') ? 
                event.target : event.target.closest('.run-model-btn');
            
            const column = button.closest('.column');
            if (column) {
                await runModel(column);
            }
        }
        
        // Handle model lookup button clicks
        if (event.target.classList.contains('model-lookup-btn') || 
            event.target.closest('.model-lookup-btn')) {
            
            const button = event.target.classList.contains('model-lookup-btn') ? 
                event.target : event.target.closest('.model-lookup-btn');
            
            const inputId = button.getAttribute('data-input-id');
            if (inputId) {
                const input = document.getElementById(inputId);
                if (input) {
                    showModelSelector(input);
                }
            }
            // Prevent event from bubbling up to document click handler
            event.stopPropagation();
        }
    });

    // Settings button
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            if (typeof window.aiSettings !== 'undefined') {
                // Reset API settings cache when opening settings
                apiSettings = null;
                // Also clear cached models since settings might affect available models
                availableModels = [];
                // Reset model selector models if it exists
                if (modelSelector) {
                    modelSelector.setModels([]);
                }
                window.aiSettings.openSettings();
            } else {
                setStatus('Settings manager is not available', 'error');
            }
        });
    }

    // --- Initial Page Load ---
    resetToDefaultState(); // Initialize the page with the default state
    
    // Ensure the markdown elements are properly initialized
    if (!systemPromptMarkdown) {
        systemPromptMarkdown = document.getElementById('systemPromptMarkdown');
    }
    if (systemPromptMarkdown) {
        systemPromptMarkdown.style.display = 'none';
    }
    
    if (!userPromptMarkdown) {
        userPromptMarkdown = document.getElementById('userPromptMarkdown');
    }
    if (userPromptMarkdown) {
        userPromptMarkdown.style.display = 'none';
    }
});
