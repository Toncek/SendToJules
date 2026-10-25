# Send to Jules — AI Coding Assistant Launcher

An advanced, zero-build Chrome & Brave extension (Manifest V3) for integrating browser workflows with the Google Jules REST API.

## Features
* **Send Selected Text:** Easily send highlighted text from any webpage directly to Jules.
* **Smart GitHub Detection:** Automatically detects GitHub repositories from the URL.
* **Formatting Preservation:** Highlighted code inside `<pre>` or `<code>` tags is automatically wrapped in Markdown syntax.
* **Quick Shortcuts:** Send code to one of your recent repositories with a single click from the context menu.
* **Session Tracking:** Monitor active sessions and approve plans directly from the extension.
* **Notifications:** Desktop alerts for session status changes (e.g., plan approval needed, session completed).
* **Keyboard Shortcut:** Quickly send text by pressing `Alt+Shift+J`.

## Installation

### From Chrome Web Store
*(Link coming soon)*

### Manual Installation (Load Unpacked)
1. Download or clone this repository.
2. Open your browser:
   - **Chrome**: Go to `chrome://extensions`
   - **Brave**: Go to `brave://extensions`
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the folder containing the cloned project.

## Setup
1. Click the extension icon to open it, or right-click the extension icon and select **"Options"** (Settings).
2. Enter your Jules API Key (`X-Goog-Api-Key`).
3. Click "Test Connection & Sync Repositories" to verify and load your repositories.
4. Customize your default branch and create custom prompt presets as needed.

## Usage
* Highlight text on any page and press `Alt+Shift+J` (or use the "Send to Jules" context menu).
* A popup will open allowing you to edit the text, select a repository, and use preset prompts.
* Track the status of your tasks in the "Active Sessions" tab.

## Privacy
Please read our [Privacy Policy](PRIVACY_POLICY.md) for details on how this extension handles your data.
