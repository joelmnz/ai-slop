document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const newBtn = document.getElementById('newBtn');
    const saveBtn = document.getElementById('saveBtn');
    const loadBtn = document.getElementById('loadBtn');
    const loadFile = document.getElementById('loadFile');
    const transformBtn = document.getElementById('transformBtn');
    const toggleMarkdownBtn = document.getElementById('toggleMarkdownBtn');
    const transformTitle = document.getElementById('transformTitle');
    const transformInstructions = document.getElementById('transformInstructions');
    const instructionsMarkdown = document.getElementById('instructionsMarkdown');
    const inputText = document.getElementById('inputText');
    const transformRules = document.getElementById('transformRules');
    const outputText = document.getElementById('outputText');
    const modelSelect = document.getElementById('modelSelect');
    const copyBtn = document.getElementById('copyBtn');
    const toastContainer = document.getElementById('toastContainer');
    const metaToggle = document.getElementById('metaToggle');
    const comparisonMeta = document.querySelector('.comparison-meta');

    // --- State ---
    let markdownViewActive = false;

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

    // Toggle Markdown View Function
    function toggleMarkdownView() {
        markdownViewActive = !markdownViewActive;
        
        // Update all textareas and markdown views
        document.querySelectorAll('.column').forEach(column => {
            const textarea = column.querySelector('.llm-response-textarea');
            const markdownView = column.querySelector('.markdown-view');
            
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
        
        // Handle instructions markdown
        if (markdownViewActive) {
            instructionsMarkdown.innerHTML = marked.parse(transformInstructions.value || '');
            instructionsMarkdown.querySelectorAll('pre code').forEach(block => {
                if (typeof hljs !== 'undefined') {
                    hljs.highlightElement(block);
                }
            });
            
            transformInstructions.style.display = 'none';
            instructionsMarkdown.style.display = 'block';
        } else {
            transformInstructions.style.display = 'block';
            instructionsMarkdown.style.display = 'none';
        }
        
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
        transformInstructions.value = '';
        inputText.value = '';
        transformRules.value = '';
        outputText.value = '';
        modelSelect.selectedIndex = 0;
        
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

    // Placeholder for transform function
    function transformText() {
        // This would normally call an API or process the text
        // For demonstration, just copy input to output with a prefix
        const model = modelSelect.value;
        outputText.value = `[${model} transformed]: ${inputText.value}`;
        
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
            } else if (event.target === transformInstructions) {
                instructionsMarkdown.innerHTML = marked.parse(transformInstructions.value || '');
                instructionsMarkdown.querySelectorAll('pre code').forEach(block => {
                    if (typeof hljs !== 'undefined') {
                        hljs.highlightElement(block);
                    }
                });
            }
        }
    });

    // Toggle metadata section
    metaToggle.addEventListener('click', () => {
        comparisonMeta.classList.toggle('collapsed');
        
        if (comparisonMeta.classList.contains('collapsed')) {
            setStatus('Metadata collapsed', 'info', 2000);
        } else {
            setStatus('Metadata expanded', 'info', 2000);
        }
    });

    // Initialize the page
    resetToDefaultState();
});
