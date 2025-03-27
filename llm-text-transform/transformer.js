document.addEventListener('DOMContentLoaded', async () => {
    // Try to dynamically import the callOpenAI function
    let callOpenAI;
    try {
        const module = await import('../js/llm.js');
        callOpenAI = module.callOpenAI;
    } catch (error) {
        console.error('Error importing llm.js:', error);
        // Create fallback if import fails
        callOpenAI = async (prompt, model, maxTokens, textContext, settings) => {
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
    const stepsContainer = document.getElementById('stepsContainer');
    const addStepBtn = document.getElementById('addStepBtn');
    const copyBtn = document.getElementById('copyBtn');
    const toastContainer = document.getElementById('toastContainer');
    const comparisonMeta = document.querySelector('.comparison-meta');
    const settingsBtn = document.getElementById('settings-button');

    // --- State ---
    let markdownViewActive = false;
    let stepCounter = 0;
    let isTransforming = false;
    let cancelTransformation = false;

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

    // --- LLM API Function ---
    async function callLLMAPI(prompt, model, inputText) {
        try {
            // Get cached settings
            const settings = await getApiSettings();
            
            // Format the prompt correctly
            const formattedPrompt = prompt; // nothing yet
            
            // Call the imported callOpenAI function with our cached settings
            // Note: Settings are now required, not optional
            return await callOpenAI(formattedPrompt, model, 8000, inputText, settings);
        } catch (error) {
            console.error('LLM API call error:', error);
            throw error;
        }
    }

    // --- Templates ---
    const templates = {
        step: (id, data = null) => ({
            type: 'div',
            classes: ['transform-step'],
            attributes: { id: `step${id}`, 'data-step-id': id },
            children: [
                {
                    type: 'div',
                    classes: ['step-number'],
                    text: id
                },
                {
                    type: 'div',
                    classes: ['llm-response-icon'],
                    attributes: {
                        'data-step-id': id,
                        'title': 'View LLM Response',
                        'style': data?.llmResponse ? 'display: block;' : 'display: none;'
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
                            classes: ['remove-step-btn'],
                            attributes: { 'data-step-id': id },
                            html: '<i class="fas fa-trash"></i> Remove'
                        },
                        {
                            type: 'button',
                            classes: ['run-step-btn'],
                            attributes: { 'data-step-id': id },
                            html: '<i class="fas fa-play"></i> Run Step'
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
        const newStep = createStep(data);
        stepsContainer.appendChild(newStep);
        updateStepNumbers();
        return newStep;
    }

    // Update step numbers
    function updateStepNumbers() {
        const steps = stepsContainer.querySelectorAll('.transform-step');
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.querySelector('.step-number').textContent = stepNumber;
            step.querySelector('.step-instructions-label').textContent = `Step ${stepNumber} Instructions:`;
        });
    }

    // Toggle Markdown View Function
    function toggleMarkdownView() {
        markdownViewActive = !markdownViewActive;
        
        // Update all textareas and markdown views
        document.querySelectorAll('.column').forEach(column => {
            const textarea = column.querySelector('.llm-response-textarea');
            if (!textarea) return;
            
            const markdownView = column.querySelector('.markdown-view');
            if (!markdownView) return;
            
            if (markdownViewActive) {
                markdownView.innerHTML = marked.parse(textarea.value || '');
                markdownView.querySelectorAll('pre code').forEach(block => {
                    if (typeof hljs !== 'undefined') {
                        hljs.highlightElement(block);
                    }
                });
                
                textarea.style.display = 'none';
                markdownView.style.display = 'block';
            } else {
                textarea.style.display = 'block';
                markdownView.style.display = 'none';
            }
        });
        
        // Update button text and icon
        if (markdownViewActive) {
            toggleMarkdownBtn.innerHTML = '<i class="fas fa-font"></i> Show Raw Text';
        } else {
            toggleMarkdownBtn.innerHTML = '<i class="fas fa-code"></i> Toggle Markdown';
        }
        
        setStatus(markdownViewActive ? 'Showing rendered markdown' : 'Showing raw text', 'info');
    }

    // Reset Function
    function resetToDefaultState() {
        transformTitle.value = '';
        inputText.value = '';
        outputText.value = '';
        
        // Clear existing steps
        stepsContainer.innerHTML = '';
        stepCounter = 0;
        
        // Add default first step
        addStep();
        
        // Reset markdown views
        document.querySelectorAll('.markdown-view').forEach(view => {
            view.innerHTML = '';
            view.style.display = 'none';
        });
        
        // Reset textareas display
        document.querySelectorAll('.llm-response-textarea').forEach(textarea => {
            textarea.style.display = 'block';
        });
        
        markdownViewActive = false;
        toggleMarkdownBtn.innerHTML = '<i class="fas fa-code"></i> Toggle Markdown';
        
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
            
            // Determine the input based on position in the transformation pipeline
            let input;
            if (isFirstStep) {
                // First step in sequence always uses the input text textarea
                input = inputText.value;
            } else {
                // Other steps use previous step's LLM response
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
                
                input = previousResponse;
            }
            
            // Input validation
            if (!instructions) {
                setStatus('Instructions cannot be empty', 'error');
                return;
            }
            
            if (!model) {
                setStatus('Model cannot be empty', 'error');
                return;
            }
            
            if (!input.trim()) {
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
            const originalButtonText = runButton.innerHTML;
            runButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            runButton.disabled = true;
            
            // Call the LLM API function
            const response = await callLLMAPI(instructions, model, input);
            
            // Store the response in the hidden field
            const hiddenResponseField = step.querySelector('.hidden-llm-response');
            hiddenResponseField.value = response;
            
            // Show the response icon
            const responseIcon = step.querySelector('.llm-response-icon');
            responseIcon.style.display = 'block';
            
            // Update the output text area
            outputText.value = response;
            
            // If markdown view is active, update the output markdown view
            if (markdownViewActive) {
                const outputMarkdownView = document.querySelector('#outputColumn .markdown-view');
                outputMarkdownView.innerHTML = marked.parse(outputText.value);
                outputMarkdownView.querySelectorAll('pre code').forEach(block => {
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
                runButton.innerHTML = '<i class="fas fa-play"></i> Run Step';
                runButton.disabled = false;
            }
        }
    }

    // Show LLM response popup
    function showResponsePopup(responseText) {
        // Check if popup already exists, if not create it
        let popupOverlay = document.getElementById('responsePopupOverlay');
        if (!popupOverlay) {
            const popupTemplate = templates.responsePopup();
            popupOverlay = renderTemplate(popupTemplate);
            document.body.appendChild(popupOverlay);
            
            // Add event listener to close button
            const closeBtn = popupOverlay.querySelector('.close-popup-btn');
            closeBtn.addEventListener('click', () => {
                popupOverlay.style.display = 'none';
            });
            
            // Add event listener to close on overlay click
            popupOverlay.addEventListener('click', (event) => {
                if (event.target === popupOverlay) {
                    popupOverlay.style.display = 'none';
                }
            });
        }
        
        // Set content and show popup
        const responseContent = document.getElementById('responseContent');
        responseContent.textContent = responseText;
        popupOverlay.style.display = 'flex';
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

            let currentInput = inputText.value;
            
            // Process each step in sequence
            for (let i = 0; i < steps.length; i++) {
                // Check if cancellation was requested
                if (cancelTransformation) {
                    setStatus('Transformation cancelled', 'info');
                    break;
                }

                const step = steps[i];
                const stepId = step.getAttribute('data-step-id');
                
                // Update progress indicator
                currentStepNum.textContent = i + 1;
                
                // Highlight current step
                steps.forEach(s => s.classList.remove('active-step'));
                step.classList.add('active-step');
                
                // Extract step details
                const instructions = step.querySelector('.step-instructions').value.trim();
                const model = step.querySelector('.step-model-input').value.trim();
                
                // Skip steps with missing data
                if (!instructions || !model) {
                    setStatus(`Skipping step ${i+1} due to missing instructions or model`, 'error', 3000);
                    continue;
                }
                
                try {
                    // Update the button to show processing
                    const runButton = step.querySelector('.run-step-btn');
                    runButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                    
                    // Process the step
                    const response = await callLLMAPI(instructions, model, currentInput);
                    
                    // Store the response in the hidden field
                    const hiddenResponseField = step.querySelector('.hidden-llm-response');
                    hiddenResponseField.value = response;
                    
                    // Show the response icon
                    const responseIcon = step.querySelector('.llm-response-icon');
                    responseIcon.style.display = 'block';
                    
                    // Use this response as input for the next step
                    currentInput = response;
                    
                    // Update output area with the latest result
                    outputText.value = response;
                    
                    // If markdown view is active, update the output markdown view
                    if (markdownViewActive) {
                        const outputMarkdownView = document.querySelector('#outputColumn .markdown-view');
                        outputMarkdownView.innerHTML = marked.parse(response);
                        outputMarkdownView.querySelectorAll('pre code').forEach(block => {
                            if (typeof hljs !== 'undefined') {
                                hljs.highlightElement(block);
                            }
                        });
                    }
                    
                    setStatus(`Step ${i+1} completed`, 'success', 2000);
                } catch (error) {
                    console.error(`Error in step ${i+1}:`, error);
                    setStatus(`Error in step ${i+1}: ${error.message}`, 'error', 5000);
                    break; // Stop processing on error
                } finally {
                    // Reset step button
                    const runButton = step.querySelector('.run-step-btn');
                    runButton.innerHTML = '<i class="fas fa-play"></i> Run Step';
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
                    showResponsePopup(responseText);
                } else {
                    setStatus('No LLM response available for this step', 'info');
                }
            }
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
    
    // Settings button
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (typeof window.aiSettings !== 'undefined') {
                // Reset API settings cache when opening settings
                apiSettings = null;
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
            const defaultFilename = `${safeTitle || 'llm_transform'}`;
            
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
