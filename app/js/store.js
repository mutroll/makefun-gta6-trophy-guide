// Progress store: everything the tracker remembers lives in localStorage in this
// browser — earned trophies, the spoiler setting, a personal note per trophy, and
// the planner's inputs (hours played, queue focus). Progress exports to one JSON
// file and imports back, notes and planner inputs included.
export const STORAGE_KEY = 'leonida-ledger-progress-v1';
export const SPOILER_KEY = 'leonida-ledger-spoilers-v1';
export const NOTES_KEY = 'leonida-ledger-notes-v1';
export const PREFS_KEY = 'leonida-ledger-planner-v1';

export const DEFAULT_PREFS = { focus: 'story', hoursPlayed: 0 };

// Thirteen trophies a returning player might reasonably have by the end of Chapter 2,
// used only when ?seed=demo is on the URL (for screenshots and first-look demos).
export const DEMO_EARNED = [
  'Just Like Paradise',
  'Paradise Lost',
  'Trust',
  'Baited My Tackle',
  'Stick Fiddler',
  'Whip It Good',
  'You WAiNKer!',
  'One Last Thing',
  'Treat Yo Self',
  'Dime on the Dollar',
  'Little Boxes',
  'On the Spot',
  'The Goodtime State',
];

// The demo seed also writes two notes and planner inputs, so the screenshots show
// the planner working from a real mid-run state, not an empty one.
export const DEMO_NOTES = {
  'Positive Mental Attitude': 'Did the Chapter 1 meditation at Jason\u2019s house on the first morning — the missable one is safe. 6 of 18 spots done, both characters where the spot allows it.',
  'Cunning Stunts': 'Under-bridge flights are the fastest. Doing a lap of the coast each session before story missions.',
};
export const DEMO_PREFS = { focus: 'story', hoursPlayed: 26 };

export function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    const names = Array.isArray(parsed) ? parsed : parsed.earned;
    return new Set(Array.isArray(names) ? names.filter((n) => typeof n === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveEarned(earned) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
}

export function loadSpoilers() {
  try {
    return localStorage.getItem(SPOILER_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveSpoilers(on) {
  localStorage.setItem(SPOILER_KEY, on ? '1' : '0');
}

// Personal notes, one per trophy name. Blank notes are dropped, so the map only
// ever holds notes the player actually wrote.
export function loadNotes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const notes = {};
    for (const [name, text] of Object.entries(parsed)) {
      if (typeof text === 'string' && text.trim()) notes[name] = text;
    }
    return notes;
  } catch {
    return {};
  }
}

export function saveNotes(notes) {
  const clean = {};
  for (const [name, text] of Object.entries(notes)) {
    if (typeof text === 'string' && text.trim()) clean[name] = text;
  }
  localStorage.setItem(NOTES_KEY, JSON.stringify(clean));
}

// The planner's two inputs: which queue focus the player wants, and how many
// hours they have played so far (the pace half of the time-to-platinum estimate).
export function loadPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_PREFS };
    return {
      focus: typeof parsed.focus === 'string' ? parsed.focus : DEFAULT_PREFS.focus,
      hoursPlayed: Number.isFinite(parsed.hoursPlayed) && parsed.hoursPlayed >= 0 ? parsed.hoursPlayed : 0,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify({
    focus: prefs.focus,
    hoursPlayed: Math.max(0, Number(prefs.hoursPlayed) || 0),
  }));
}

// Seed demo progress only when the URL asks for it and nothing is saved yet.
export function seedDemoIfRequested() {
  const params = new URLSearchParams(location.search);
  if (params.get('seed') !== 'demo') return false;
  if (localStorage.getItem(STORAGE_KEY)) return false;
  saveEarned(new Set(DEMO_EARNED));
  if (!localStorage.getItem(NOTES_KEY)) saveNotes({ ...DEMO_NOTES });
  if (!localStorage.getItem(PREFS_KEY)) savePrefs({ ...DEMO_PREFS });
  return true;
}

export function spoilerParamRequested() {
  return new URLSearchParams(location.search).get('spoilers') === '1';
}

export function exportProgress(earned, notes = {}, prefs = DEFAULT_PREFS) {
  const payload = {
    app: 'leonida-ledger',
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort(),
    notes,
    planner: { focus: prefs.focus, hoursPlayed: prefs.hoursPlayed },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'gta6-trophy-progress.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// Read an imported progress file: accepts the export format above or a bare array
// of names. Returns { earned, notes, prefs, imported, unknown } and never throws
// on bad input beyond a plain-language error for a file that is not progress at all.
export async function importProgressFile(file, knownNames) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const names = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(names)) throw new Error('That file holds no earned-trophy list.');
  const known = new Set(knownNames);
  const earned = new Set();
  const unknown = [];
  for (const name of names) {
    if (typeof name !== 'string') continue;
    if (known.has(name)) earned.add(name);
    else unknown.push(name);
  }
  const notes = {};
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.notes && typeof parsed.notes === 'object') {
    for (const [name, note] of Object.entries(parsed.notes)) {
      if (known.has(name) && typeof note === 'string' && note.trim()) notes[name] = note;
    }
  }
  const prefs = { ...DEFAULT_PREFS };
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.planner && typeof parsed.planner === 'object') {
    if (typeof parsed.planner.focus === 'string') prefs.focus = parsed.planner.focus;
    if (Number.isFinite(parsed.planner.hoursPlayed) && parsed.planner.hoursPlayed >= 0) prefs.hoursPlayed = parsed.planner.hoursPlayed;
  }
  return { earned, notes, prefs, imported: earned.size, unknown };
}
