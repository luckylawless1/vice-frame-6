// VICE FRAME 6 — hand-in program for the gta6-cover-art-01 bounty.
//
// What this file does, in order:
//   1. Works out where the finished entry should land. The grader sets
//      MAKEFUN_OUTPUT_DIR; a human running this by hand usually does too.
//      An empty value counts as "not set" and falls back to /output.
//   2. Mirrors the two payload folders of this repository — app/ (the
//      offline cover-art maker) and screenshots/ (its four captures) —
//      into that output folder.
//   3. Asks the vendored make.fun library to summarise the output folder
//      as a dossier, using the competition's published caps, and stores
//      the returned bytes as dossier.json.
// Any failure along the way aborts with a non-zero exit code and a
// message naming the step that broke, so a broken hand-in is loud
// instead of silently empty.
//
// Run it with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const CAPS_FOR_THIS_BOUNTY = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function fail(step, err) {
  console.error(`vice-frame-6 hand-in failed at "${step}": ${err && err.message ? err.message : err}`);
  process.exit(1);
}

function pickOutputRoot(env) {
  const fromEnv = env.MAKEFUN_OUTPUT_DIR;
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv;
  return '/output';
}

function copyPayload(repoRoot, outputRoot) {
  for (const folder of ['app', 'screenshots']) {
    const from = join(repoRoot, folder);
    if (!existsSync(from)) throw new Error(`payload folder is missing: ${from}`);
    cpSync(from, join(outputRoot, folder), { recursive: true });
  }
}

function main() {
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const outputRoot = pickOutputRoot(process.env);

  try {
    mkdirSync(outputRoot, { recursive: true });
  } catch (err) {
    fail('create output directory', err);
  }

  try {
    copyPayload(repoRoot, outputRoot);
  } catch (err) {
    fail('copy app/ and screenshots/', err);
  }

  let dossierBytes;
  try {
    dossierBytes = buildDossier(outputRoot, CAPS_FOR_THIS_BOUNTY);
  } catch (err) {
    fail('build dossier', err);
  }

  try {
    writeFileSync(join(outputRoot, 'dossier.json'), dossierBytes);
  } catch (err) {
    fail('write dossier.json', err);
  }

  console.log(`vice-frame-6: entry written to ${outputRoot} (dossier ${dossierBytes.length} bytes)`);
}

main();
