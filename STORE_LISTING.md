# Chrome Web Store Listing Texts

## Summary (Short Description)
Send code and tasks directly from your browser to Google Jules. Easily manage active coding sessions and repositories.

## Detailed Description
**Send to Jules — AI Coding Assistant Launcher**

Supercharge your coding workflow with the "Send to Jules" browser extension. Built for both Google Chrome and Brave, this zero-build Manifest V3 extension seamlessly integrates your browser with the Google Jules REST API.

**Features:**
* **Quick Send:** Easily send selected text or code snippets from any webpage directly to Jules via the context menu or keyboard shortcut (`Alt+Shift+J`).
* **Smart GitHub Detection:** Automatically detects GitHub repositories and branches from the URL you are browsing, linking your tasks to the right context.
* **Session Management:** Monitor the status of your active Jules coding sessions and approve plans directly from the extension popup.
* **Custom Presets:** Create and manage custom instruction presets for recurring tasks.
* **Desktop Notifications:** Stay updated with real-time desktop notifications when a session completes or requires plan approval.

**Setup Instructions:**
1. Install the extension.
2. Click on the extension icon and open Settings.
3. Enter your Jules API Key (`X-Goog-Api-Key`).
4. Click "Test Connection & Sync Repositories" to fetch your available repositories.
5. Highlight code on any page, right-click, and select "Send to Jules"!

**Compatibility:**
Fully supported on Google Chrome and Brave.

**Privacy First:**
Your API key and preferences are stored securely on your local device. The extension only reads webpage content when explicitly invoked by you, sending it directly to Google Jules without any intermediary servers or telemetry.

## Single Purpose Statement
The single purpose of "Send to Jules" is to provide a seamless interface for users to send selected text, code snippets, and tasks from their browser directly to the Google Jules AI coding assistant API, and to manage the resulting coding sessions.

## Permission Justifications

* **`contextMenus`:** Required to add the "Send to Jules" option to the right-click menu, allowing users to quickly send highlighted text.
* **`storage`:** Required to securely store the user's `X-Goog-Api-Key`, recent repositories, custom instruction presets, and tracked sessions locally on the device (`chrome.storage.local`).
* **`activeTab`:** Required to read the URL, title, and explicitly selected text of the current tab when the user invokes the extension (via shortcut or context menu), in order to send this context to Jules.
* **`scripting`:** Required to inject a small script into the active tab to extract the currently highlighted text/code (and check for `<pre>`/`<code>` formatting) when the user clicks the context menu item or uses the keyboard shortcut.
* **`notifications`:** Required to alert the user with desktop notifications when a Jules coding session completes, fails, or requires explicit plan approval.
* **`alarms`:** Required to periodically poll the Google Jules API (every 1 minute) in the background to check the status of active coding sessions and trigger notifications on state changes.
* **`https://jules.googleapis.com/*` (Host Permission):** Required to communicate directly with the Google Jules REST API to fetch repositories, create sessions, and approve plans.
