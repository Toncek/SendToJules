const DEFAULT_SETTINGS = {
  julesApiKey: '',
  defaultBranch: 'main',
  requirePlanApproval: true,
  autoCreatePr: false,
  lastSelectedRepo: ''
};

// --- Storage Helpers ---

/**
 * Get extension settings from local storage.
 * @returns {Promise<Object>}
 */
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      resolve({ ...DEFAULT_SETTINGS, ...(result.settings || {}) });
    });
  });
}

/**
 * Save settings to local storage.
 * @param {Object} settings
 * @returns {Promise<void>}
 */
async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ settings }, resolve);
  });
}

/**
 * Get cached sources from local storage.
 * @returns {Promise<Array>}
 */
async function getCachedSources() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['cachedSources'], (result) => {
      if (result.cachedSources && result.cachedSources.data) {
        // Optional: add expiry check here if needed (e.g., cache for 1 hour)
        resolve(result.cachedSources.data);
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Save fetched sources to local storage cache.
 * @param {Array} sources
 * @returns {Promise<void>}
 */
async function setCachedSources(sources) {
  return new Promise((resolve) => {
    chrome.storage.local.set({
      cachedSources: {
        data: sources,
        timestamp: Date.now()
      }
    }, resolve);
  });
}

// --- API Methods ---

const API_BASE_URL = 'https://jules.googleapis.com/v1alpha';

/**
 * Internal helper for fetch requests.
 */
async function apiFetch(endpoint, apiKey, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.error ? errorJson.error.message : JSON.stringify(errorJson);
    } catch (e) {
      errorDetail = await response.text();
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(`Neplatný alebo chýbajúci API kľúč (Chyba ${response.status}). Skontrolujte nastavenia.`);
    }

    throw new Error(`API chyba ${response.status}: ${errorDetail || response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch list of sources (repositories) handling pagination.
 * @param {string} apiKey
 * @returns {Promise<Array>}
 */
async function fetchSources(apiKey) {
  if (!apiKey) {
    throw new Error('API kľúč nie je nastavený.');
  }

  let allSources = [];
  let pageToken = null;

  try {
    do {
      let endpoint = '/sources';
      if (pageToken) {
        endpoint += `?pageToken=${encodeURIComponent(pageToken)}`;
      }

      const data = await apiFetch(endpoint, apiKey);
      if (data.sources && Array.isArray(data.sources)) {
        allSources = allSources.concat(data.sources);
      }

      pageToken = data.nextPageToken || null;
    } while (pageToken);

    return allSources;
  } catch (error) {
    console.error("fetchSources failed", error);
    throw new Error(`Zlyhalo načítanie repozitárov: ${error.message}`);
  }
}

/**
 * Create a new Jules session.
 * @param {string} apiKey
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
async function createSession(apiKey, payload) {
  if (!apiKey) {
    throw new Error('API kľúč nie je nastavený.');
  }

  try {
    // We expect payload to match what's needed for POST /v1alpha/sessions
    // { prompt, title, requirePlanApproval, sourceContext, [automationMode] }

    // Create actual body
    const body = {
      prompt: payload.prompt,
      title: payload.title,
      requirePlanApproval: payload.requirePlanApproval,
      sourceContext: payload.sourceContext
    };

    if (payload.autoCreatePr) {
      body.automationMode = 'AUTO_CREATE_PR';
    }

    const data = await apiFetch('/sessions', apiKey, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return data;
  } catch (error) {
    console.error("createSession failed", error);
    throw new Error(`Zlyhalo vytvorenie relácie (session): ${error.message}`);
  }
}

// Export for ES modules or attach to window for classic script tags
if (typeof window !== 'undefined') {
  window.api = {
    getSettings,
    saveSettings,
    getCachedSources,
    setCachedSources,
    fetchSources,
    createSession
  };
}
