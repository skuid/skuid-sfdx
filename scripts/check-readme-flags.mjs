/*
 * Cross-checks the README's command reference against the oclif manifest.
 *
 * The README documented a `--loglevel` flag that sf-plugins-core had removed,
 * and spelled `--api-version` as `--apiversion`. Both had been wrong long
 * enough that nobody noticed, and anyone following the README got an error.
 *
 * The reference is maintained by hand on purpose: the only thing that
 * regenerates it, `oclif readme`, writes the running machine's resolved flag
 * defaults into this public file -- including the developer's default org
 * username. Hand-maintained plus this check is safer than generated.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(projectRoot, 'oclif.manifest.json');
const npx = (...args) => execFileSync('npx', args, { cwd: projectRoot, stdio: ['ignore', 'ignore', 'inherit'] });

// Build first if needed. `oclif manifest` reads the COMPILED commands in lib/;
// run without a build it emits an empty manifest and warns only in passing,
// which would make every documented flag look invented.
if (!existsSync(join(projectRoot, 'lib'))) {
  console.log('  lib/ absent; building');
  npx('tsc', '-b');
}
if (!existsSync(manifestPath)) {
  // Generated rather than required, so this check does not depend on running
  // before check-artifact (whose `npm pack` triggers postpack, which deletes it).
  console.log('  oclif.manifest.json absent; generating it');
  npx('oclif', 'manifest');
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// Guard against comparing against an empty manifest: that is a broken build,
// not a README full of invented flags, and reporting it as the latter sends
// whoever hits it in precisely the wrong direction.
const commandCount = Object.keys(manifest.commands ?? {}).length;
if (!commandCount) {
  console.error('oclif.manifest.json lists no commands -- the build is missing or stale.');
  console.error('Run `yarn prepack` and try again.');
  process.exit(1);
}
const readme = readFileSync(join(projectRoot, 'README.md'), 'utf8');

// Flags named in README table rows, e.g. "| `-d, --dir=<value>` | ... |"
const documented = new Set([...readme.matchAll(/\|\s*`-?\w?,?\s*--([a-z-]+)[=`]/g)].map(m => m[1]));

const real = new Set();
// `flags` can legitimately be absent for a command that declares none; without
// the guard Object.keys(undefined) throws and the check fails for a reason that
// has nothing to do with README drift.
for (const command of Object.values(manifest.commands)) {
  for (const f of Object.keys(command.flags ?? {})) real.add(f);
}

// --- Guards against the two ways machine-specific data reaches this file ---
//
// 1. `oclif readme` fills content between its markers. Removing the markers
//    neutralised it (verified: it is now a no-op on this README), so their
//    reappearance re-arms a command that overwrites hand-written prose and
//    bakes in the running machine's resolved flag defaults.
// 2. `sf skuid page <cmd> --help` renders the resolved default target-org, e.g.
//    "[default: someone@their-org.example]". The docs instruct updating the
//    tables from --help, so pasting it verbatim leaks whoever ran it.
//
// Neither belongs in a public file, so both fail rather than being discouraged.
const guardFailures = [];

const markers = ['<!-- usage -->', '<!-- commands -->', '<!-- toc -->'];
const presentMarkers = markers.filter(m => readme.includes(m));
if (presentMarkers.length) {
  guardFailures.push(
    `oclif generation markers present: ${presentMarkers.join(', ')}.\n` +
    '    These re-arm `oclif readme`, which overwrites the hand-written reference and\n' +
    "    writes the running machine's default org into it. Remove them."
  );
}

for (const [match, value] of readme.matchAll(/\[default:([^\]]*)\]/g)) {
  // Allow documentation placeholders -- prose that warns about this pattern has
  // to be able to name it. A real leak carries a concrete value.
  const placeholder = ['...', '…'].includes(value.trim()) || value.trim().startsWith('<');
  if (placeholder) continue;
  guardFailures.push(
    `machine-specific default documented: ${match}\n` +
    '    --help renders defaults resolved from whoever ran it, including their default\n' +
    '    org username. Describe defaults in prose instead, e.g. "Defaults to `skuidpages`".'
  );
}

const undocumented = [...real].filter(f => !documented.has(f)).sort();
const phantom = [...documented].filter(f => !real.has(f)).sort();

console.log(`  manifest flags:   ${[...real].sort().join(', ')}`);
console.log(`  README documents: ${[...documented].sort().join(', ')}`);

let failed = false;
if (guardFailures.length) {
  console.error('');
  for (const g of guardFailures) console.error(`  ✗ ${g}`);
  failed = true;
}
if (undocumented.length) {
  console.error(`\n  ✗ real flags missing from the README: ${undocumented.join(', ')}`);
  failed = true;
}
if (phantom.length) {
  console.error(`\n  ✗ README documents flags that do not exist: ${phantom.join(', ')}`);
  console.error('    Update the tables from `sf skuid page <command> --help`.');
  failed = true;
}
if (!failed) {
  console.log(`\n  README matches the manifest: ${real.size} flags, none missing, none invented.`);
  console.log('  No oclif markers, no machine-specific defaults.');
}
process.exit(failed ? 1 : 0);
