// The Next-up planner: pure logic, no DOM. From the trophies a player has earned,
// their hours played so far and one preference, it builds a personal ordered queue
// of what to earn next — prerequisites first, the missable window protected, and
// every entry carrying the reason it sits where it sits. All inputs come from
// data/trophies.json (each trophy's chapter, hours and prereq fields) plus the
// player's saved state, so the plan rebuilds itself after every tick.

// Roadmap stage budgets in hours, the midpoints of the ranges the roadmap quotes
// from PowerPyx (stage 1: 60–80, stage 2: about 100, stage 3: about 10). Stage
// totals — never the sum of the per-trophy estimates, which overlap — are what
// the time-to-platinum figure is built from.
export const STAGE_HOURS = { 1: 70, 2: 100, 3: 10 };

export const FOCUS_OPTIONS = [
  { key: 'story', label: 'Follow the story' },
  { key: 'quick', label: 'Quick wins first' },
  { key: 'checklist', label: 'Chase the 100% checklist' },
  { key: 'grind', label: 'Long grinds first' },
];

// A rough story position for ordering: chapters in order, the finale after them,
// post-story windows after that, and anything-time trophies last within a stage.
export function chapterRank(trophy) {
  const chapter = trophy.chapter || '';
  const match = chapter.match(/Chapter (\d)/);
  if (match) return Number(match[1]);
  if (chapter.startsWith('Final mission')) return 6;
  if (chapter.startsWith('After the story')) return 7;
  if (chapter.startsWith('Last')) return 9;
  return 8;
}

// The short group label the planner files a trophy under: its chapter when it has
// one, otherwise its roadmap stage window.
export function chapterGroup(trophy) {
  const chapter = trophy.chapter || '';
  const match = chapter.match(/^(Chapter \d|Final mission|After the story|Any time|Last)/);
  if (match) return match[1];
  if (chapter.startsWith('Method unconfirmed')) return 'Unconfirmed methods';
  return `Stage ${trophy.stage}`;
}

function unlocksMap(trophies) {
  const unlocks = new Map();
  for (const trophy of trophies) {
    for (const need of trophy.prereq || []) {
      if (!unlocks.has(need)) unlocks.set(need, []);
      unlocks.get(need).push(trophy.name);
    }
  }
  return unlocks;
}

// Why a trophy earned its place in the queue, in one short line a player can act on.
function reasonFor(trophy, earned, unlocks) {
  const reasons = [];
  if (trophy.missable) {
    reasons.push('Potentially missable — its Chapter 1 window closes for good, so it outranks everything');
  }
  const opens = (unlocks.get(trophy.name) || []).filter((name) => !earned.has(name));
  if (opens.length) reasons.push(`Unlocks ${opens.slice(0, 2).join(' and ')}${opens.length > 2 ? ` and ${opens.length - 2} more` : ''}`);
  if (trophy.kinds.includes('story')) reasons.push(`Next story beat — ${trophy.chapter}`);
  else if (trophy.stage === 2) reasons.push('Feeds the 100% checklist');
  else if (trophy.stage === 3 && /not yet confirmed/i.test(trophy.guide)) reasons.push('Method still unconfirmed — check its cited sources before a session');
  else if (trophy.stage === 3) reasons.push('Cleanup — nothing else is gated behind it');
  if (trophy.hours <= 0.5 && !trophy.kinds.includes('story')) reasons.push('Quick win, about half an hour');
  if (trophy.target) reasons.push(`PSN counts to ${trophy.target.toLocaleString()}`);
  return reasons.slice(0, 2).join(' · ');
}

function focusKey(focus) {
  switch (focus) {
    case 'quick':
      // Shortest focused time first; the missable still jumps the queue.
      return (t) => [t.missable ? 0 : 1, t.hours, t.stage, chapterRank(t), t.id];
    case 'checklist':
      // The 100% checklist stage first, then story, then cleanup.
      return (t) => [t.missable ? 0 : 1, t.stage === 2 ? 0 : t.stage === 1 ? 1 : 2, chapterRank(t), t.hours, t.id];
    case 'grind':
      // Longest first, so the slow counters accrue while everything else happens.
      return (t) => [t.missable ? 0 : 1, -t.hours, t.stage, t.id];
    case 'story':
    default:
      // Story order: stage, then chapter, then the strands that hang off it.
      return (t) => [t.stage, chapterRank(t), t.kinds.includes('story') ? 0 : 1, t.hours, t.id];
  }
}

function compareKeys(a, b) {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

// Build the ordered queue. Prerequisites are hard gates: a trophy is only placed
// once everything in its prereq list is earned or already queued ahead of it.
// The platinum is held back until it is the only trophy left — it pops on its own.
export function buildPlan(trophies, earned, prefs = {}) {
  const focus = FOCUS_OPTIONS.some((o) => o.key === prefs.focus) ? prefs.focus : 'story';
  const keyOf = focusKey(focus);
  const unlocks = unlocksMap(trophies);
  const remaining = trophies.filter((t) => !earned.has(t.name));
  const platinum = remaining.find((t) => t.grade === 'platinum');
  const pool = remaining.filter((t) => t.grade !== 'platinum');
  const placed = new Set();
  const queue = [];
  const ready = (t) => (t.prereq || []).every((need) => earned.has(need) || placed.has(need));
  let guard = pool.length + 1;
  while (pool.length && guard > 0) {
    guard -= 1;
    const candidates = pool.filter(ready).sort((a, b) => compareKeys(keyOf(a), keyOf(b)));
    if (!candidates.length) break; // a prereq cycle would land here; the data has none
    const pick = candidates[0];
    pool.splice(pool.indexOf(pick), 1);
    placed.add(pick.name);
    queue.push({
      trophy: pick,
      position: queue.length + 1,
      group: chapterGroup(pick),
      reason: reasonFor(pick, earned, unlocks),
      blockedBy: [],
    });
  }
  // Anything left is gated on a prerequisite outside the list; show it last, named.
  for (const trophy of pool) {
    queue.push({
      trophy,
      position: queue.length + 1,
      group: chapterGroup(trophy),
      reason: 'Waiting on a prerequisite',
      blockedBy: (trophy.prereq || []).filter((need) => !earned.has(need) && !placed.has(need)),
    });
  }
  if (platinum && remaining.length === 1) {
    queue.push({ trophy: platinum, position: 1, group: 'Last', reason: 'Nothing left — earn anything and the platinum pops', blockedBy: [] });
  }
  return queue;
}

// The queue folded into its chapter groups, in queue order, for display.
export function groupPlan(queue) {
  const groups = [];
  for (const item of queue) {
    const last = groups[groups.length - 1];
    if (last && last.group === item.group) last.items.push(item);
    else groups.push({ group: item.group, items: [item] });
  }
  return groups;
}

// Per-stage progress for the roadmap: trophies done, percent, and the stage's
// share of its hour budget that is still to go (weighted by the per-trophy
// estimates inside the stage, so finishing a stage's long trophies moves it most).
export function stageProgress(trophies, earned) {
  return [1, 2, 3].map((stage) => {
    const inStage = trophies.filter((t) => t.stage === stage);
    const done = inStage.filter((t) => earned.has(t.name));
    const totalWeight = inStage.reduce((sum, t) => sum + Math.max(t.hours, 0.25), 0);
    const leftWeight = inStage
      .filter((t) => !earned.has(t.name))
      .reduce((sum, t) => sum + Math.max(t.hours, 0.25), 0);
    return {
      stage,
      total: inStage.length,
      done: done.length,
      pct: inStage.length ? Math.round((done.length / inStage.length) * 100) : 100,
      hoursTotal: STAGE_HOURS[stage],
      hoursLeft: Math.round(STAGE_HOURS[stage] * (totalWeight ? leftWeight / totalWeight : 0)),
    };
  });
}

// Time to platinum, two ways: the roadmap model (stage budgets weighted by what
// is left in each) and the player's own pace (hours played per trophy earned,
// projected over what remains). Either can be null when it has nothing to go on.
export function timeToPlatinum(trophies, earned, hoursPlayed) {
  const stages = stageProgress(trophies, earned);
  const modelHours = stages.reduce((sum, s) => sum + s.hoursLeft, 0);
  const remainingCount = trophies.length - earned.size;
  let paceHours = null;
  if (hoursPlayed > 0 && earned.size > 0 && remainingCount > 0) {
    paceHours = Math.round((hoursPlayed / earned.size) * remainingCount);
  }
  return { modelHours, paceHours, remainingCount, stages };
}

export function formatHours(hours) {
  if (hours === null || hours === undefined) return '—';
  if (hours === 0) return '0 h';
  if (hours < 1) return '½ h';
  return `${Math.round(hours)} h`;
}
