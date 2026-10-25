import { getSettings, saveSettings, fetchSources, setCachedSources } from './api.js';

let customPresets = [];

document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    apiKey: document.getElementById('apiKey'),
    toggleApiKey: document.getElementById('btnToggleKey'),
    defaultBranch: document.getElementById('defaultBranch'),
    requireApproval: document.getElementById('chkRequireApproval'),
    autoPr: document.getElementById('chkAutoPr'),
    notifications: document.getElementById('chkNotifications'),
    newPresetInput: document.getElementById('newPresetInput'),
    btnAddPreset: document.getElementById('btnAddPreset'),
    presetList: document.getElementById('presetList'),
    saveBtn: document.getElementById('btnSave'),
    testBtn: document.getElementById('btnTest')
  };

  // Load current settings
  const settings = await getSettings();
  elements.apiKey.value = settings.julesApiKey || '';
  elements.defaultBranch.value = settings.defaultBranch || 'main';
  elements.requireApproval.checked = settings.requirePlanApproval;
  elements.autoPr.checked = settings.autoCreatePr;
  elements.notifications.checked = settings.enableNotifications;
  customPresets = settings.customPresets || [];

  renderPresets();

  // Toggle API key visibility
  elements.toggleApiKey.addEventListener('click', () => {
    if (elements.apiKey.type === 'password') {
      elements.apiKey.type = 'text';
      elements.toggleApiKey.textContent = '🙈';
    } else {
      elements.apiKey.type = 'password';
      elements.toggleApiKey.textContent = '👁';
    }
  });

  // Manage Presets
  function renderPresets() {
    elements.presetList.innerHTML = '';
    customPresets.forEach((preset, index) => {
      const row = document.createElement('div');
      row.className = 'session-item flex-row justify-between';
      row.style.padding = '8px 12px';

      const txt = document.createElement('span');
      txt.textContent = preset;

      const btnDel = document.createElement('button');
      btnDel.className = 'btn';
      btnDel.textContent = 'Remove';
      btnDel.onclick = () => {
        customPresets.splice(index, 1);
        renderPresets();
      };

      row.appendChild(txt);
      row.appendChild(btnDel);
      elements.presetList.appendChild(row);
    });
  }

  elements.btnAddPreset.addEventListener('click', () => {
    const val = elements.newPresetInput.value.trim();
    if (val && !customPresets.includes(val)) {
      customPresets.push(val);
      elements.newPresetInput.value = '';
      renderPresets();
    }
  });

  elements.newPresetInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') elements.btnAddPreset.click();
  });

  // Save Settings
  elements.saveBtn.addEventListener('click', async () => {
    const newSettings = {
      ...settings,
      julesApiKey: elements.apiKey.value.trim(),
      defaultBranch: elements.defaultBranch.value.trim() || 'main',
      requirePlanApproval: elements.requireApproval.checked,
      autoCreatePr: elements.autoPr.checked,
      enableNotifications: elements.notifications.checked,
      customPresets: customPresets
    };

    await saveSettings(newSettings);
    showToast('Settings saved successfully.', false);
  });

  // Test Connection
  elements.testBtn.addEventListener('click', async () => {
    const apiKey = elements.apiKey.value.trim();
    if (!apiKey) {
      showToast('Please enter an API key before testing.', true);
      return;
    }

    elements.testBtn.disabled = true;
    elements.testBtn.textContent = 'Loading repositories...';

    try {
      const sources = await fetchSources(apiKey);
      await saveSettings({ ...settings, julesApiKey: apiKey });
      showToast(`Connection successful. Repositories found: ${sources.length}`, false);
    } catch (error) {
      showToast(error.message, true);
    } finally {
      elements.testBtn.disabled = false;
      elements.testBtn.textContent = 'Test Connection & Sync Repositories';
    }
  });

  function showToast(msg, isError) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast show ${isError ? 'error' : 'success'}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
});