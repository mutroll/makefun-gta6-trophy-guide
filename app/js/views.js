// Views: the tracker list, the trophy detail pane, the roadmap and the missables pages.
// All guide text comes from data/trophies.json; this file only lays it out.

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
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.earnedFilter === 'earned' && !state.earned.has(t.name)) return false;
    if (state.earnedFilter === 'remaining' && state.earned.has(t.name)) return false;
    if (query) {
      const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
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
  els.progressFill.style.width = `${Math.round((earned / total) * 100)}%`;
  const byGrade = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => {
      const count = state.trophies.filter((t) => t.grade === g).length;
      const done = state.trophies.filter((t) => t.grade === g && state.earned.has(t.name)).length;
      return `${GRADE_LABELS[g]} ${done}/${count}`;
    })
    .join(' · ');
  els.gradeCounts.textContent = byGrade;
  const next = state.trophies
    .filter((t) => !state.earned.has(t.name))
    .sort((a, b) => a.stage - b.stage || a.id - b.id)[0];
  els.nextUp.replaceChildren();
  if (next) {
    els.nextUp.append('Next up: ');
    const hidden = trophyIsHidden(next, state);
    const strong = el('strong', null, hidden ? 'a hidden story trophy' : next.name);
    els.nextUp.append(strong);
    // A hidden trophy's description is a spoiler too: never show it while masked.
    els.nextUp.append(hidden ? ' — earn it to reveal its name.' : ` — ${next.description}`);
  } else {
    els.nextUp.append('Platinum earned. You are a Leonida Legend.');
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

    button.append(el('span', `medal ${trophy.grade}`, null));
    button.querySelector('.medal').title = GRADE_LABELS[trophy.grade];

    const main = el('span', null);
    main.append(el('span', 'trophy-name', hidden ? 'Hidden story trophy' : trophy.name));
    main.append(el('span', 'trophy-desc', hidden ? 'Hidden until earned — the spoiler setting is on.' : trophy.description));
    const tags = el('span', 'trophy-tags');
    for (const kind of trophy.kinds) tags.append(el('span', 'tag', KIND_LABELS[kind]));
    if (trophy.missable) tags.append(el('span', 'tag missable', 'Potentially missable'));
    if (trophy.hidden) tags.append(el('span', 'tag hidden-tag', 'Hidden on PSN'));
    main.append(tags);
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

export function renderDetail(state, els, onToggle) {
  const pane = els.detailPane;
  pane.replaceChildren();
  const trophy = state.trophies.find((t) => t.id === state.selectedId) || null;
  if (!trophy) {
    pane.append(el('h2', null, 'Pick a trophy'));
    pane.append(el('p', 'guide-text', 'Select any trophy on the left to see its guide, its sources and when to earn it. Tick the box beside a trophy when you have earned it — your progress is saved in this browser.'));
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
  }

  const toggle = el('button', `earn-toggle${earned ? ' earned' : ''}`, earned ? '✓ Earned — tick to unmark' : 'Mark as earned');
  toggle.type = 'button';
  toggle.addEventListener('click', () => onToggle(trophy.name, !earned));
  pane.append(toggle);
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
  els.roadmapStages.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const card = el('section', 'stage');
    card.append(el('p', 'stage-time', stage.time));
    card.append(el('h2', null, stage.title));
    card.append(el('p', 'lede', stage.lede));
    const trophies = state.trophies.filter((t) => t.stage === stage.stage);
    const done = trophies.filter((t) => state.earned.has(t.name)).length;
    const chips = el('div', 'stage-trophies');
    for (const trophy of trophies) {
      const hidden = trophyIsHidden(trophy, state);
      chips.append(el('span', `tag${state.earned.has(trophy.name) ? ' done' : ''}`, hidden ? 'Hidden story trophy' : trophy.name));
    }
    card.append(chips);
    card.append(el('p', 'stage-progress', `${done} of ${trophies.length} trophies in this stage earned`));
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
