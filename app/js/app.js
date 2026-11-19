// Boot: load the trophy data, wire the tracker and the planner, and route between
// the four views. The app loads only its own files (data/trophies.json) and makes
// no network request.
import {
  exportProgress,
  importProgressFile,
  loadEarned,
  loadNotes,
  loadPrefs,
  loadSpoilers,
  saveEarned,
  saveNotes,
  savePrefs,
  saveSpoilers,
  seedDemoIfRequested,
  spoilerParamRequested,
} from './store.js';
import {
  renderDetail,
  renderKindChips,
  renderMissables,
  renderPlanner,
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
  queueLine: document.getElementById('queueLine'),
  search: document.getElementById('search'),
  gradeFilter: document.getElementById('gradeFilter'),
  chapterFilter: document.getElementById('chapterFilter'),
  earnedFilter: document.getElementById('earnedFilter'),
  missableToggle: document.getElementById('missableToggle'),
  spoilerToggle: document.getElementById('spoilerToggle'),
  exportBtn: document.getElementById('exportBtn'),
  importFile: document.getElementById('importFile'),
  resetBtn: document.getElementById('resetBtn'),
  kindChips: document.getElementById('kindChips'),
  resultLine: document.getElementById('resultLine'),
  trophyList: document.getElementById('trophyList'),
  detailPane: document.getElementById('detailPane'),
  focusSelect: document.getElementById('focusSelect'),
  hoursInput: document.getElementById('hoursInput'),
  planSummary: document.getElementById('planSummary'),
  plannerQueue: document.getElementById('plannerQueue'),
  factsStrip: document.getElementById('factsStrip'),
  etaPanel: document.getElementById('etaPanel'),
  roadmapStages: document.getElementById('roadmapStages'),
  missablesBody: document.getElementById('missablesBody'),
  views: {
    tracker: document.getElementById('viewTracker'),
    planner: document.getElementById('viewPlanner'),
    roadmap: document.getElementById('viewRoadmap'),
    missables: document.getElementById('viewMissables'),
  },
  tabs: {
    tracker: document.getElementById('tabTracker'),
    planner: document.getElementById('tabPlanner'),
    roadmap: document.getElementById('tabRoadmap'),
    missables: document.getElementById('tabMissables'),
  },
};

const state = {
  trophies: [],
  earned: loadEarned(),
  notes: loadNotes(),
  prefs: loadPrefs(),
  spoilers: loadSpoilers(),
  kind: 'all',
  grade: 'all',
  chapter: 'all',
  missableOnly: false,
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
state.notes = loadNotes();
state.prefs = loadPrefs();

function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  if (hash.startsWith('trophy/')) {
    const id = Number(hash.slice('trophy/'.length));
    state.selectedId = Number.isInteger(id) ? id : null;
    return 'tracker';
  }
  if (hash === 'planner') return 'planner';
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
    renderDetail(state, els, toggleEarned, saveNote);
  } else if (state.route === 'planner') {
    els.focusSelect.value = state.prefs.focus;
    els.hoursInput.value = String(state.prefs.hoursPlayed || '');
    renderPlanner(state, els, selectTrophy, toggleEarned);
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

function saveNote(name, text) {
  if (text && text.trim()) state.notes[name] = text;
  else delete state.notes[name];
  saveNotes(state.notes);
  // Refresh quietly so note tags and the planner summary stay true, without
  // stealing focus from the note being written (notes save on change, not input).
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
els.chapterFilter.addEventListener('change', () => {
  state.chapter = els.chapterFilter.value;
  renderAll();
});
els.earnedFilter.addEventListener('change', () => {
  state.earnedFilter = els.earnedFilter.value;
  renderAll();
});
els.missableToggle.addEventListener('change', () => {
  state.missableOnly = els.missableToggle.checked;
  renderAll();
});
els.spoilerToggle.addEventListener('change', () => {
  state.spoilers = els.spoilerToggle.checked;
  saveSpoilers(state.spoilers);
  renderAll();
});
els.focusSelect.addEventListener('change', () => {
  state.prefs.focus = els.focusSelect.value;
  savePrefs(state.prefs);
  renderAll();
});
els.hoursInput.addEventListener('change', () => {
  const value = Number(els.hoursInput.value);
  state.prefs.hoursPlayed = Number.isFinite(value) && value >= 0 ? value : 0;
  savePrefs(state.prefs);
  renderAll();
});
els.exportBtn.addEventListener('click', () => exportProgress(state.earned, state.notes, state.prefs));
els.importFile.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const result = await importProgressFile(file, state.trophies.map((t) => t.name));
    state.earned = result.earned;
    state.notes = result.notes;
    state.prefs = result.prefs;
    saveEarned(state.earned);
    saveNotes(state.notes);
    savePrefs(state.prefs);
    els.resultLine.textContent = `Imported ${result.imported} earned trophies${result.unknown.length ? ` — ${result.unknown.length} names were not in the list and were skipped` : ''}.`;
    renderAll();
  } catch (error) {
    els.resultLine.textContent = `Import failed: ${error.message}`;
  }
  event.target.value = '';
});
els.resetBtn.addEventListener('click', () => {
  if (window.confirm('Clear all earned trophies, notes and planner settings in this browser?')) {
    state.earned = new Set();
    state.notes = {};
    state.prefs = { focus: 'story', hoursPlayed: 0 };
    saveEarned(state.earned);
    saveNotes(state.notes);
    savePrefs(state.prefs);
    renderAll();
  }
});
window.addEventListener('hashchange', renderAll);

const doc = await (await fetch('data/trophies.json')).json();
state.trophies = doc.trophies;
els.spoilerToggle.checked = state.spoilers;
renderAll();
