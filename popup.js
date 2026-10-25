document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    apiKeyWarning: document.getElementById('apiKeyWarning'),
    mainForm: document.getElementById('mainForm'),
    successView: document.getElementById('successView'),

    openSettingsBtn: document.getElementById('openSettingsBtn'),

    repoFilter: document.getElementById('repoFilter'),
    repoSelect: document.getElementById('repoSelect'),
    refreshReposBtn: document.getElementById('refreshReposBtn'),
    repoLoading: document.getElementById('repoLoading'),

    promptText: document.getElementById('promptText'),
    appendUrl: document.getElementById('appendUrl'),

    overrideBranch: document.getElementById('overrideBranch'),
    overrideRequireApproval: document.getElementById('overrideRequireApproval'),
    overrideAutoPr: document.getElementById('overrideAutoPr'),

    submitBtn: document.getElementById('submitBtn'),

    sessionLinkText: document.getElementById('sessionLinkText'),
    autoOpen: document.getElementById('autoOpen'),
    openSessionBtn: document.getElementById('openSessionBtn'),
    closeBtn: document.getElementById('closeBtn'),

    statusMessage: document.getElementById('statusMessage')
  };

  let appSettings = {};
  let currentSources = [];
  let pendingTaskData = null;
  let createdSessionUrl = '';

  function showStatus(message, isError = false) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status ${isError ? 'error' : 'success'}`;
    elements.statusMessage.style.display = 'block';
  }

  function hideStatus() {
    elements.statusMessage.style.display = 'none';
  }

  // Check if dialog mode
  const isDialogMode = new URLSearchParams(window.location.search).get('mode') === 'dialog';
  if (isDialogMode) {
    document.body.style.width = '100%';
    document.body.style.height = '100vh';
    document.documentElement.style.height = '100vh';
  }

  // --- Init ---

  async function init() {
    appSettings = await window.api.getSettings();

    if (!appSettings.julesApiKey) {
      elements.apiKeyWarning.style.display = 'block';
      return;
    }

    elements.mainForm.style.display = 'block';

    // Set defaults from settings
    elements.overrideBranch.placeholder = `Predvolené: ${appSettings.defaultBranch}`;
    elements.overrideRequireApproval.checked = appSettings.requirePlanApproval;
    elements.overrideAutoPr.checked = appSettings.autoCreatePr;

    await loadPendingTask();
    await loadRepositories(false);
  }

  elements.openSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // --- Task Data ---

  async function loadPendingTask() {
    return new Promise(resolve => {
      chrome.storage.local.get(['pendingTask'], (result) => {
        if (result.pendingTask) {
          pendingTaskData = result.pendingTask;
          elements.promptText.value = pendingTaskData.selectionText || '';
        }
        resolve();
      });
    });
  }

  // --- Repositories ---

  function populateSelect(sources, filterText = '') {
    elements.repoSelect.innerHTML = '<option value="">-- Vyberte repozitár --</option>';

    const lowerFilter = filterText.toLowerCase();
    const filtered = sources.filter(s => {
      // name is "sources/github/owner/repo", id is "github/owner/repo"
      return s.id.toLowerCase().includes(lowerFilter);
    });

    filtered.forEach(source => {
      const opt = document.createElement('option');
      opt.value = source.name;
      opt.textContent = source.id;

      // Auto-select last used if it matches and there's no active filter
      if (!filterText && appSettings.lastSelectedRepo === source.name) {
        opt.selected = true;
      }

      elements.repoSelect.appendChild(opt);
    });

    // If exactly one match during filter, select it
    if (filterText && filtered.length === 1) {
      elements.repoSelect.value = filtered[0].name;
    }
  }

  async function loadRepositories(forceRefresh = false) {
    elements.repoLoading.style.display = 'block';
    elements.refreshReposBtn.disabled = true;

    try {
      let sources = await window.api.getCachedSources();

      if (!sources || forceRefresh) {
        sources = await window.api.fetchSources(appSettings.julesApiKey);
        await window.api.setCachedSources(sources);
      }

      currentSources = sources || [];
      populateSelect(currentSources, elements.repoFilter.value);
    } catch (error) {
      showStatus(error.message, true);
    } finally {
      elements.repoLoading.style.display = 'none';
      elements.refreshReposBtn.disabled = false;
    }
  }

  elements.refreshReposBtn.addEventListener('click', () => loadRepositories(true));

  elements.repoFilter.addEventListener('input', (e) => {
    populateSelect(currentSources, e.target.value.trim());
  });

  // --- Form Submit ---

  elements.submitBtn.addEventListener('click', async () => {
    hideStatus();

    const selectedSource = elements.repoSelect.value;
    if (!selectedSource) {
      showStatus('Prosím, vyberte cieľový repozitár.', true);
      return;
    }

    let prompt = elements.promptText.value.trim();
    if (!prompt) {
      showStatus('Zadanie nemôže byť prázdne.', true);
      return;
    }

    if (elements.appendUrl.checked && pendingTaskData && pendingTaskData.pageUrl) {
      prompt += `\n\nSource: ${pendingTaskData.pageUrl}`;
    }

    const title = prompt.split('\n')[0].substring(0, 60) + (prompt.length > 60 ? '...' : '');
    const branch = elements.overrideBranch.value.trim() || appSettings.defaultBranch;

    const payload = {
      prompt,
      title,
      requirePlanApproval: elements.overrideRequireApproval.checked,
      autoCreatePr: elements.overrideAutoPr.checked,
      sourceContext: {
        source: selectedSource,
        githubRepoContext: {
          startingBranch: branch
        }
      }
    };

    elements.submitBtn.disabled = true;
    elements.submitBtn.textContent = 'Vytváram session...';

    try {
      const response = await window.api.createSession(appSettings.julesApiKey, payload);

      // Save last selected repo
      await window.api.saveSettings({ ...appSettings, lastSelectedRepo: selectedSource });

      // Clear pending task
      chrome.storage.local.remove(['pendingTask']);

      // Show success
      elements.mainForm.style.display = 'none';
      elements.successView.style.display = 'flex';

      createdSessionUrl = response.url || `https://jules.google.com/session/${response.id || response.name?.split('/').pop()}`;
      elements.sessionLinkText.textContent = createdSessionUrl;

      if (elements.autoOpen.checked) {
        openSession();
      }

    } catch (error) {
      showStatus(error.message, true);
      elements.submitBtn.disabled = false;
      elements.submitBtn.textContent = 'Vytvoriť session v Jules';
    }
  });

  // --- Success Actions ---

  function openSession() {
    if (createdSessionUrl) {
      chrome.tabs.create({ url: createdSessionUrl });
      if (isDialogMode) {
        window.close();
      }
    }
  }

  elements.openSessionBtn.addEventListener('click', openSession);

  elements.closeBtn.addEventListener('click', () => {
    window.close();
  });

  // Start app
  init();
});
