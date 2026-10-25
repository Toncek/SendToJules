export const DEFAULT_SETTINGS = {
  julesApiKey: '',
  defaultBranch: 'main',
  requirePlanApproval: true,
  autoCreatePr: false,
  enableNotifications: true,
  customPresets: [
    "🛠️ Oprav bug / stack trace",
    "✨ Implementuj funkciu",
    "🧹 Refaktoruj a pridaj testy",
    "📄 Dodrž AGENTS.md špecifikáciu"
  ]
};

// --- Storage Helpers ---

export async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      resolve({ ...DEFAULT_SETTINGS, ...(result.settings || {}) });
    });
  });
}

export async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ settings }, resolve);
  });
}

export async function getRecentRepos() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['recentRepos'], (result) => {
      resolve(result.recentRepos || []);
    });
  });
}

export async function addRecentRepo(sourceName) {
  const repos = await getRecentRepos();
  const updatedRepos = [sourceName, ...repos.filter(r => r !== sourceName)].slice(0, 5);
  return new Promise((resolve) => {
    chrome.storage.local.set({ recentRepos: updatedRepos }, () => {
      resolve(updatedRepos);
    });
  });
}

export async function getTrackedSessions() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['trackedSessions'], (result) => {
      resolve(result.trackedSessions || []);
    });
  });
}

export async function saveTrackedSession(session) {
  const sessions = await getTrackedSessions();
  const index = sessions.findIndex(s => s.name === session.name);
  if (index !== -1) {
    sessions[index] = session;
  } else {
    sessions.push(session);
  }
  return new Promise((resolve) => {
    chrome.storage.local.set({ trackedSessions: sessions }, resolve);
  });
}

export async function updateTrackedSessions(sessions) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ trackedSessions: sessions }, resolve);
  });
}

export async function getCachedSources() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['cachedSources'], (result) => {
      resolve(result.cachedSources ? result.cachedSources.data : null);
    });
  });
}

export async function setCachedSources(sources) {
  return new Promise((resolve) => {
    chrome.storage.local.set({
      cachedSources: { data: sources, timestamp: Date.now() }
    }, resolve);
  });
}


// --- API Methods ---
const API_BASE_URL = 'https://jules.googleapis.com/v1alpha';

async function apiFetch(endpoint, apiKey, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.error ? errorJson.error.message : JSON.stringify(errorJson);
    } catch (e) {
      errorDetail = await response.text();
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Neplatný alebo chýbajúci API kľúč (Chyba ${response.status}).`);
    }
    throw new Error(`API chyba ${response.status}: ${errorDetail || response.statusText}`);
  }
  return response.json();
}

export async function fetchSources(apiKey) {
  if (!apiKey) throw new Error('API kľúč nie je nastavený.');
  let allSources = [];
  let pageToken = null;
  do {
    let endpoint = '/sources';
    if (pageToken) endpoint += `?pageToken=${encodeURIComponent(pageToken)}`;
    const data = await apiFetch(endpoint, apiKey);
    if (data.sources && Array.isArray(data.sources)) {
      allSources = allSources.concat(data.sources);
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  await setCachedSources(allSources);
  return allSources;
}

export async function createSession(apiKey, { prompt, title, source, branch, requirePlanApproval, autoCreatePr }) {
  if (!apiKey) throw new Error('API kľúč nie je nastavený.');

  const body = {
    prompt,
    title,
    requirePlanApproval,
    sourceContext: {
      source: source,
      githubRepoContext: { startingBranch: branch }
    }
  };

  if (autoCreatePr) {
    body.automationMode = 'AUTO_CREATE_PR';
  }

  return apiFetch('/sessions', apiKey, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function getSession(apiKey, sessionName) {
  if (!apiKey) throw new Error('API kľúč nie je nastavený.');
  // sessionName usually looks like "sessions/<id>"
  const endpoint = sessionName.startsWith('/') ? sessionName : `/${sessionName}`;
  return apiFetch(endpoint, apiKey);
}

export async function approvePlan(apiKey, sessionName) {
  if (!apiKey) throw new Error('API kľúč nie je nastavený.');
  const endpoint = sessionName.startsWith('/') ? `${sessionName}:approvePlan` : `/${sessionName}:approvePlan`;
  return apiFetch(endpoint, apiKey, {
    method: 'POST',
    body: JSON.stringify({})
  });
}
