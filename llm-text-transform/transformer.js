document.addEventListener('DOMContentLoaded', async () => {
    // Try to dynamically import the callOpenAI function
    let sendMessages;
    let getAvailableModels;
    try {
        const module = await import('../js/llm.js');
        sendMessages = module.sendMessages;
        getAvailableModels = module.getAvailableModels;
    } catch (error) {
        console.error('Error importing llm.js:', error);
        // Create fallback if import fails
        sendMessages = async (messages, model, maxTokens, settings) => {
            throw new Error('LLM API module could not be loaded. Please check the console for details.');
        };
        getAvailableModels = async (settings) => {
            throw new Error('LLM API module could not be loaded. Please check the console for details.');
        };
    }

    // --- DOM References ---
    const newBtn = document.getElementById('newBtn');
    const saveBtn = document.getElementById('saveBtn');
    const loadBtn = document.getElementById('loadBtn');
    const loadFile = document.getElementById('loadFile');
    const transformBtn = document.getElementById('transformBtn');
    const cancelTransformBtn = document.getElementById('cancelTransformBtn');
    const transformProgress = document.getElementById('transformProgress');
    const currentStepNum = document.getElementById('currentStepNum');
    const totalStepNum = document.getElementById('totalStepNum');
    const toggleMarkdownBtn = document.getElementById('toggleMarkdownBtn');
    const transformTitle = document.getElementById('transformTitle');
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const markdownOutput = document.getElementById('markdown-output');
    const previewContainer = document.querySelector('.preview-container');
    const stepsContainer = document.getElementById('stepsContainer');
    const addStepBtn = document.getElementById('addStepBtn');
    const copyBtn = document.getElementById('copyBtn');
    const printBtn = document.getElementById('printBtn');
    const toastContainer = document.getElementById('toastContainer');
    const settingsBtn = document.getElementById('settings-button');

    // --- State ---
    let markdownViewActive = false;
    let stepCounter = 0;
    let isTransforming = false;
    let cancelTransformation = false;
    let availableModels = []; // Will now store objects with {id, name} instead of just strings

    // --- API Settings Cache ---
    let apiSettings = null;
    
    // Retrieve API settings once and cache them
    async function getApiSettings() {
        if (apiSettings !== null) {
            return apiSettings;
        }
        
        if (typeof window.aiSettings === 'undefined') {
            throw new Error('Settings manager is not available. Please refresh the page and try again.');
        }
        
        apiSettings = await window.aiSettings.getSettings();
        
        if (!apiSettings.openaiApiKey) {
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
            
            return availableModels;
        } catch (error) {
            console.error('Error fetching available models:', error);
            setStatus(`Failed to load model list: ${error.message}`, 'error', 5000);
            return [];
        }
    }
    
    // Model selector popup functions
    let modelSelectorPopup = null;
    let currentModelInput = null;
    
    // Create model selector popup if it doesn't exist
    function createModelSelectorPopup() {
        if (modelSelectorPopup) return modelSelectorPopup;
        
        // Create popup container
        modelSelectorPopup = document.createElement('div');
        modelSelectorPopup.className = 'model-selector-popup';
        modelSelectorPopup.style.display = 'none';
        
        // Add search input
        const searchContainer = document.createElement('div');
        searchContainer.className = 'model-search-container';
        
        // Create search input wrapper (for containing input and clear button)
        const searchInputWrapper = document.createElement('div');
        searchInputWrapper.className = 'search-input-wrapper';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'model-search-input';
        searchInput.placeholder = 'Search models...';
        
        // Create clear button for search input
        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'search-clear-btn';
        clearButton.innerHTML = '<i class="fas fa-times"></i>';
        clearButton.title = 'Clear search';
        
        // Add searchInput and clearButton to wrapper
        searchInputWrapper.appendChild(searchInput);
        searchInputWrapper.appendChild(clearButton);
        
        // Add close button to search container
        const closeButton = document.createElement('button');
        closeButton.className = 'model-selector-close';
        closeButton.innerHTML = '<i class="fas fa-times"></i>';
        
        // Add elements to container
        searchContainer.appendChild(searchInputWrapper);
        searchContainer.appendChild(closeButton);
        modelSelectorPopup.appendChild(searchContainer);
        
        // Add models list container
        const modelsListContainer = document.createElement('div');
        modelsListContainer.className = 'models-list-container';
        modelSelectorPopup.appendChild(modelsListContainer);
        
        // Add event listeners
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            updateModelsList(searchTerm);
        });
        
        // Add clear button event listener
        clearButton.addEventListener('click', function() {
            searchInput.value = '';
            searchInput.focus();
            updateModelsList('');
        });
        
        closeButton.addEventListener('click', function() {
            hideModelSelector();
        });
        
        // Close when clicking outside
        document.addEventListener('click', function(e) {
            if (modelSelectorPopup && modelSelectorPopup.style.display !== 'none') {
                // Check if click is outside the popup
                if (!modelSelectorPopup.contains(e.target) && 
                    !e.target.classList.contains('model-lookup-btn') &&
                    !e.target.closest('.model-lookup-btn')) {
                    hideModelSelector();
                }
            }
        });
        
        // Add to body
        document.body.appendChild(modelSelectorPopup);
        return modelSelectorPopup;
    }
    
    // Show model selector popup
    async function showModelSelector(modelInput) {
        // Store reference to the input field
        currentModelInput = modelInput;
        
        // Create popup if it doesn't exist
        const popup = createModelSelectorPopup();
        
        // No need to position near input as it's now centered
        // Just display the popup
        
        // Check if models are cached, fetch if needed
        if (availableModels.length === 0) {
            try {
                // Show loading indicator in popup
                const modelsListContainer = popup.querySelector('.models-list-container');
                modelsListContainer.innerHTML = '<div class="loading-models">Loading models...</div>';
                
                // Show popup while loading
                popup.style.display = 'flex'; // Changed from 'block' to 'flex'
                
                // Fetch and cache models
                await fetchAvailableModels();
            } catch (error) {
                console.error('Error fetching models:', error);
                setStatus(`Failed to load models: ${error.message}`, 'error', 5000);
            }
        } else {
            // Show popup immediately if models are already cached
            popup.style.display = 'flex'; // Changed from 'block' to 'flex'
        }
        
        // Update models list with any existing filter value
        const searchInput = popup.querySelector('.model-search-input');
        searchInput.value = modelInput.value; // Set search to current input value
        updateModelsList(searchInput.value.toLowerCase());
        
        // Focus search input
        setTimeout(() => {
            searchInput.focus();
        }, 100);
        
        // Add event listener to close popup when clicking outside
        // This is already handled in the createModelSelectorPopup function
    }
    
    // Hide model selector popup
    function hideModelSelector() {
        if (modelSelectorPopup) {
            modelSelectorPopup.style.display = 'none';
            currentModelInput = null;
        }
    }
    
    // Update models list based on search term
    function updateModelsList(searchTerm = '') {
        if (!modelSelectorPopup) return;
        
        const modelsListContainer = modelSelectorPopup.querySelector('.models-list-container');
        modelsListContainer.innerHTML = '';
        
        // Filter models by search term - now searching in both name and id with null checks
        const filteredModels = availableModels.filter(model => {
            const modelName = model.name || '';
            const modelId = model.id || '';
            return modelName.toLowerCase().includes(searchTerm) || 
                   modelId.toLowerCase().includes(searchTerm);
        });
        
        if (filteredModels.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-models-message';
            noResults.textContent = searchTerm ? 
                'No models matching your search' : 
                'No models available. Check your API settings.';
            modelsListContainer.appendChild(noResults);
            return;
        }
        
        // Create list of models
        const modelsList = document.createElement('ul');
        modelsList.className = 'models-list';
        
        filteredModels.forEach(model => {
            // Skip invalid models
            if (!model.id) return;
            
            const modelItem = document.createElement('li');
            modelItem.className = 'model-item';
            
            // Create model name span
            const nameSpan = document.createElement('span');
            nameSpan.className = 'model-name';
            nameSpan.textContent = model.name || model.id;
            modelItem.appendChild(nameSpan);
            
            // Add context length info if available
            if (model.contextLength) {
                const contextSpan = document.createElement('span');
                contextSpan.className = 'model-context';
                contextSpan.textContent = `${model.contextLength} context`;
                modelItem.appendChild(contextSpan);
            }
            
            // Add pricing info if available
            if (model.pricing) {
                const pricingSpan = document.createElement('span');
                pricingSpan.className = 'model-pricing';
                pricingSpan.textContent = model.pricing;
                modelItem.appendChild(pricingSpan);
            }
            
            // Store model ID as data attribute
            modelItem.setAttribute('data-model-id', model.id);
            
            // Highlight current selection
            if (currentModelInput && currentModelInput.value === model.id) {
                modelItem.classList.add('selected');
            }
            
            // Add click handler
            modelItem.addEventListener('click', function() {
                if (currentModelInput) {
                    currentModelInput.value = model.id; // Set the ID as the value
                    // Trigger input event to update run button state
                    currentModelInput.dispatchEvent(new Event('input'));
                }
                hideModelSelector();
            });
            
            modelsList.appendChild(modelItem);
        });
        
        modelsListContainer.appendChild(modelsList);
    }
    
    // Function to show the LLM response popup
    function showResponsePopup(responseText, stepId) {
        // Create popup if it doesn't exist
        let overlay = document.getElementById('responsePopupOverlay');
        if (!overlay) {
            const popupTemplate = templates.responsePopup();
            overlay = renderTemplate(popupTemplate, document.body);
            
            // Add close button event listener
            const closeBtn = overlay.querySelector('.close-popup-btn');
            closeBtn.addEventListener('click', () => {
                overlay.style.display = 'none';
            });
        }
        
        // Get step number from step ID
        let title = "LLM Response";
        if (stepId) {
            const step = document.querySelector(`.transform-step[data-step-id="${stepId}"]`);
            if (step) {
                const stepLabel = step.querySelector('.step-instructions-label').textContent;
                // Extract the step number from the label (e.g., "Step 3 Instructions:")
                const stepNumber = stepLabel.match(/Step\s+(\d+)/i)?.[1] || stepId;
                title = `Step ${stepNumber} Response`;
            }
        }
        
        // Set the title
        const popupTitle = overlay.querySelector('.response-popup-header h3');
        if (popupTitle) {
            popupTitle.textContent = title;
        }
        
        // Set response content
        const responseContent = overlay.querySelector('#responseContent');
        responseContent.textContent = responseText;
        
        // Show the popup
        overlay.style.display = 'flex';
    }

    // --- Configure marked options ---
    marked.setOptions({
        highlight: function(code, lang) {
            if (typeof hljs === 'undefined') {
                return code;
            }
            
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
    });

    // --- Templates ---
    const templates = {
        step: (id, data = null) => ({
            type: 'div',
            classes: ['transform-step'],
            attributes: { id: `step${id}`, 'data-step-id': id },
            children: [
                {
                    type: 'div',
                    classes: ['llm-response-icon'],
                    attributes: {
                        'data-step-id': id,
                        'title': 'View LLM Response',
                        'style': data?.llmResponse ? 'display: flex;' : 'display: none;'
                    },
                    html: '<i class="fas fa-robot"></i>'
                },
                {
                    type: 'input',
                    classes: ['hidden-llm-response'],
                    attributes: {
                        type: 'hidden',
                        id: `llmResponse${id}`,
                        value: data?.llmResponse || ''
                    }
                },
                {
                    type: 'label',
                    classes: ['step-instructions-label'],
                    attributes: { for: `stepInstructions${id}` },
                    text: `Step ${id} Instructions:`
                },
                {
                    type: 'textarea',
                    classes: ['step-instructions'],
                    attributes: {
                        id: `stepInstructions${id}`,
                        placeholder: 'Enter transformation instructions...',
                        value: data?.instructions || ''
                    }
                },
                {
                    type: 'div',
                    classes: ['step-model-container'],
                    children: [
                        {
                            type: 'label',
                            classes: ['step-model-label'],
                            attributes: { for: `stepModel${id}` },
                            text: 'Model:'
                        },
                        {
                            type: 'div',
                            classes: ['model-input-group'],
                            children: [
                                {
                                    type: 'input',
                                    classes: ['step-model-input'],
                                    attributes: { 
                                        id: `stepModel${id}`,
                                        type: 'text',
                                        placeholder: 'e.g., gpt-4o, claude-3, llama, etc.',
                                        value: data?.model || ''
                                    }
                                },
                                {
                                    type: 'button',
                                    classes: ['model-lookup-btn'],
                                    attributes: { 
                                        'data-input-id': `stepModel${id}`,
                                        'title': 'Look up available models'
                                    },
                                    html: '<i class="fas fa-search"></i>'
                                }
                            ]
                        }
                    ]
                },
                {
                    type: 'div',
                    classes: ['step-buttons-container'],
                    children: [
                        {
                            type: 'button',
                            classes: ['remove-step-btn'],
                            attributes: { 'data-step-id': id },
                            html: '<i class="fas fa-trash"></i> Remove'
                        },
                        {
                            type: 'button',
                            classes: ['run-step-btn'],
                            attributes: { 'data-step-id': id },
                            html: '<i class="fas fa-play"></i> Run'
                        }
                    ]
                }
            ]
        }),
        responsePopup: () => ({
            type: 'div',
            classes: ['response-popup-overlay'],
            attributes: { id: 'responsePopupOverlay' },
            children: [
                {
                    type: 'div',
                    classes: ['response-popup'],
                    attributes: { id: 'responsePopup' },
                    children: [
                        {
                            type: 'div',
                            classes: ['response-popup-header'],
                            children: [
                                {
                                    type: 'h3',
                                    text: 'LLM Response',
                                },
                                {
                                    type: 'button',
                                    classes: ['close-popup-btn'],
                                    html: '<i class="fas fa-times"></i>'
                                }
                            ]
                        },
                        {
                            type: 'div',
                            classes: ['response-popup-content'],
                            children: [
                                {
                                    type: 'pre',
                                    classes: ['response-content'],
                                    attributes: { id: 'responseContent' }
                                }
                            ]
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
                } else if (value !== undefined && value !== false) {
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

    // --- Utility Functions ---
    function setStatus(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
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
        
        toastContainer.appendChild(toast);
        
        const closeButton = toast.querySelector('.toast-close');
        closeButton.addEventListener('click', () => {
            toast.classList.add('hiding');
            setTimeout(() => {
                if (toast.parentNode === toastContainer) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        });
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.add('hiding');
                setTimeout(() => {
                    if (toast.parentNode === toastContainer) {
                        toastContainer.removeChild(toast);
                    }
                }, 300);
            }, duration);
        }
    }

    // Create a new step
    function createStep(data = null) {
        stepCounter++;
        const stepTemplate = templates.step(stepCounter, data);
        const newStep = renderTemplate(stepTemplate);
        
        // Set initial button state
        updateRunButtonState(newStep);
        
        return newStep;
    }

    // Add a step to the container
    function addStep(data = null) {
        const steps = stepsContainer.querySelectorAll('.transform-step');
        let defaultModel = "";
        if (steps.length > 0) {
            const lastStep = steps[steps.length - 1];
            const lastModelInput = lastStep.querySelector('.step-model-input');
            if (lastModelInput) {
                defaultModel = lastModelInput.value;
            }
        }

        const newStep = createStep({ ...data, model: data?.model || defaultModel });
        stepsContainer.appendChild(newStep);
        updateStepNumbers();
        return newStep;
    }

    // Update step numbers
    function updateStepNumbers() {
        const steps = stepsContainer.querySelectorAll('.transform-step');
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.querySelector('.step-instructions-label').textContent = `Step ${stepNumber} Instructions:`;
        });
    }

    // Toggle Markdown View Function
    function toggleMarkdownView() {
        markdownViewActive = !markdownViewActive;
        
        if (markdownViewActive) {
            // Update the output markdown view
            outputText.style.display = 'none';
            previewContainer.style.display = 'block';
            markdownOutput.innerHTML = marked.parse(outputText.value || '');
            markdownOutput.querySelectorAll('pre code').forEach(block => {
                if (typeof hljs !== 'undefined') {
                    hljs.highlightElement(block);
                }
            });
            
            toggleMarkdownBtn.innerHTML = '<i class="fas fa-font"></i> Show Raw Text';
        } else {
            outputText.style.display = 'block';
            previewContainer.style.display = 'none';
            
            toggleMarkdownBtn.innerHTML = '<i class="fas fa-code"></i> Toggle Markdown';
        }
        
        setStatus(markdownViewActive ? 'Showing rendered markdown' : 'Showing raw text', 'info');
    }

    // Reset Function
    function resetToDefaultState() {
        transformTitle.value = '';
        inputText.value = '';
        outputText.value = '';
        markdownOutput.innerHTML = '';
        
        // Clear existing steps
        stepsContainer.innerHTML = '';
        stepCounter = 0;
        
        // Add default first step
        addStep();
        
        // Reset views
        if (markdownViewActive) {
            outputText.style.display = 'none';
            previewContainer.style.display = 'block';
        } else {
            outputText.style.display = 'block';
            previewContainer.style.display = 'none';
        }
        
        setStatus('Reset to default state', 'info');
    }

    // Get all steps data
    function getStepsData() {
        const steps = [];
        stepsContainer.querySelectorAll('.transform-step').forEach((step, index) => {
            const stepId = step.getAttribute('data-step-id');
            const instructions = step.querySelector(`.step-instructions`).value;
            const model = step.querySelector(`.step-model-input`).value;
            const llmResponse = step.querySelector(`.hidden-llm-response`).value;
            
            steps.push({
                stepNumber: index + 1,
                instructions,
                model,
                llmResponse
            });
        });
        return steps;
    }

    // Update run button state based on field values
    function updateRunButtonState(step) {
        const instructions = step.querySelector('.step-instructions').value.trim();
        const model = step.querySelector('.step-model-input').value.trim();
        const runButton = step.querySelector('.run-step-btn');
        
        if (!instructions || !model) {
            runButton.disabled = true;
            runButton.title = "Both instructions and model are required";
        } else {
            runButton.disabled = false;
            runButton.title = "Run this transformation step";
        }
    }

    // Run a single step
    async function runStep(stepId) {
        try {
            const step = document.querySelector(`.transform-step[data-step-id="${stepId}"]`);
            if (!step) return;
            
            const instructions = step.querySelector('.step-instructions').value.trim();
            const model = step.querySelector('.step-model-input').value.trim();
            
            // Find the current step's position in the DOM sequence (not based on data-step-id)
            // This ensures that after removing steps, the pipeline still works correctly
            const allSteps = Array.from(document.querySelectorAll('.transform-step'));
            const currentStepIndex = allSteps.findIndex(s => s.getAttribute('data-step-id') === stepId);
            const isFirstStep = currentStepIndex === 0; // First in DOM order, regardless of data-step-id
            
            // Input validation
            if (!instructions) {
                setStatus('Instructions cannot be empty', 'error');
                return;
            }
            
            if (!model) {
                setStatus('Model cannot be empty', 'error');
                return;
            }
            
            if (!inputText.value.trim()) {
                setStatus('Input text cannot be empty', 'error');
                return;
            }
            
            // Check if settings are available
            if (typeof window.aiSettings === 'undefined') {
                setStatus('Settings not available. Please refresh the page.', 'error', 5000);
                return;
            }
            
            // Update UI to show processing
            const runButton = step.querySelector('.run-step-btn');
            runButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            runButton.disabled = true;

            // Build messages array according to the specified rules
            let messages = [];
            
            // Get the first step's instructions for all cases
            const firstMessageContent = `<content>${inputText.value}</content>\n\n<instructions>${instructions}<instructions>`;
            
            if (isFirstStep) {
                // First step: Create a user message with input text + instructions
                messages = [
                    { role: "user", content: firstMessageContent }
                ];
            } else {
                // Subsequent steps:
                // 1. Include the first user message (input text + first step's instructions)
                messages.push({ 
                    role: "user", 
                    content: firstMessageContent
                });
                
                // 2. Get the previous step's LLM response
                const previousStep = allSteps[currentStepIndex - 1];
                if (!previousStep) {
                    setStatus('Error: Previous step not found', 'error');
                    return;
                }
                
                const previousResponse = previousStep.querySelector('.hidden-llm-response').value;
                if (!previousResponse.trim()) {
                    setStatus('Previous step has no output. Please run steps in order.', 'error');
                    return;
                }
                
                // 3. Add the previous step's response as an "assistant" message
                messages.push({ 
                    role: "assistant", 
                    content: previousResponse 
                });
                
                // 4. Add the current step's instructions as a new user message
                messages.push({ 
                    role: "user", 
                    content: `<instructions>${instructions}</instructions>`
                });
            }
            
            // Get cached settings
            const settings = await getApiSettings();
            
            // Call the sendMessages function with the built message array
            const response = await sendMessages(messages, model, 8000, settings);
            
            // Store the response in the hidden field
            const hiddenResponseField = step.querySelector('.hidden-llm-response');
            hiddenResponseField.value = response;
            
            // Show the response icon
            const responseIcon = step.querySelector('.llm-response-icon');
            responseIcon.style.display = 'flex';
            
            // Update the output text area
            outputText.value = response;
            
            // If markdown view is active, update the output markdown view
            if (markdownViewActive) {
                markdownOutput.innerHTML = marked.parse(response);
                markdownOutput.querySelectorAll('pre code').forEach(block => {
                    if (typeof hljs !== 'undefined') {
                        hljs.highlightElement(block);
                    }
                });
            }
            
            setStatus('Step executed successfully!', 'success');
        } catch (error) {
            console.error('Error running step:', error);
            setStatus(`Error: ${error.message}`, 'error', 6000);
        } finally {
            // Reset button state
            const step = document.querySelector(`.transform-step[data-step-id="${stepId}"]`);
            if (step) {
                const runButton = step.querySelector('.run-step-btn');
                runButton.innerHTML = '<i class="fas fa-play"></i> Run';
                runButton.disabled = false;
            }
        }
    }

    // Transform function to run all steps in sequence
    async function transformText() {
        try {
            const steps = Array.from(document.querySelectorAll('.transform-step'));
            if (steps.length === 0) {
                setStatus('No steps to run', 'error');
                return;
            }

            // Check if input text is empty
            if (!inputText.value.trim()) {
                setStatus('Input text cannot be empty', 'error');
                return;
            }

            // Set UI to transformation mode
            isTransforming = true;
            cancelTransformation = false;
            transformBtn.style.display = 'none';
            cancelTransformBtn.style.display = 'inline-block';
            transformProgress.style.display = 'inline-block';
            totalStepNum.textContent = steps.length;

            // Disable all step run buttons during sequence
            document.querySelectorAll('.run-step-btn').forEach(btn => {
                btn.disabled = true;
            });

            // Process each step in sequence
            for (let i = 0; i < steps.length; i++) {
                // Check if cancellation was requested
                if (cancelTransformation) {
                    setStatus('Transformation cancelled', 'info');
                    break;
                }

                // Update progress indicator
                currentStepNum.textContent = i + 1;
                
                const step = steps[i];
                const stepId = step.getAttribute('data-step-id');
                
                // Highlight current step
                steps.forEach(s => s.classList.remove('active-step'));
                step.classList.add('active-step');
                
                // Skip steps with missing data
                const instructions = step.querySelector('.step-instructions').value.trim();
                const model = step.querySelector('.step-model-input').value.trim();
                if (!instructions || !model) {
                    setStatus(`Skipping step ${i+1} due to missing instructions or model`, 'error', 3000);
                    continue;
                }
                
                try {
                    // Run the current step using the runStep function
                    await runStep(stepId);
                    
                    setStatus(`Step ${i+1} completed`, 'success', 2000);
                } catch (error) {
                    console.error(`Error in step ${i+1}:`, error);
                    setStatus(`Error in step ${i+1}: ${error.message}`, 'error', 5000);
                    break; // Stop processing on error
                }
            }
            
            // Reset UI after completion
            steps.forEach(s => s.classList.remove('active-step'));
            setStatus('Transformation complete', 'success');
        } catch (error) {
            console.error('Transformation failed:', error);
            setStatus(`Transformation failed: ${error.message}`, 'error', 5000);
        } finally {
            // Reset UI
            isTransforming = false;
            transformBtn.style.display = 'inline-block';
            cancelTransformBtn.style.display = 'none';
            transformProgress.style.display = 'none';
            
            // Re-enable step run buttons
            document.querySelectorAll('.run-step-btn').forEach(btn => {
                btn.disabled = false;
                updateRunButtonState(btn.closest('.transform-step'));
            });
        }
    }

    // Cancel transformation function
    function cancelTransformProcess() {
        if (isTransforming) {
            cancelTransformation = true;
            setStatus('Cancelling transformation...', 'info');
        }
    }

    // Copy output to clipboard
    function copyToClipboard() {
        outputText.select();
        document.execCommand('copy');
        setStatus('Output copied to clipboard!', 'success');
    }

    // Print output function
    function printOutput() {
        // Make sure the markdown is rendered before printing
        if (!markdownViewActive) {
            // Force show the preview container and hide the textarea
            outputText.style.display = 'none';
            previewContainer.style.display = 'block';
            
            // Render the markdown
            markdownOutput.innerHTML = marked.parse(outputText.value || '');
            markdownOutput.querySelectorAll('pre code').forEach(block => {
                if (typeof hljs !== 'undefined') {
                    hljs.highlightElement(block);
                }
            });
        }
        
        // Create a print-friendly version
        const printContent = document.createElement('div');
        printContent.className = 'print-content';
        printContent.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:9999;background:white;';
        
        // Clone the markdown output
        const clonedContent = markdownOutput.cloneNode(true);
        clonedContent.style.display = 'block';
        clonedContent.style.visibility = 'visible';
        printContent.appendChild(clonedContent);
        
        // Append to body temporarily
        document.body.appendChild(printContent);
        
        // Print
        setTimeout(() => {
            window.print();
            
            // Remove the temporary element after printing
            setTimeout(() => {
                document.body.removeChild(printContent);
                
                // Restore display if needed
                if (!markdownViewActive) {
                    previewContainer.style.display = 'none';
                    outputText.style.display = 'block';
                }
            }, 500);
        }, 300);
        
        setStatus('Printing document...', 'info');
    }

    // --- Event Listeners ---
    newBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to start a new transformation? All current data will be lost.')) {
            resetToDefaultState();
        }
    });

    // Add step button
    addStepBtn.addEventListener('click', () => {
        addStep();
        setStatus('New step added', 'info');
    });

    // Event delegation for step actions (run, remove, and view response)
    stepsContainer.addEventListener('click', (event) => {
        // Handle view response icon clicks
        if (event.target.classList.contains('llm-response-icon') || 
            event.target.closest('.llm-response-icon')) {
            
            const icon = event.target.classList.contains('llm-response-icon') ? 
                event.target : event.target.closest('.llm-response-icon');
            
            const stepId = icon.getAttribute('data-step-id');
            if (stepId) {
                const step = document.querySelector(`.transform-step[data-step-id="${stepId}"]`);
                const responseText = step.querySelector('.hidden-llm-response').value;
                if (responseText) {
                    showResponsePopup(responseText, stepId);
                } else {
                    setStatus('No LLM response available for this step', 'info');
                }
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
        
        // Handle run step button clicks
        if (event.target.classList.contains('run-step-btn') || 
            event.target.closest('.run-step-btn')) {
            
            const button = event.target.classList.contains('run-step-btn') ? 
                event.target : event.target.closest('.run-step-btn');
            
            const stepId = button.getAttribute('data-step-id');
            if (stepId) {
                runStep(stepId);
            }
        }
        
        // Handle remove step button clicks
        if (event.target.classList.contains('remove-step-btn') || 
            event.target.closest('.remove-step-btn')) {
            
            const button = event.target.classList.contains('remove-step-btn') ? 
                event.target : event.target.closest('.remove-step-btn');
            
            const step = button.closest('.transform-step');
            if (step) {
                // Don't remove if it's the last step
                if (stepsContainer.querySelectorAll('.transform-step').length > 1) {
                    step.remove();
                    updateStepNumbers();
                    setStatus('Step removed', 'info');
                } else {
                    setStatus('Cannot remove the only step', 'error');
                }
            }
        }
    });

    // Add an event listener to monitor changes to step instructions and models
    stepsContainer.addEventListener('input', (event) => {
        const target = event.target;
        if (target.classList.contains('step-instructions') || 
            target.classList.contains('step-model-input')) {
            
            const step = target.closest('.transform-step');
            if (step) {
                updateRunButtonState(step);
            }
        }
    });

    transformBtn.addEventListener('click', transformText);
    
    cancelTransformBtn.addEventListener('click', cancelTransformProcess);
    
    copyBtn.addEventListener('click', copyToClipboard);
    
    toggleMarkdownBtn.addEventListener('click', toggleMarkdownView);
    
    printBtn.addEventListener('click', printOutput);
    
    // Settings button
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (typeof window.aiSettings !== 'undefined') {
                // Reset API settings cache when opening settings
                apiSettings = null;
                // Also clear cached models since settings might affect available models
                availableModels = [];
                window.aiSettings.openSettings();
            } else {
                setStatus('Settings manager is not available', 'error');
            }
        });
    }

    // Update markdown view when textareas change
    document.addEventListener('input', (event) => {
        if (markdownViewActive) {
            if (event.target.classList.contains('llm-response-textarea')) {
                const column = event.target.closest('.column');
                const markdownView = column.querySelector('.markdown-view');
                
                markdownView.innerHTML = marked.parse(event.target.value || '');
                markdownView.querySelectorAll('pre code').forEach(block => {
                    if (typeof hljs !== 'undefined') {
                        hljs.highlightElement(block);
                    }
                });
            }
        }
        
        if (markdownViewActive && event.target === outputText) {
            markdownOutput.innerHTML = marked.parse(outputText.value || '');
            markdownOutput.querySelectorAll('pre code').forEach(block => {
                if (typeof hljs !== 'undefined') {
                    hljs.highlightElement(block);
                }
            });
        }
    });

    // Save and load handlers
    saveBtn.addEventListener('click', () => {
        try {
            const transformData = {
                title: transformTitle.value || "Untitled Transformation",
                input: inputText.value || "",
                output: outputText.value || "",
                steps: getStepsData()
            };

            const jsonString = JSON.stringify(transformData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Generate default filename from the transform title
            const safeTitle = transformData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const defaultFilename = `lmtx-${safeTitle || 'llm_transform'}`;
            
            // Prompt user for filename
            const userFilename = prompt("Enter filename for saving (without extension):", defaultFilename);
            
            // If user cancels the prompt, abort the save
            if (userFilename === null) {
                URL.revokeObjectURL(url);
                return;
            }
            
            // Use user's filename or default if empty, and sanitize
            const finalFilename = (userFilename.trim() || defaultFilename).replace(/[^a-z0-9]/gi, '_').toLowerCase();

            const a = document.createElement('a');
            a.href = url;
            a.download = `${finalFilename}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setStatus('Transformation saved successfully!', 'success');

        } catch (error) {
            console.error("Error saving transformation:", error);
            setStatus(`Error saving file: ${error.message}`, 'error', 5000);
        }
    });

    loadBtn.addEventListener('click', () => {
        loadFile.click();
    });

    loadFile.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

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

            if (typeof loadedData !== 'object' || loadedData === null ||
                typeof loadedData.title === 'undefined' ||
                typeof loadedData.input === 'undefined' ||
                !Array.isArray(loadedData.steps))
            {
                setStatus('Error: Invalid file format. Missing required fields.', 'error', 5000);
                loadFile.value = null;
                return;
            }

            try {
                // Clear existing content
                stepsContainer.innerHTML = '';
                stepCounter = 0;

                transformTitle.value = loadedData.title || "";
                inputText.value = loadedData.input || "";
                outputText.value = loadedData.output || "";

                if (loadedData.steps.length === 0) {
                    addStep(); // Add default step if none exists
                } else {
                    loadedData.steps.forEach(step => {
                        addStep({
                            instructions: step.instructions || "",
                            model: step.model || "",
                            llmResponse: step.llmResponse || ""
                        });
                    });
                }

                setStatus(`Transformation loaded successfully with ${loadedData.steps.length} step(s).`, 'success');
            } catch (error) {
                console.error("Error populating page from loaded data:", error);
                setStatus(`Error applying loaded data: ${error.message}`, 'error', 5000);
            } finally {
                loadFile.value = null;
            }
        };

        reader.onerror = (e) => {
            console.error("Error reading file:", e);
            setStatus(`Error reading file: ${reader.error}`, 'error', 5000);
            loadFile.value = null;
        };

        reader.readAsText(file);
    });

    // Initialize the page
    resetToDefaultState();
});
