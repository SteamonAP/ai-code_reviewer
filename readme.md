# Code Review Tool

A simple React app that lets users write JavaScript code, get an AI-generated code review, and view the review in a markdown format. The code editor highlights syntax using **Prism.js**, and reviews are rendered using **React Markdown** with **highlighting** via **rehype-highlight**.

## Features
- **Code Editor**: Write JavaScript code with syntax highlighting.
- **Code Review**: Submit your code to a backend for review.
- **Markdown Rendering**: See the review rendered as markdown with code snippets highlighted.

## Tech Stack
- **Frontend**: React, Prism.js, react-simple-code-editor, react-markdown
- **Styling**: Custom CSS, Prism.js, Highlight.js GitHub Dark theme
- **Backend**: Node.js (Assumed, for reviewing code via API)

## Setup

### Prerequisites
1. Install Node.js (version 14 or higher).
2. Clone the repository:
    ```bash
    git clone https://github.com/SteamonAP/ai-code_reviewer.git
    cd your-repository-name
    ```

3. Install dependencies:
    ```bash
    npm install
    ```

4. Start the development server:
    ```bash
    npm start
    ```

### Backend
Make sure your backend server is running (locally on `http://localhost:3000`) with the route `POST /ai/get-review` to handle the AI code review.

### Environment Variables
Ensure the `.env` file is set up with the correct configurations if required (for API URLs, keys, etc.).

## Usage
- Open the app in your browser.
- Write or paste your JavaScript code in the editor.
- Click on the "Review" button to submit your code for review.
- See the AI-generated review rendered in markdown on the right side.