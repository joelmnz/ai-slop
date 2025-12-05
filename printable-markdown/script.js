document.addEventListener('DOMContentLoaded', function() {
    const markdownInput = document.getElementById('markdown-input');
    const markdownOutput = document.getElementById('markdown-output');
    const printBtn = document.getElementById('print-btn');
    const clearBtn = document.getElementById('clear-btn');
    const sampleBtn = document.getElementById('sample-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const container = document.querySelector('.container');

    // Initialize highlight.js here instead
    if (typeof hljs !== 'undefined') {
        hljs.initHighlightingOnLoad();
    }

    // Configure marked options
    marked.setOptions({
        highlight: function(code, lang) {
            if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, {
                    language: lang
                }).value;
            }
            return typeof hljs !== 'undefined' ? hljs.highlightAuto(code).value : code;
        },
        breaks: true,
        gfm: true
    });

    // Function to render markdown
    function renderMarkdown() {
        const markdown = markdownInput.value;
        markdownOutput.innerHTML = marked.parse(markdown);
        renderMermaidDiagrams();
    }

    // Function to render mermaid diagrams
    function renderMermaidDiagrams() {
        const mermaidElements = document.querySelectorAll('.language-mermaid');
        mermaidElements.forEach((element) => {
            const code = element.textContent;
            const container = document.createElement('div');
            container.classList.add('mermaid');
            container.innerHTML = code;
            element.parentNode.replaceChild(container, element);
            mermaid.init(undefined, container);
        });
    }

    // Event listeners
    markdownInput.addEventListener('input', renderMarkdown);

    printBtn.addEventListener('click', function() {
        window.print();
    });

    clearBtn.addEventListener('click', function() {
        markdownInput.value = '';
        renderMarkdown();
    });

    sampleBtn.addEventListener('click', function() {
        markdownInput.value = `# Markdown to A4 Print Viewer

## Introduction

This is a sample document to demonstrate the capabilities of the Markdown to A4 Print Viewer. This tool allows you to:

- Write or paste markdown text
- Preview it in A4 format
- Print it directly from your browser

## Formatting Examples

### Text Styling

You can use **bold text**, *italic text*, or ***bold and italic text***.

### Lists

#### Ordered List
1. First item
2. Second item
3. Third item

#### Unordered List
- Item one
- Item two
- Item three

### Code Blocks

Inline code: \`const greeting = "Hello, world!";\`

Code block with syntax highlighting:

\`\`\`javascript
function calculateSum(a, b) {
    return a + b;
}

// Call the function
const result = calculateSum(5, 10);
console.log(result); // 15
\`\`\`

### Blockquotes

> This is a blockquote.
>
> It can span multiple lines.

### Tables

| Name | Age | Occupation |
|------|-----|------------|
| John | 32  | Developer  |
| Jane | 28  | Designer   |
| Bob  | 45  | Manager    |

### Horizontal Rule

---

## Print Instructions

1. Review your document in the preview pane
2. Click the "Print Document" button
3. Configure your printer settings in the browser dialog
4. Print your document

The printed version will only include the A4 paper content, not the editor interface.`;
        renderMarkdown();
    });

    maximizeBtn.addEventListener('click', function() {
        const isMaximized = container.classList.contains('maximized');

        if (isMaximized) {
            // Restore to normal view
            container.classList.remove('maximized');
            maximizeBtn.innerHTML = '<i class="fas fa-expand"></i><span>Maximize</span>';
        } else {
            // Maximize the preview
            container.classList.add('maximized');
            maximizeBtn.innerHTML = '<i class="fas fa-compress"></i><span>Minimize</span>';
        }
    });

    // Initial render if there's content (e.g., from browser cache)
    if (markdownInput.value) {
        renderMarkdown();
    }
});