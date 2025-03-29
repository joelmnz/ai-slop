/**
 * Model Selector Popup Component
 * Provides a reusable UI for selecting models from a list
 */
class ModelSelector {
    constructor(options = {}) {
        this.options = {
            onModelSelect: null,
            container: document.body,
            ...options
        };
        
        this.popup = null;
        this.currentInput = null;
        this.models = [];
    }

    /**
     * Initialize the model selector popup
     */
    initialize() {
        if (this.popup) return this.popup;
        
        // Create popup container
        this.popup = document.createElement('div');
        this.popup.className = 'model-selector-popup';
        this.popup.style.display = 'none';
        
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
        this.popup.appendChild(searchContainer);
        
        // Add models list container
        const modelsListContainer = document.createElement('div');
        modelsListContainer.className = 'models-list-container';
        this.popup.appendChild(modelsListContainer);
        
        // Add event listeners
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            this.updateModelsList(searchTerm);
        });
        
        // Add clear button event listener
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.focus();
            this.updateModelsList('');
        });
        
        closeButton.addEventListener('click', () => {
            this.hide();
        });
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (this.popup && this.popup.style.display !== 'none') {
                // Check if click is outside the popup
                if (!this.popup.contains(e.target) && 
                    !e.target.classList.contains('model-lookup-btn') &&
                    !e.target.closest('.model-lookup-btn')) {
                    this.hide();
                }
            }
        });
        
        // Add to container
        this.options.container.appendChild(this.popup);
        return this.popup;
    }

    /**
     * Set available models
     * @param {Array} models Array of model objects with {id, name, contextLength, pricing} properties
     */
    setModels(models) {
        this.models = models || [];
    }

    /**
     * Show the model selector popup
     * @param {HTMLElement} inputElement Input element to populate with selected model
     * @param {Function} callback Optional callback function to run when model is selected
     */
    show(inputElement, callback = null) {
        // Store reference to the input field
        this.currentInput = inputElement;
        
        if (callback) {
            this.options.onModelSelect = callback;
        }
        
        // Create popup if it doesn't exist
        const popup = this.initialize();
        
        // Show popup
        popup.style.display = 'flex';
        
        // Update models list with any existing filter value
        const searchInput = popup.querySelector('.model-search-input');
        searchInput.value = inputElement.value; // Set search to current input value
        this.updateModelsList(searchInput.value.toLowerCase());
        
        // Focus search input
        setTimeout(() => {
            searchInput.focus();
        }, 100);
    }

    /**
     * Hide the model selector popup
     */
    hide() {
        if (this.popup) {
            this.popup.style.display = 'none';
            this.currentInput = null;
        }
    }

    /**
     * Update the models list based on search term
     * @param {string} searchTerm Search term to filter models by
     */
    updateModelsList(searchTerm = '') {
        if (!this.popup) return;
        
        const modelsListContainer = this.popup.querySelector('.models-list-container');
        modelsListContainer.innerHTML = '';
        
        // Filter models by search term
        const filteredModels = this.models.filter(model => {
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
            if (this.currentInput && this.currentInput.value === model.id) {
                modelItem.classList.add('selected');
            }
            
            // Add click handler
            modelItem.addEventListener('click', () => {
                if (this.currentInput) {
                    this.currentInput.value = model.id; // Set the ID as the value
                    // Trigger input event to update run button state
                    this.currentInput.dispatchEvent(new Event('input'));
                }
                
                // Call the callback if provided
                if (typeof this.options.onModelSelect === 'function') {
                    this.options.onModelSelect(model);
                }
                
                this.hide();
            });
            
            modelsList.appendChild(modelItem);
        });
        
        modelsListContainer.appendChild(modelsList);
    }

    /**
     * Show loading indicator in the models list
     * @param {string} message Message to display
     */
    showLoading(message = 'Loading models...') {
        if (!this.popup) this.initialize();
        
        const modelsListContainer = this.popup.querySelector('.models-list-container');
        modelsListContainer.innerHTML = `<div class="loading-models">${message}</div>`;
    }
}

// Export the ModelSelector class
export default ModelSelector;