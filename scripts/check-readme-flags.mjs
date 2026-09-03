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
if (!existsSync(manifestPath)) {
  // Generate it rather than erroring, so this check does not depend on running
  // before check-artifact (whose `npm pack` triggers postpack, which deletes it).
  console.log('  oclif.manifest.json absent; generating it');
  execFileSync('npx', ['oclif', 'manifest'], { cwd: projectRoot, stdio: ['ignore', 'ignore', 'inherit'] });
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const readme = readFileSync(join(projectRoot, 'README.md'), 'utf8');

// Flags named in README table rows, e.g. "| `-d, --dir=<value>` | ... |"
const documented = new Set([...readme.matchAll(/\|\s*`-?\w?,?\s*--([a-z-]+)[=`]/g)].map(m => m[1]));

const real = new Set();
for (const command of Object.values(manifest.commands)) for (const f of Object.keys(command.flags)) real.add(f);

const undocumented = [...real].filter(f => !documented.has(f)).sort();
const phantom = [...documented].filter(f => !real.has(f)).sort();

console.log(`  manifest flags:   ${[...real].sort().join(', ')}`);
console.log(`  README documents: ${[...documented].sort().join(', ')}`);

let failed = false;
if (undocumented.length) {
  console.error(`\n  ✗ real flags missing from the README: ${undocumented.join(', ')}`);
  failed = true;
}
if (phantom.length) {
  console.error(`\n  ✗ README documents flags that do not exist: ${phantom.join(', ')}`);
  console.error('    Update the tables from `sf skuid page <command> --help`.');
  failed = true;
}
if (!failed) console.log(`\n  README matches the manifest: ${real.size} flags, none missing, none invented.`);
process.exit(failed ? 1 : 0);
