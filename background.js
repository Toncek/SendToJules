import { getSettings, getRecentRepos, getTrackedSessions, updateTrackedSessions, getSession, createSession, saveTrackedSession } from './api.js';

// --- Initialization & Context Menus ---
chrome.runtime.onInstalled.addListener(() => {
  buildContextMenu();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.recentRepos) {
    buildContextMenu();
  }
  if (area === 'local' && changes.trackedSessions) {
    managePollingAlarm(changes.trackedSessions.newValue);
  }
});

async function buildContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "jules-root",
      title: "Poslať do Jules",
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: "jules-open-dialog",
      parentId: "jules-root",
      title: "Otvoriť editor a vybrať repozitár...",
      contexts: ["selection"]
    });

    getRecentRepos().then(repos => {
      if (repos && repos.length > 0) {
        chrome.contextMenus.create({
          id: "jules-separator",
          parentId: "jules-root",
          type: "separator",
          contexts: ["selection"]
        });

        repos.slice(0, 3).forEach((repo, index) => {
          chrome.contextMenus.create({
            id: `jules-quick-${index}`,
            parentId: "jules-root",
            title: `⚡ Rýchlo poslať do: ${repo.replace('sources/github/', '')}`,
            contexts: ["selection"]
          });
        });
      }
    });
  });
}

// --- Smart Selection Extractor ---
function extractSelectionData() {
  const selection = window.getSelection();
  let text = selection.toString();

  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const isCode = container.nodeType === 1
      ? (container.closest('pre') || container.closest('code'))
      : (container.parentElement && (container.parentElement.closest('pre') || container.parentElement.closest('code')));

    if (isCode) {
      text = `\`\`\`\n${text}\n\`\`\``;
    }
  }

  const url = window.location.href;
  const title = document.title;
  let detectedRepo = null;
  let detectedBranch = null;

  const githubRegex = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/(?:tree|blob)\/([^\/]+)\/.*)?/;
  const match = url.match(githubRegex);
  if (match) {
    const owner = match[1];
    const repo = match[2];
    detectedRepo = `sources/github/${owner}/${repo}`;
    if (match[3]) detectedBranch = match[3];
  }

  return { text, url, title, detectedRepo, detectedBranch };
}

async function handleAction(tab, quickRepo = null) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractSelectionData
    });

    const data = result.result;
    if (!data || !data.text) return; // No selection

    if (quickRepo) {
      // Fast path: create session immediately
      const settings = await getSettings();
      const payload = {
        prompt: data.text,
        title: `Úloha z: ${data.title.substring(0, 30)}...`,
        source: quickRepo,
        branch: data.detectedBranch || settings.defaultBranch,
        requirePlanApproval: settings.requirePlanApproval,
        autoCreatePr: settings.autoCreatePr
      };

      try {
        const session = await createSession(settings.julesApiKey, payload);
        await saveTrackedSession(session);
        chrome.notifications.create(session.name, {
          type: 'basic',
          iconUrl: 'icon.png', // Assuming there's an icon or just fallback to default behavior if missing
          title: 'Jules',
          message: 'Session vytvorená, sledujem jej stav.'
        });
      } catch (err) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Chyba (Jules)',
          message: err.message
        });
      }
    } else {
      // Normal path: open popup
      const pendingTask = {
        selectionText: data.text,
        pageUrl: data.url,
        pageTitle: data.title,
        detectedRepo: data.detectedRepo,
        detectedBranch: data.detectedBranch,
        timestamp: Date.now()
      };

      await chrome.storage.local.set({ pendingTask });

      try {
        await chrome.action.openPopup();
      } catch (e) {
        chrome.windows.create({
          url: chrome.runtime.getURL("popup.html?mode=dialog"),
          type: "popup",
          width: 480,
          height: 640
        });
      }
    }
  } catch (error) {
    console.error("Error executing script:", error);
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "jules-open-dialog") {
    handleAction(tab);
  } else if (info.menuItemId.startsWith("jules-quick-")) {
    const index = parseInt(info.menuItemId.replace("jules-quick-", ""));
    const repos = await getRecentRepos();
    if (repos[index]) {
      handleAction(tab, repos[index]);
    }
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "send-selection-to-jules") {
    handleAction(tab);
  }
});

// --- Polling & Notifications ---
async function managePollingAlarm(sessions = null) {
  if (!sessions) sessions = await getTrackedSessions();
  const activeSessions = sessions.filter(s => !['COMPLETED', 'FAILED'].includes(s.state));

  if (activeSessions.length > 0) {
    chrome.alarms.create("jules-session-poller", { periodInMinutes: 1 });
  } else {
    chrome.alarms.clear("jules-session-poller");
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "jules-session-poller") {
    const settings = await getSettings();
    if (!settings.julesApiKey || !settings.enableNotifications) return;

    let sessions = await getTrackedSessions();
    let updated = false;

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (['COMPLETED', 'FAILED'].includes(s.state)) continue;

      try {
        const freshSession = await getSession(settings.julesApiKey, s.name);

        // State transition detection
        if (s.state !== freshSession.state) {
          if (freshSession.state === 'AWAITING_PLAN_APPROVAL') {
            chrome.notifications.create(freshSession.name, {
              type: 'basic',
              iconUrl: 'icon.png', // Fallback if missing
              title: 'Jules čaká na schválenie plánu',
              message: freshSession.title || 'Kliknite pre zobrazenie detailov.'
            });
          } else if (freshSession.state === 'COMPLETED' || freshSession.state === 'FAILED') {
            chrome.notifications.create(freshSession.name, {
              type: 'basic',
              iconUrl: 'icon.png',
              title: `Jules Session ${freshSession.state === 'COMPLETED' ? 'dokončená' : 'zlyhala'}`,
              message: freshSession.title || 'Kliknite pre zobrazenie detailov.'
            });
          }
          sessions[i] = freshSession;
          updated = true;
        }
      } catch (e) {
        console.error("Failed to poll session:", s.name, e);
      }
    }

    if (updated) {
      await updateTrackedSessions(sessions);
    }
  }
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
  // notificationId is the sessionName
  const sessions = await getTrackedSessions();
  const s = sessions.find(x => x.name === notificationId);
  if (s && s.url) {
    chrome.tabs.create({ url: s.url });
  }
  chrome.notifications.clear(notificationId);
});

// Trigger initial setup
managePollingAlarm();
