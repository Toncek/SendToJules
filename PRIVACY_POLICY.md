# Privacy Policy

**Last Updated:** October 2023

## Data Handling and Privacy

"Send to Jules" is a browser extension designed to integrate your browser workflows with the Google Jules REST API. We are committed to protecting your privacy. This privacy policy explains how we handle your data.

### 1. Data Collection and Storage
* **API Keys:** The extension securely stores your provided `X-Goog-Api-Key` and user preferences locally on your device using the `chrome.storage.local` API. This data never leaves your browser unless sent directly to the Google Jules API.
* **Webpage Text and Content:** The extension only reads text from active web pages upon explicit user invocation (e.g., clicking the context menu item or using the keyboard shortcut).

### 2. Data Transmission
* When you choose to send selected text to Jules, the extension transmits this data directly from your browser to the Google Jules API endpoint (`https://jules.googleapis.com/v1alpha`).
* The extension does not route your data through any intermediary servers. All communications are done securely via HTTPS.

### 3. Analytics and Telemetry
* This extension does **not** collect, store, or transmit any analytics, telemetry, or user tracking data.
* There are no third-party servers collecting your usage data.

### 4. Third-Party Access
* Your data is only shared with the Google Jules API as part of the core functionality of this extension. We do not sell, trade, or otherwise transfer your data to outside parties.

## Contact
If you have any questions about this Privacy Policy, please open an issue in the extension's GitHub repository.
