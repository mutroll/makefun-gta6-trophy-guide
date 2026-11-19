// Boot: load the trophy data, wire the tracker, and route between the three views.
// The app loads only its own files (data/trophies.json) and makes no network request.
import {
  exportProgress,
  importProgressFile,
  loadEarned,
  loadSpoilers,
  saveEarned,
  saveSpoilers,
  seedDemoIfRequested,
  spoilerParamRequested,
} from './store.js';
import {
  renderDetail,
  renderKindChips,
  renderMissables,
  renderProgress,
  renderRoadmap,
  renderTrophyList,
} from './views.js';

const els = {
  earnedCount: document.getElementById('earnedCount'),
  progressBar: document.getElementById('progressBar'),
  progressFill: document.getElementById('progressFill'),
  gradeCounts: document.getElementById('gradeCounts'),
  nextUp: document.getElementById('nextUp'),
  search: document.getElementById('search'),
  gradeFilter: document.getElementById('gradeFilter'),
  earnedFilter: document.getElementById('earnedFilter'),
  spoilerToggle: document.getElementById('spoilerToggle'),
  exportBtn: document.getElementById('exportBtn'),
  importFile: document.getElementById('importFile'),
  resetBtn: document.getElementById('resetBtn'),
  kindChips: document.getElementById('kindChips'),
  resultLine: document.getElementById('resultLine'),
  trophyList: document.getElementById('trophyList'),
  detailPane: document.getElementById('detailPane'),
  factsStrip: document.getElementById('factsStrip'),
  roadmapStages: document.getElementById('roadmapStages'),
  missablesBody: document.getElementById('missablesBody'),
  views: {
    tracker: document.getElementById('viewTracker'),
    roadmap: document.getElementById('viewRoadmap'),
    missables: document.getElementById('viewMissables'),
  },
  tabs: {
    tracker: document.getElementById('tabTracker'),
    roadmap: document.getElementById('tabRoadmap'),
    missables: document.getElementById('tabMissables'),
  },
};

const state = {
  trophies: [],
  earned: loadEarned(),
  spoilers: loadSpoilers(),
  kind: 'all',
  grade: 'all',
  earnedFilter: 'all',
  query: '',
  selectedId: null,
  route: 'tracker',
};

seedDemoIfRequested();
if (spoilerParamRequested()) {
  state.spoilers = true;
  saveSpoilers(true);
}
state.earned = loadEarned();

function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  if (hash.startsWith('trophy/')) {
    const id = Number(hash.slice('trophy/'.length));
    state.selectedId = Number.isInteger(id) ? id : null;
    return 'tracker';
  }
  if (hash === 'roadmap') return 'roadmap';
  if (hash === 'missables') return 'missables';
  return 'tracker';
}

function renderAll() {
  state.route = currentRoute();
  for (const [key, view] of Object.entries(els.views)) view.hidden = key !== state.route;
  for (const [key, tab] of Object.entries(els.tabs)) {
    if (key === state.route) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  renderProgress(state, els);
  if (state.route === 'tracker') {
    renderKindChips(state, els, (kind) => {
      state.kind = kind;
      renderAll();
    });
    renderTrophyList(state, els, selectTrophy, toggleEarned);
    renderDetail(state, els, toggleEarned);
  } else if (state.route === 'roadmap') {
    renderRoadmap(state, els);
  } else {
    renderMissables(state, els);
  }
}

function selectTrophy(id) {
  state.selectedId = id;
  history.replaceState(null, '', `#/trophy/${id}`);
  renderAll();
}

function toggleEarned(name, earned) {
  if (earned) state.earned.add(name);
  else state.earned.delete(name);
  saveEarned(state.earned);
  renderAll();
}

els.search.addEventListener('input', () => {
  state.query = els.search.value;
  renderAll();
});
els.gradeFilter.addEventListener('change', () => {
  state.grade = els.gradeFilter.value;
  renderAll();
});
els.earnedFilter.addEventListener('change', () => {
  state.earnedFilter = els.earnedFilter.value;
  renderAll();
});
els.spoilerToggle.addEventListener('change', () => {
  state.spoilers = els.spoilerToggle.checked;
  saveSpoilers(state.spoilers);
  renderAll();
});
els.exportBtn.addEventListener('click', () => exportProgress(state.earned));
els.importFile.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const result = await importProgressFile(file, state.trophies.map((t) => t.name));
    state.earned = result.earned;
    saveEarned(state.earned);
    els.resultLine.textContent = `Imported ${result.imported} earned trophies${result.unknown.length ? ` — ${result.unknown.length} names were not in the list and were skipped` : ''}.`;
    renderAll();
  } catch (error) {
    els.resultLine.textContent = `Import failed: ${error.message}`;
  }
  event.target.value = '';
});
els.resetBtn.addEventListener('click', () => {
  if (window.confirm('Clear all earned trophies in this browser?')) {
    state.earned = new Set();
    saveEarned(state.earned);
    renderAll();
  }
});
window.addEventListener('hashchange', renderAll);

const doc = await (await fetch('data/trophies.json')).json();
state.trophies = doc.trophies;
els.spoilerToggle.checked = state.spoilers;
renderAll();
