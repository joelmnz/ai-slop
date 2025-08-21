# AI Agent Instructions for `ai-slop` Repository

Welcome, AI agent! This document will guide you on how to work with the `ai-slop` repository.

## Repository Overview

This repository is a collection of small, independent, front-end web-based tools. Each tool is designed to perform a specific task and is self-contained within its own directory. The tools are built with HTML, CSS, and JavaScript.

## Directory Structure

The repository is organized as follows:

- **`/` (root):** The root directory contains this `AGENTS.md` file, a `README.md`, and other top-level configuration files.
- **`/<tool-name>/`:** Each tool has its own dedicated subdirectory. For example, the `llm-compare` tool is located in the `/llm-compare/` directory. Each tool's directory contains its own `index.html`, `styles.css`, and `script.js` files.
- **`/css/`:** This directory contains shared CSS files that are used by multiple tools. This helps to maintain a consistent look and feel across the different tools.
- **`/js/`:** This directory contains shared JavaScript files that can be used by multiple tools. This allows for code reuse and simplifies the development of new tools.

When working on a specific tool, you should primarily focus on the files within its subdirectory. If you need to make changes to shared functionality, you should modify the files in the `/css/` or `/js/` directories.

## Running the Tools

To run the tools locally, you can use a simple Python web server. Follow these steps:

1.  Open your terminal.
2.  Navigate to the root directory of this repository.
3.  Run the following command:

    ```sh
    python3 -m http.server 8000
    ```

4.  Open your web browser and go to `http://localhost:8000`. You will see a list of the files and directories in the repository. Click on a tool's directory to access its `index.html` file.

## Adding a New Tool

To add a new tool to this repository, follow these steps:

1.  Create a new subdirectory in the root of the repository. The name of the subdirectory should be the name of your tool (e.g., `/my-new-tool/`).
2.  Inside the new subdirectory, create an `index.html` file. This will be the main entry point for your tool.
3.  You can also create `styles.css` and `script.js` files within the tool's subdirectory for its specific styles and functionality.
4.  If your tool can use the shared styles or scripts, you can link to them from your `index.html` file using a relative path (e.g., `../css/settings.css`).
5.  Update the root `index.html` to link to your new tool.

## AI-Assisted Development

As mentioned in the `README.md`, you are encouraged to use AI-powered tools to assist with development. This can help to speed up the process of creating new tools and improving existing ones.
