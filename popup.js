import { getSettings, getCachedSources, getRecentRepos, getTrackedSessions, fetchSources, createSession, saveTrackedSession, approvePlan } from './api.js';

let appSettings = {};
let allSources = [];
let pendingTask = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).classList.add('active');
    });
  });

  // Settings Btn
  document.getElementById('btnOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Initialize
  appSettings = await getSettings();

  if (!appSettings.julesApiKey) {
    document.getElementById('main-ui').classList.add('hidden');
    document.getElementById('onboarding-state').classList.remove('hidden');
    document.getElementById('btnOpenOptions').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  await loadSources();
  await loadPendingTask();
  await renderPresets();
  await renderSessionsList();

  // New Task Tab Listeners
  const repoSearch = document.getElementById('repoSearch');
  const btnSubmit = document.getElementById('btnSubmit');
  const promptText = document.getElementById('promptText');

  repoSearch.addEventListener('input', () => {
    const val = repoSearch.value;
    const match = allSources.find(s => s.name === val || s.id === val);
    if (match) repoSearch.value = match.name;
    document.getElementById('repoDetectedBadge').classList.add('hidden');
  });

  promptText.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      btnSubmit.click();
    }
  });

  btnSubmit.addEventListener('click', async () => {
    btnSubmit.disabled = true;
    try {
      let repo = repoSearch.value;
      if (!repo.startsWith('sources/')) {
        const found = allSources.find(s => s.id === repo || s.name === repo);
        if (found) repo = found.name;
      }
      if (!repo || !repo.startsWith('sources/')) throw new Error('Invalid repository');

      let finalPrompt = promptText.value.trim();
      if (!finalPrompt) throw new Error('Prompt is empty');

      const chkAppendUrl = document.getElementById('chkAppendUrl').checked;
      if (chkAppendUrl && pendingTask && pendingTask.pageUrl) {
        finalPrompt += `\n\nSource URL: ${pendingTask.pageUrl}`;
      }

      const titleMatch = finalPrompt.split('\n')[0];
      const title = titleMatch.length > 50 ? titleMatch.substring(0, 47) + '...' : titleMatch;

      const payload = {
        prompt: finalPrompt,
        title: title || 'Task from extension',
        source: repo,
        branch: document.getElementById('inputBranch').value.trim() || appSettings.defaultBranch,
        requirePlanApproval: document.getElementById('chkRequireApproval').checked,
        autoCreatePr: document.getElementById('chkAutoPr').checked
      };

      const session = await createSession(appSettings.julesApiKey, payload);
      await saveTrackedSession(session);

      // Update quick repos in background
      chrome.runtime.sendMessage({ type: "UPDATE_RECENT_REPOS", repo: repo }).catch(() => {});
      // Manually add for now if bg isn't listening for messages specifically yet, but the alarm polling will catch it. Actually, `api.addRecentRepo` can be imported here.
      const { addRecentRepo } = await import('./api.js');
      await addRecentRepo(repo);

      await chrome.storage.local.remove(['pendingTask']);
      pendingTask = null;
      promptText.value = '';

      showToast('Task created!', false);

      // Switch to sessions tab
      document.querySelector('[data-target="tab-sessions"]').click();
      await renderSessionsList();

    } catch (e) {
      showToast(e.message, true);
    } finally {
      btnSubmit.disabled = false;
    }
  });

  // Sessions Tab Listeners
  document.getElementById('btnRefreshSessions').addEventListener('click', async () => {
    const btn = document.getElementById('btnRefreshSessions');
    btn.disabled = true;
    await renderSessionsList(true); // force refresh from API
    btn.disabled = false;
  });
});

async function loadSources() {
  const datalist = document.getElementById('repoDatalist');
  allSources = await getCachedSources() || [];
  if (allSources.length === 0 && appSettings.julesApiKey) {
    try {
      allSources = await fetchSources(appSettings.julesApiKey);
    } catch (e) {}
  }

  datalist.innerHTML = '';
  allSources.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.name; // Use full name sources/github/owner/repo
    opt.textContent = s.id;
    datalist.appendChild(opt);
  });
}

async function loadPendingTask() {
  return new Promise(resolve => {
    chrome.storage.local.get(['pendingTask'], async (res) => {
      const task = res.pendingTask;
      if (task) {
        pendingTask = task;
        document.getElementById('promptText').value = task.selectionText || '';
        document.getElementById('chkAppendUrl').checked = !!task.pageUrl;

        // Smart Repo Selection
        const repoSearch = document.getElementById('repoSearch');
        const badge = document.getElementById('repoDetectedBadge');
        if (task.detectedRepo && allSources.find(s => s.name === task.detectedRepo)) {
          repoSearch.value = task.detectedRepo;
          badge.classList.remove('hidden');
          if (task.detectedBranch) {
            document.getElementById('inputBranch').value = task.detectedBranch;
          }
        } else {
          // Pre-select most recent
          const recent = await getRecentRepos();
          if (recent.length > 0) {
            repoSearch.value = recent[0];
          }
        }
      }

      // Setup Defaults
      if (!document.getElementById('inputBranch').value) {
        document.getElementById('inputBranch').value = appSettings.defaultBranch;
      }
      document.getElementById('chkRequireApproval').checked = appSettings.requirePlanApproval;
      document.getElementById('chkAutoPr').checked = appSettings.autoCreatePr;

      // Render quick select pills
      const recent = await getRecentRepos();
      const container = document.getElementById('quickSelectContainer');
      container.innerHTML = '';
      recent.slice(0, 3).forEach(repo => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = repo.replace('sources/github/', '');
        chip.onclick = () => {
          document.getElementById('repoSearch').value = repo;
          document.getElementById('repoDetectedBadge').classList.add('hidden');
        };
        container.appendChild(chip);
      });

      resolve();
    });
  });
}

function renderPresets() {
  const container = document.getElementById('presetContainer');
  container.innerHTML = '';
  const presets = appSettings.customPresets || [];
  presets.forEach(p => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = p;
    chip.onclick = () => {
      const txt = document.getElementById('promptText');
      txt.value = p + '\n\n' + txt.value;
      txt.focus();
    };
    container.appendChild(chip);
  });
}

async function renderSessionsList(forceFetch = false) {
  const container = document.getElementById('sessionsList');
  let sessions = await getTrackedSessions();

  if (forceFetch && appSettings.julesApiKey) {
    const { getSession, updateTrackedSessions } = await import('./api.js');
    for (let i = 0; i < sessions.length; i++) {
      if (!['COMPLETED', 'FAILED'].includes(sessions[i].state)) {
        try {
          sessions[i] = await getSession(appSettings.julesApiKey, sessions[i].name);
        } catch(e) {}
      }
    }
    await updateTrackedSessions(sessions);
  }

  container.innerHTML = '';
  if (sessions.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'text-center';
    emptyDiv.style.color = 'var(--text-muted)';
    emptyDiv.textContent = 'No active sessions.';
    container.appendChild(emptyDiv);
    return;
  }

  // Sort by update time descending
  sessions.sort((a, b) => new Date(b.updateTime || 0) - new Date(a.updateTime || 0));

  sessions.forEach(s => {
    const item = document.createElement('div');
    item.className = 'session-item';

    let badgeClass = 'badge-info';
    let stateTxt = s.state || 'UNKNOWN';
    if (stateTxt === 'COMPLETED') badgeClass = 'badge-success';
    if (stateTxt === 'FAILED') badgeClass = 'badge-danger';
    if (stateTxt === 'AWAITING_PLAN_APPROVAL') badgeClass = 'badge-warning';

    const sourceName = (s.sourceContext?.source || s.source || '').replace('sources/github/', '');

    const header = document.createElement('div');
    header.className = 'session-header';
    const title = document.createElement('h3');
    title.className = 'session-title';
    title.textContent = s.title || 'Untitled';
    const badge = document.createElement('span');
    badge.className = `badge ${badgeClass}`;
    badge.textContent = stateTxt;
    header.appendChild(title);
    header.appendChild(badge);

    const meta = document.createElement('div');
    meta.className = 'session-meta';
    meta.textContent = `Repo: ${sourceName}`;

    const actions = document.createElement('div');
    actions.className = 'session-actions';
    if (stateTxt === 'AWAITING_PLAN_APPROVAL') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary btn-approve';
      btn.dataset.name = s.name;
      btn.textContent = '✅ Approve Plan';
      actions.appendChild(btn);
    }
    if (s.url) {
      const link = document.createElement('a');
      link.href = s.url;
      link.target = '_blank';
      link.className = 'btn';
      link.textContent = 'Open ↗';
      actions.appendChild(link);
    }

    item.appendChild(header);
    item.appendChild(meta);
    item.appendChild(actions);

    container.appendChild(item);
  });

  // Attach approve listeners
  document.querySelectorAll('.btn-approve').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const name = e.target.dataset.name;
      e.target.disabled = true;
      e.target.textContent = 'Approving...';
      try {
        await approvePlan(appSettings.julesApiKey, name);
        showToast('Plan approved!', false);
        setTimeout(() => renderSessionsList(true), 1500);
      } catch (err) {
        showToast(err.message, true);
        e.target.disabled = false;
        e.target.textContent = '✅ Approve Plan';
      }
    });
  });
}

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
