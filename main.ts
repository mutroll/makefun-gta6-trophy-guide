// Leonida Ledger — the GTA VI trophy guide entry for gta6-trophy-guide-01 (Node 22, stdlib only).
// The guide itself is plain static files under app/ (index.html, CSS, ES modules, data/trophies.json),
// served by any static server and working with the network off. This program hands it in: it copies
// app/ and screenshots/ from beside this file to /output and writes /output/dossier.json with the
// vendored make.fun library, exactly as the scorer rebuilds it. Before copying, it validates the
// trophy data the guide's Next-up planner runs on: all 55 trophies, each with a guide, a chapter
// window, an hours estimate and a prerequisite list, so a malformed data file fails here rather
// than in front of the judge. Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program is deterministic: two runs over the same repository write the same bytes.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The entry is app/ plus its screenshots: refuse early if either is missing, rather than
// handing in a half-empty output directory.
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');
if (!statSync(appDir, { throwIfNoEntry: false })?.isDirectory()) {
  throw new Error('app/ is missing from the repository');
}
if (!statSync(shotsDir, { throwIfNoEntry: false })?.isDirectory()) {
  throw new Error('screenshots/ is missing from the repository');
}
const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
}
// Each screenshot must be a whole PNG or JPEG within the gate's 256 KiB cap.
for (const name of shots) {
  const file = join(shotsDir, name);
  const stats = statSync(file);
  if (!stats.isFile()) throw new Error(`screenshots/${name} is not a regular file`);
  if (!/\.(png|jpe?g)$/i.test(name)) throw new Error(`screenshots/${name} is not a PNG or JPEG`);
  if (stats.size > 262144) throw new Error(`screenshots/${name} is over the 256 KiB cap`);
}

// The planner is only as good as its data: check the trophy file before handing
// anything in. Every one of the 55 trophies needs a non-blank guide and the three
// planner fields (chapter, hours, prereq), and every prerequisite must name a
// trophy in the same list — a typo here would strand a trophy at the back of the
// queue forever, so it is a build error, not a shrug.
const trophyDoc = JSON.parse(readFileSync(join(appDir, 'data', 'trophies.json'), 'utf8'));
const trophyList = Array.isArray(trophyDoc) ? trophyDoc : trophyDoc.trophies;
if (!Array.isArray(trophyList) || trophyList.length !== 55) {
  throw new Error(`app/data/trophies.json must hold exactly 55 trophies, found ${Array.isArray(trophyList) ? trophyList.length : 'none'}`);
}
const trophyNames = new Set(trophyList.map((t) => t.name));
for (const trophy of trophyList) {
  if (typeof trophy.name !== 'string' || !trophy.name) throw new Error('a trophy has no name');
  if (typeof trophy.guide !== 'string' || !trophy.guide.trim()) throw new Error(`${trophy.name} has no guide`);
  if (typeof trophy.chapter !== 'string' || !trophy.chapter) throw new Error(`${trophy.name} has no planner chapter`);
  if (!Number.isFinite(trophy.hours) || trophy.hours < 0) throw new Error(`${trophy.name} has no planner hours estimate`);
  if (!Array.isArray(trophy.prereq)) throw new Error(`${trophy.name} has no planner prerequisite list`);
  for (const need of trophy.prereq) {
    if (!trophyNames.has(need)) throw new Error(`${trophy.name} lists an unknown prerequisite: ${need}`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse
// an entry the scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files
// and directories in app/ or 48 MiB of app files: app/ counts beside /output's own 1000-entry cap,
// its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
