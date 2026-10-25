document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    apiKey: document.getElementById('apiKey'),
    toggleApiKey: document.getElementById('toggleApiKey'),
    defaultBranch: document.getElementById('defaultBranch'),
    requirePlanApproval: document.getElementById('requirePlanApproval'),
    autoCreatePr: document.getElementById('autoCreatePr'),
    saveBtn: document.getElementById('saveBtn'),
    testBtn: document.getElementById('testBtn'),
    statusMessage: document.getElementById('statusMessage')
  };

  // Load current settings
  const settings = await window.api.getSettings();
  elements.apiKey.value = settings.julesApiKey || '';
  elements.defaultBranch.value = settings.defaultBranch || 'main';
  elements.requirePlanApproval.checked = settings.requirePlanApproval !== false; // Default true
  elements.autoCreatePr.checked = settings.autoCreatePr === true;

  // Toggle API key visibility
  elements.toggleApiKey.addEventListener('click', () => {
    if (elements.apiKey.type === 'password') {
      elements.apiKey.type = 'text';
      elements.toggleApiKey.textContent = '🙈'; // Eye with slash roughly
    } else {
      elements.apiKey.type = 'password';
      elements.toggleApiKey.textContent = '👁';
    }
  });

  // Helper to show status message
  function showStatus(message, isError = false) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status ${isError ? 'error' : 'success'}`;
  }

  // Save settings
  elements.saveBtn.addEventListener('click', async () => {
    const newSettings = {
      ...settings, // Preserve fields like lastSelectedRepo
      julesApiKey: elements.apiKey.value.trim(),
      defaultBranch: elements.defaultBranch.value.trim() || 'main',
      requirePlanApproval: elements.requirePlanApproval.checked,
      autoCreatePr: elements.autoCreatePr.checked
    };

    await window.api.saveSettings(newSettings);
    showStatus('Nastavenia boli úspešne uložené.');

    setTimeout(() => {
      elements.statusMessage.style.display = 'none';
    }, 3000);
  });

  // Test API Key and fetch sources
  elements.testBtn.addEventListener('click', async () => {
    const apiKey = elements.apiKey.value.trim();
    if (!apiKey) {
      showStatus('Zadajte API kľúč pred testovaním.', true);
      return;
    }

    elements.testBtn.disabled = true;
    elements.testBtn.textContent = 'Načítavam...';
    elements.statusMessage.style.display = 'none';

    try {
      // Temporarily save API key for the test if it's not saved yet, but we'll use it directly
      const sources = await window.api.fetchSources(apiKey);

      // Save valid key immediately to settings to avoid double typing
      const currentSettings = await window.api.getSettings();
      await window.api.saveSettings({ ...currentSettings, julesApiKey: apiKey });

      // Cache the sources
      await window.api.setCachedSources(sources);

      showStatus(`Úspešne pripojené. Nájdených repozitárov: ${sources.length}`);
    } catch (error) {
      showStatus(error.message, true);
    } finally {
      elements.testBtn.disabled = false;
      elements.testBtn.textContent = 'Otestovať kľúč a načítať repozitáre';
    }
  });
});
