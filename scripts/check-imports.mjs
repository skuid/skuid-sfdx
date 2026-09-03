/*
 * Fails if any bare import in src/ or test/ is not DECLARED in package.json.
 *
 * This exists because `glob` was imported here but never declared. It resolved
 * anyway -- some transitive dependency had hoisted a copy into node_modules --
 * so every test passed while the published plugin was broken for any consumer
 * whose own install resolved a different major (skuid-sfdx#29).
 *
 * That is why resolvability is not the test. At the time of writing this tree
 * has 439 packages installed transitively that are absent from package.json;
 * any of them would resolve cleanly. Declaration is what actually matters,
 * because a consumer only gets what is declared.
 *
 * Three distinct failures, each a real bug with a different fix:
 *
 *   not declared            imported but missing from package.json -- ships broken
 *   declared, not installed package.json and the lockfile disagree
 *   resolved outside        Node walks UP the directory tree, so a checkout
 *                           nested inside another checkout of this repo (a git
 *                           worktree, say) borrows the parent's node_modules.
 *                           Deleting node_modules locally does not help.
 *
 * Scope: specifiers written in src/ and test/. A dependency that some other
 * package require()s at runtime is out of scope -- `sinon`, loaded internally by
 * @salesforce/core's TestContext, is that case. The guard for it is running the
 * suite in a clean checkout: CI does, and `yarn check:isolated` does locally.
 */
import { builtinModules, createRequire } from 'node:module';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(projectRoot, 'noop.cjs'));
const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));

const declared = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.optionalDependencies ?? {}),
]);
const builtins = new Set(builtinModules);

// "@scope/pkg/sub" -> "@scope/pkg";  "pkg/sub" -> "pkg"
const packageNameOf = (spec) => {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
};

const collectTsFiles = (dir, skip = new Set(['node_modules', 'lib', 'fixtures', '.git'])) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!skip.has(entry)) out.push(...collectTsFiles(full, skip));
    } else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
};

const files = [...collectTsFiles(join(projectRoot, 'src')), ...collectTsFiles(join(projectRoot, 'test'))];

const specifiers = new Map();
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const [, spec] of source.matchAll(/(?:from|import)\s*\(?\s*['"]([^.'"][^'"]*)['"]/g)) {
    if (!specifiers.has(spec)) specifiers.set(spec, file);
  }
}

const failures = [];
let checked = 0;
for (const [spec, firstSeenIn] of [...specifiers].sort()) {
  const bare = spec.startsWith('node:') ? spec.slice(5) : spec;
  if (builtins.has(bare) || builtins.has(packageNameOf(bare))) continue;

  const where = relative(projectRoot, firstSeenIn);
  const name = packageNameOf(spec);
  checked++;

  if (!declared.has(name)) {
    failures.push(
      `${spec} -- "${name}" is NOT DECLARED in package.json (imported by ${where}).\n` +
      '      It may resolve here from a transitive copy, but consumers only get what is\n' +
      '      declared. Add it to dependencies (or devDependencies for test-only use).'
    );
    continue;
  }

  let resolved;
  try {
    resolved = require.resolve(spec);
  } catch {
    failures.push(`${spec} -- declared but NOT INSTALLED; package.json and the lockfile disagree. Re-run install.`);
    continue;
  }
  if (!resolved.startsWith(projectRoot)) {
    failures.push(
      `${spec} -- resolved OUTSIDE the project, from ${resolved}.\n` +
      '      A parent directory is supplying it. Verify in a checkout that is not nested\n' +
      '      inside another checkout of this repo.'
    );
    continue;
  }
  console.log(`  ok  ${spec.padEnd(34)} (declared: ${name})`);
}

if (failures.length) {
  console.error(`\n${failures.length} import problem(s):\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n${checked} bare imports, all declared in package.json and resolved from within the project.`);
