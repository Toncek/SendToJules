chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "send-to-jules",
    title: "Poslať do Jules",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "send-to-jules") {
    const pendingTask = {
      selectionText: info.selectionText,
      pageUrl: tab.url,
      pageTitle: tab.title,
      timestamp: Date.now()
    };

    // Save task to storage
    await new Promise(resolve => {
      chrome.storage.local.set({ pendingTask }, resolve);
    });

    try {
      // First attempt to open the extension popup natively
      await chrome.action.openPopup();
    } catch (error) {
      // Fallback for browsers/contexts that don't support programmatic openPopup (like Brave often)
      console.warn("chrome.action.openPopup() failed, falling back to window:", error);
      chrome.windows.create({
        url: chrome.runtime.getURL("popup.html?mode=dialog"),
        type: "popup",
        width: 460,
        height: 600
      });
    }
  }
});
