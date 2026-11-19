// Progress store: earned trophies saved in localStorage, exportable to a file and importable back.
export const STORAGE_KEY = 'leonida-ledger-progress-v1';
export const SPOILER_KEY = 'leonida-ledger-spoilers-v1';

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

// Seed demo progress only when the URL asks for it and nothing is saved yet.
export function seedDemoIfRequested() {
  const params = new URLSearchParams(location.search);
  if (params.get('seed') !== 'demo') return false;
  if (localStorage.getItem(STORAGE_KEY)) return false;
  saveEarned(new Set(DEMO_EARNED));
  return true;
}

export function spoilerParamRequested() {
  return new URLSearchParams(location.search).get('spoilers') === '1';
}

export function exportProgress(earned) {
  const payload = {
    app: 'leonida-ledger',
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort(),
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

// Read an imported progress file: accepts the export format above or a bare array of names.
// Returns { earned: Set, imported: number, unknown: string[] } and never throws on bad input.
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
  return { earned, imported: earned.size, unknown };
}
