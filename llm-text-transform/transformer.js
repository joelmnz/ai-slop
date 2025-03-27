document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const newBtn = document.getElementById('newBtn');
    const saveBtn = document.getElementById('saveBtn');
    const loadBtn = document.getElementById('loadBtn');
    const loadFile = document.getElementById('loadFile');
    const transformBtn = document.getElementById('transformBtn');
    const toggleMarkdownBtn = document.getElementById('toggleMarkdownBtn');
    const transformTitle = document.getElementById('transformTitle');
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const stepsContainer = document.getElementById('stepsContainer');
    const addStepBtn = document.getElementById('addStepBtn');
    const copyBtn = document.getElementById('copyBtn');
    const toastContainer = document.getElementById('toastContainer');
    const comparisonMeta = document.querySelector('.comparison-meta');

    // --- State ---
    let markdownViewActive = false;
    let stepCounter = 0;

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
                    classes: ['step-number'],
                    text: id
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
                                value: data?.model || 'gpt-4o-mini'
                            }
                        },
                        {
                            type: 'button',
                            classes: ['remove-step-btn'],
                            attributes: { 'data-step-id': id },
                            html: '<i class="fas fa-trash"></i> Remove'
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
        return renderTemplate(stepTemplate);
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
            
            steps.push({
                stepNumber: index + 1,
                instructions,
                model
            });
        });
        return steps;
    }

    // Placeholder for transform function
    function transformText() {
        // This would normally call an API or process the text
        // For demonstration, just copy input to output with step info
        const steps = getStepsData();
        let output = `Input Text: ${inputText.value}\n\n`;
        
        steps.forEach((step, index) => {
            output += `Step ${index + 1} [${step.model}]: ${step.instructions}\n`;
        });
        
        output += `\nTransformed Output: ${inputText.value}`;
        outputText.value = output;
        
        // If markdown is active, update the output markdown view
        if (markdownViewActive) {
            const outputMarkdownView = document.querySelector('#outputColumn .markdown-view');
            outputMarkdownView.innerHTML = marked.parse(outputText.value);
            outputMarkdownView.querySelectorAll('pre code').forEach(block => {
                if (typeof hljs !== 'undefined') {
                    hljs.highlightElement(block);
                }
            });
        }
        
        setStatus('Text transformed successfully!', 'success');
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

    // Remove step button (using event delegation)
    stepsContainer.addEventListener('click', (event) => {
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

    transformBtn.addEventListener('click', transformText);
    
    copyBtn.addEventListener('click', copyToClipboard);
    
    toggleMarkdownBtn.addEventListener('click', toggleMarkdownView);
    
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
                            model: step.model || "gpt-4o"
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
