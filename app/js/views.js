// Views: the tracker list, the trophy detail pane, the Next-up planner, the
// roadmap and the missables page. All guide text comes from data/trophies.json;
// this file only lays it out. The planner's ordering comes from planner.js.
import { buildPlan, formatHours, groupPlan, stageProgress, timeToPlatinum } from './planner.js';

export const KIND_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'story', label: 'Story' },
  { key: 'missable', label: 'Missable' },
  { key: 'collectibles', label: 'Collectibles' },
  { key: 'activities', label: 'Activities' },
  { key: 'completion', label: 'Completion' },
  { key: 'online', label: 'Online' },
];

export const GRADE_LABELS = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};

export const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  completion: 'Completion',
  online: 'Online',
};

// Chapter filter values, matching the planner's chapter groups.
export const CHAPTER_FILTERS = [
  { key: 'all', label: 'All chapters' },
  { key: 'Chapter 1', label: 'Chapter 1' },
  { key: 'Chapter 2', label: 'Chapter 2' },
  { key: 'Chapter 3', label: 'Chapter 3' },
  { key: 'Chapter 4', label: 'Chapter 4' },
  { key: 'Chapter 5', label: 'Chapter 5' },
  { key: 'Final mission', label: 'Final mission' },
  { key: 'After the story', label: 'After the story' },
  { key: 'Any time', label: 'Any time' },
  { key: 'Unconfirmed methods', label: 'Unconfirmed methods' },
];

// The three stages of the road to the platinum, from PowerPyx's roadmap:
// story first, then the 100% checklist, then cleanup. The trophies in each stage
// are read from the data file's own stage field, so the list never drifts.
export const ROADMAP_STAGES = [
  {
    stage: 1,
    time: 'Stage 1 · 60–80 hours',
    title: 'Play the story',
    lede: 'Finish the story and enjoy it. The 100% checklist is not even visible until after the story, but everything you do during it already counts. There are no mission gold medals and no mission replay, so how cleanly you play a mission does not matter — just finish it. Two habits pay off all run long: scan every new vehicle with the WAiNK app, and study every new animal through the binoculars. And do the one thing that can be missed: the Chapter 1 meditation at Jason\u2019s house (see Missables).',
  },
  {
    stage: 2,
    time: 'Stage 2 · about 100 hours',
    title: 'The 100% completion checklist',
    lede: 'After the story you are back in free-roam and the checklist appears under Progress > Stats > 100% Completion. It is forgiving — closer to 60% true completion. Most side quests are not needed and collectibles only partly. The full asks are: all robberies, all shooting ranges, all drone races, all of Bret\u2019s quests, 70 of 80 challenges, 100 optional missions, 200 of 277 vehicles scanned, 100 of 255 animals studied, 300 stunts and 15 of 18 meditations. Nothing on the checklist is missable.',
  },
  {
    stage: 3,
    time: 'Stage 3 · about 10 hours',
    title: 'Cleanup and the platinum',
    lede: 'Whatever is left: the stranger strands that do not count toward 100%, the long grinds (500 criminal-profile actions, maximum strength for both characters), and the five trophies whose methods were still unconfirmed at launch — check their guides for the latest word. When the last one pops, the platinum follows.',
  },
];

export const ROADMAP_FACTS = [
  { value: '55', label: 'trophies · 1 platinum, 2 gold, 6 silver, 46 bronze' },
  { value: '4/10', label: 'difficulty (PowerPyx)' },
  { value: '~200 h', label: 'to the platinum' },
  { value: '1', label: 'playthrough needed' },
  { value: '0', label: 'online trophies' },
  { value: '1', label: 'possibly missable' },
];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

export function trophyIsHidden(trophy, state) {
  return (
    state.spoilers &&
    trophy.kinds.includes('story') &&
    !state.earned.has(trophy.name)
  );
}

export function visibleTrophies(state) {
  const query = state.query.trim().toLowerCase();
  return state.trophies.filter((t) => {
    if (state.kind !== 'all' && !t.kinds.includes(state.kind)) return false;
    if (state.missableOnly && !t.missable) return false;
    if (state.chapter !== 'all') {
      const group = t.chapter.startsWith('Method unconfirmed')
        ? 'Unconfirmed methods'
        : (t.chapter.match(/^(Chapter \d|Final mission|After the story|Any time|Last)/) || [])[1];
      if (group !== state.chapter) return false;
    }
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.earnedFilter === 'earned' && !state.earned.has(t.name)) return false;
    if (state.earnedFilter === 'remaining' && state.earned.has(t.name)) return false;
    if (query) {
      const note = state.notes[t.name] || '';
      const hay = `${t.name} ${t.description} ${t.guide} ${t.chapter} ${note}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

export function renderProgress(state, els) {
  const total = state.trophies.length;
  const earned = state.earned.size;
  els.earnedCount.textContent = String(earned);
  els.progressBar.setAttribute('aria-valuenow', String(earned));
  els.progressFill.style.width = `${total ? Math.round((earned / total) * 100) : 0}%`;
  const byGrade = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => {
      const count = state.trophies.filter((t) => t.grade === g).length;
      const done = state.trophies.filter((t) => t.grade === g && state.earned.has(t.name)).length;
      return `${GRADE_LABELS[g]} ${done}/${count}`;
    })
    .join(' · ');
  els.gradeCounts.textContent = byGrade;

  // Next up comes from the planner now, not a bare stage sort: it is the head of
  // the same queue the Planner page shows, prerequisites and missable included.
  const queue = buildPlan(state.trophies, state.earned, state.prefs);
  els.nextUp.replaceChildren();
  els.queueLine.replaceChildren();
  if (!queue.length) {
    els.nextUp.append('Platinum earned. You are a Leonida Legend.');
    return;
  }
  const head = queue[0].trophy;
  const headHidden = trophyIsHidden(head, state);
  els.nextUp.append('Next up: ');
  els.nextUp.append(el('strong', null, headHidden ? 'a hidden story trophy' : head.name));
  els.nextUp.append(headHidden ? ' — earn it to reveal its name.' : ` — ${head.chapter} · about ${formatHours(head.hours)}`);
  const rest = queue.slice(1, 4).map((item) => (trophyIsHidden(item.trophy, state) ? 'a hidden story trophy' : item.trophy.name));
  if (rest.length) {
    els.queueLine.append(`Then: ${rest.join(' · ')} — the full personal plan is on the Next-up Planner tab.`);
  }
}

export function renderKindChips(state, els, onPick) {
  els.kindChips.replaceChildren();
  for (const filter of KIND_FILTERS) {
    const count =
      filter.key === 'all'
        ? state.trophies.length
        : filter.key === 'online'
          ? 0
          : state.trophies.filter((t) => t.kinds.includes(filter.key)).length;
    const button = el('button', 'chip', `${filter.label} (${count})`);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(state.kind === filter.key));
    button.addEventListener('click', () => onPick(filter.key));
    els.kindChips.append(button);
  }
}

export function renderTrophyList(state, els, onSelect, onToggle) {
  const list = visibleTrophies(state);
  els.resultLine.textContent =
    state.kind === 'online'
      ? 'No online trophies — all 55 are single-player, so this filter is empty on purpose.'
      : `${list.length} of ${state.trophies.length} trophies shown · ${state.earned.size} earned`;
  els.trophyList.replaceChildren();
  if (list.length === 0) {
    const note = el('p', 'empty-note', 'Nothing matches these filters. Try clearing the search or picking another kind.');
    els.trophyList.append(note);
    return;
  }
  for (const trophy of list) {
    const hidden = trophyIsHidden(trophy, state);
    const earned = state.earned.has(trophy.name);
    const row = el('li', `trophy-row${earned ? ' earned' : ''}`);
    if (state.selectedId === trophy.id) row.setAttribute('aria-current', 'true');

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned;
    box.setAttribute('aria-label', `Mark ${hidden ? 'hidden story trophy' : trophy.name} as earned`);
    box.addEventListener('change', () => onToggle(trophy.name, box.checked));
    row.append(box);

    const button = el('button', 'trophy-select');
    button.type = 'button';
    button.addEventListener('click', () => onSelect(trophy.id));

    const medal = el('span', `medal ${trophy.grade}`, null);
    medal.title = GRADE_LABELS[trophy.grade];
    button.append(medal);

    const main = el('span', null);
    main.append(el('span', 'trophy-name', hidden ? 'Hidden story trophy' : trophy.name));
    main.append(el('span', 'trophy-desc', hidden ? 'Hidden until earned — the spoiler setting is on.' : trophy.description));
    const tags = el('span', 'trophy-tags');
    for (const kind of trophy.kinds) tags.append(el('span', 'tag', KIND_LABELS[kind]));
    if (trophy.missable) tags.append(el('span', 'tag missable', 'Potentially missable'));
    if (trophy.hidden) tags.append(el('span', 'tag hidden-tag', 'Hidden on PSN'));
    if (state.notes[trophy.name]) tags.append(el('span', 'tag note-tag', 'Your note'));
    main.append(tags);
    main.append(el('span', 'trophy-when', hidden ? '' : `${trophy.chapter} · about ${formatHours(trophy.hours)}`));
    button.append(main);

    const count = el('span', 'trophy-count');
    if (trophy.target) {
      count.append(document.createTextNode(`PSN target ${trophy.target.toLocaleString()}`));
      count.append(el('small', null, GRADE_LABELS[trophy.grade]));
    } else {
      count.append(el('small', null, GRADE_LABELS[trophy.grade]));
    }
    button.append(count);
    row.append(button);
    els.trophyList.append(row);
  }
}

export function renderDetail(state, els, onToggle, onNote) {
  const pane = els.detailPane;
  pane.replaceChildren();
  const trophy = state.trophies.find((t) => t.id === state.selectedId) || null;
  if (!trophy) {
    pane.append(el('h2', null, 'Pick a trophy'));
    pane.append(el('p', 'guide-text', 'Select any trophy on the left to see its guide, its sources, when to earn it and your place in the plan. Tick the box beside a trophy when you have earned it — your progress is saved in this browser.'));
    pane.append(el('p', 'guide-text', 'Every guide names its sources. A specific location or step with no source beside it earns no trust here, so the unconfirmed ones say so plainly instead of guessing.'));
    return;
  }
  const hidden = trophyIsHidden(trophy, state);
  const earned = state.earned.has(trophy.name);
  pane.append(el('span', 'tag', GRADE_LABELS[trophy.grade]));
  pane.append(el('h2', null, hidden ? 'Hidden story trophy' : trophy.name));
  pane.append(el('p', 'official', hidden ? 'Official name and description hidden until earned.' : `Official: “${trophy.description}”`));

  const meta = el('div', 'detail-meta');
  for (const kind of trophy.kinds) meta.append(el('span', 'tag', KIND_LABELS[kind]));
  if (trophy.missable) meta.append(el('span', 'tag missable', 'Potentially missable'));
  if (trophy.hidden) meta.append(el('span', 'tag hidden-tag', 'Hidden on PSN'));
  if (trophy.target) meta.append(el('span', 'tag', `PSN counts to ${trophy.target.toLocaleString()}`));
  meta.append(el('span', 'tag', `Roadmap stage ${trophy.stage}`));
  pane.append(meta);

  if (hidden) {
    pane.append(el('p', 'spoiler-mask', 'The spoiler setting hides this story trophy\u2019s name, description and guide until you earn it. Tick it off to reveal it.'));
  } else {
    pane.append(el('p', 'when-line', `When: ${trophy.chapter} · typical focused time about ${formatHours(trophy.hours)}`));
    if ((trophy.prereq || []).length) {
      const needs = el('p', 'when-line');
      needs.append('Do first: ');
      needs.append(el('strong', null, trophy.prereq.map((name) => `${name}${state.earned.has(name) ? ' ✓' : ''}`).join(' · ')));
      pane.append(needs);
    }
    // The trophy's place in the player's own plan, from the same queue the
    // Planner page renders — earned trophies report their plan as complete.
    const queue = buildPlan(state.trophies, state.earned, state.prefs);
    const spot = queue.find((item) => item.trophy.name === trophy.name);
    const plan = el('p', 'plan-line');
    if (earned) plan.append('In your plan: done — this one is already in the ledger.');
    else if (trophy.grade === 'platinum') plan.append('In your plan: last. The platinum pops by itself when the other 54 are earned.');
    else if (spot) plan.append(`In your plan: #${spot.position} of ${queue.length} to go — ${spot.reason}`);
    if (plan.childNodes.length) pane.append(plan);

    if (trophy.missable) {
      const warn = el('p', 'warn');
      warn.append(el('strong', null, 'Potentially missable. '));
      warn.append(document.createTextNode('The only trophy in the list that may be missed — do the Chapter 1 meditation before Chapter 1 ends. See the Missables page for the full warning.'));
      pane.append(warn);
    }
    pane.append(el('h3', null, 'Sources'));
    const sources = el('ul', 'sources');
    for (const source of trophy.sources) {
      const item = el('li', null);
      const link = document.createElement('a');
      link.href = source.url;
      link.rel = 'noopener';
      link.textContent = source.name;
      item.append(link);
      sources.append(item);
    }
    pane.append(sources);
    pane.append(el('h3', null, 'How to earn it'));
    pane.append(el('p', 'guide-text', trophy.guide));
    if (/not yet confirmed/i.test(trophy.guide)) {
      pane.append(el('p', 'unknown-note', 'Unconfirmed at launch: no guide has verified this method yet. This entry says so rather than guessing — check the cited guides for updates.'));
    }
    pane.append(el('h3', null, 'Your note'));
    const noteBox = document.createElement('textarea');
    noteBox.className = 'note-box';
    noteBox.rows = 3;
    noteBox.placeholder = 'Your own progress, a half-done count, a spot you found — saved in this browser only.';
    noteBox.value = state.notes[trophy.name] || '';
    noteBox.setAttribute('aria-label', `Your note on ${trophy.name}`);
    noteBox.addEventListener('change', () => onNote(trophy.name, noteBox.value));
    pane.append(noteBox);
    pane.append(el('p', 'note-hint', 'Notes are searched too, and travel with Export / Import.'));
  }

  const toggle = el('button', `earn-toggle${earned ? ' earned' : ''}`, earned ? '✓ Earned — tick to unmark' : 'Mark as earned');
  toggle.type = 'button';
  toggle.addEventListener('click', () => onToggle(trophy.name, !earned));
  pane.append(toggle);
}

// The Next-up planner page: a summary band (what is left, the two time-to-
// platinum figures), then the queue itself, grouped by chapter, each entry with
// its estimate, its prerequisites and the reason it sits there.
export function renderPlanner(state, els, onSelect, onToggle) {
  const eta = timeToPlatinum(state.trophies, state.earned, state.prefs.hoursPlayed);
  els.planSummary.replaceChildren();
  const summary = el('div', 'plan-cards');
  const cards = [
    { big: String(eta.remainingCount), small: 'trophies to go' },
    { big: `~${formatHours(eta.modelHours)}`, small: 'to the platinum, roadmap model' },
    { big: eta.paceHours === null ? '—' : `~${formatHours(eta.paceHours)}`, small: eta.paceHours === null ? 'set your hours played for a pace estimate' : 'at your pace so far' },
    { big: String(Object.keys(state.notes).length), small: 'trophies carry your notes' },
  ];
  for (const card of cards) {
    const node = el('div', 'fact');
    node.append(el('b', null, card.big));
    node.append(el('span', null, card.small));
    summary.append(node);
  }
  els.planSummary.append(summary);
  const how = el('p', 'plan-how', 'The queue is rebuilt from your ticks every time: prerequisites always come before what they unlock, the one missable trophy is protected at the front, and the focus above reorders the rest. Estimates are typical focused time per trophy and overlap — one session feeds several — so the roadmap model above, not their sum, is the honest total.');
  els.planSummary.append(how);

  const queue = buildPlan(state.trophies, state.earned, state.prefs);
  els.plannerQueue.replaceChildren();
  if (!queue.length) {
    els.plannerQueue.append(el('p', 'empty-note', 'Nothing left to plan — the platinum is yours. You are a Leonida Legend.'));
    return;
  }
  for (const group of groupPlan(queue)) {
    const section = el('section', 'plan-group');
    section.append(el('h3', 'plan-group-title', group.group));
    const list = el('ol', 'plan-list');
    for (const item of group.items) {
      const trophy = item.trophy;
      const hidden = trophyIsHidden(trophy, state);
      const row = el('li', 'plan-row');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = false;
      box.setAttribute('aria-label', `Mark ${hidden ? 'hidden story trophy' : trophy.name} as earned`);
      box.addEventListener('change', () => onToggle(trophy.name, box.checked));
      row.append(box);
      const main = el('button', 'plan-main');
      main.type = 'button';
      main.addEventListener('click', () => onSelect(trophy.id));
      const title = el('span', 'plan-name');
      title.append(el('span', 'plan-pos', `#${item.position}`));
      title.append(document.createTextNode(hidden ? 'Hidden story trophy' : trophy.name));
      if (trophy.missable) title.append(el('span', 'tag missable', 'Missable'));
      if (state.notes[trophy.name]) title.append(el('span', 'tag note-tag', 'Your note'));
      main.append(title);
      main.append(el('span', 'plan-meta', hidden ? 'Hidden until earned — the spoiler setting is on.' : `${trophy.chapter} · about ${formatHours(trophy.hours)}${trophy.target ? ` · PSN counts to ${trophy.target.toLocaleString()}` : ''}`));
      main.append(el('span', 'plan-reason', hidden ? 'A story trophy waiting at its chapter.' : item.reason));
      if (!hidden && (trophy.prereq || []).length) {
        main.append(el('span', 'plan-prereq', `After: ${trophy.prereq.map((name) => `${name}${state.earned.has(name) ? ' ✓' : ''}`).join(' · ')}`));
      }
      row.append(main);
      list.append(row);
    }
    section.append(list);
    els.plannerQueue.append(section);
  }
}

export function renderFacts(els) {
  els.factsStrip.replaceChildren();
  for (const fact of ROADMAP_FACTS) {
    const card = el('div', 'fact');
    card.append(el('b', null, fact.value));
    card.append(el('span', null, fact.label));
    els.factsStrip.append(card);
  }
}

export function renderRoadmap(state, els) {
  renderFacts(els);
  const eta = timeToPlatinum(state.trophies, state.earned, state.prefs.hoursPlayed);
  els.etaPanel.replaceChildren();
  const panel = el('section', 'eta-panel');
  panel.append(el('h2', null, 'Your time to the platinum'));
  const line = el('p', 'eta-line');
  if (eta.remainingCount === 0) {
    line.append('Done — every trophy is earned and the platinum has popped.');
  } else {
    line.append(`By the roadmap model about `);
    line.append(el('strong', null, `~${formatHours(eta.modelHours)}`));
    line.append(` of play remain across ${eta.remainingCount} trophies`);
    if (eta.paceHours !== null) {
      line.append(`; at your pace so far (${state.prefs.hoursPlayed} h played for ${state.earned.size} earned) it is closer to `);
      line.append(el('strong', null, `~${formatHours(eta.paceHours)}`));
    } else {
      line.append('. Set your hours played on the Planner tab and this page will also project your own pace.');
    }
    line.append('.');
  }
  panel.append(line);
  els.etaPanel.append(panel);

  const progress = stageProgress(state.trophies, state.earned);
  els.roadmapStages.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const stat = progress.find((s) => s.stage === stage.stage);
    const card = el('section', 'stage');
    card.append(el('p', 'stage-time', stage.time));
    card.append(el('h2', null, stage.title));
    const bar = el('div', 'progress-bar stage-bar');
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', `Stage ${stage.stage} progress`);
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', String(stat.pct));
    const fill = el('span', null);
    fill.style.width = `${stat.pct}%`;
    bar.append(fill);
    card.append(bar);
    card.append(el('p', 'stage-progress', `${stat.done} of ${stat.total} trophies earned · ${stat.pct}% complete · about ${formatHours(stat.hoursLeft)} of this stage's ~${stat.hoursTotal} h left`));
    card.append(el('p', 'lede', stage.lede));
    const trophies = state.trophies.filter((t) => t.stage === stage.stage);
    const chips = el('div', 'stage-trophies');
    for (const trophy of trophies) {
      const hidden = trophyIsHidden(trophy, state);
      chips.append(el('span', `tag${state.earned.has(trophy.name) ? ' done' : ''}`, hidden ? 'Hidden story trophy' : trophy.name));
    }
    card.append(chips);
    els.roadmapStages.append(card);
  }
  const note = el('p', 'stage-progress', 'Roadmap built from the official descriptions and PowerPyx\u2019s roadmap (difficulty 4/10, about 200 hours, one playthrough, no mission replay, free-roam after the story). Cheats disable trophies and saving — keep them off for the whole run.');
  els.roadmapStages.append(note);
}

export function renderMissables(state, els) {
  const body = els.missablesBody;
  body.replaceChildren();
  const missable = state.trophies.find((t) => t.missable);
  const callout = el('section', 'callout');
  callout.append(el('h2', null, 'The one trophy that may be missable'));
  if (missable) {
    const hidden = trophyIsHidden(missable, state);
    callout.append(el('p', null, hidden ? 'Positive Mental Attitude is hidden behind the spoiler setting until you earn it — its name is a story detail in itself. In short: meditate at every spot across Leonida, and do the Chapter 1 meditation before Chapter 1 ends.' : `“${missable.name}” — ${missable.description}`));
    if (!hidden) callout.append(el('p', null, missable.guide));
    // Where this trophy sits in the player's own plan right now.
    const queue = buildPlan(state.trophies, state.earned, state.prefs);
    const spot = queue.find((item) => item.trophy.name === missable.name);
    const planLine = el('p', 'plan-line');
    if (state.earned.has(missable.name)) planLine.append('In your plan: earned — the one missable is already safe in the ledger.');
    else if (spot) planLine.append(`In your plan: #${spot.position} of ${queue.length} to go — the planner holds it at the front while its Chapter 1 window is open.`);
    if (planLine.childNodes.length) callout.append(planLine);
  }
  callout.append(el('p', null, 'Why it matters: there is no mission replay and no New Game+, so a trophy that can only be done in Chapter 1 cannot be fixed later. PowerPyx is careful about this one — it is not yet confirmed whether the Chapter 1 meditation counts toward the trophy at all, which is exactly why the safe play is to do it.'));
  body.append(callout);

  const grid = el('div', 'two-col');
  const safe = el('section', 'panel');
  safe.append(el('h2', null, 'What is NOT missable'));
  const safeList = el('ul', null);
  for (const item of [
    'Every story trophy: they pop automatically as you finish chapters and missions.',
    'Every quest giver — Kenton, Andy, Billy, Randy, Tyrone and Bret — comes back and stays available in free-roam after the story.',
    'Strangers & Freaks: all strands are still there after the story.',
    'Optional missions: a few disappear over time, but there are far more than the 100 the checklist needs.',
    'Fences and magazine collectibles: ones that vanish are replaced by new fences and other spawn points, and neither blocks a trophy.',
    'The 100% checklist itself: nothing on it is missable.',
  ]) safeList.append(el('li', null, item));
  safe.append(safeList);
  grid.append(safe);

  const saves = el('section', 'panel');
  saves.append(el('h2', null, 'Save like a trophy hunter'));
  const saveList = el('ul', null);
  for (const item of [
    'You get 15 manual save slots plus 1 autosave. Keep a save at the start and the end of each chapter — 10 saves — and rotate the other 5 for free-roam cleanup.',
    'Make one extra save before the final mission, just in case.',
    'Do the Chapter 1 meditation at Jason\u2019s house the morning after Down to Earth, before Chapter 1 ends.',
    'Cheats disable trophies and saving. Keep them off for the whole run.',
    'The relationship between Jason and Lucia does not matter for trophies.',
  ]) saveList.append(el('li', null, item));
  saves.append(saveList);
  grid.append(saves);
  body.append(grid);
}
