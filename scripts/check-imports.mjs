/*
 * Fails if any bare import in src/ or test/ is not declared in package.json.
 *
 * This exists because `glob` was imported here but never declared, which shipped
 * broken to every consumer whose install hoisted glob 9+ (skuid-sfdx#29).
 * Ordinary tests do not catch that: they resolve against whatever happens to be
 * in node_modules rather than against what package.json actually declares.
 *
 * Scope: this checks specifiers written in src/ and test/. It does NOT catch a
 * dependency that some other package require()s at runtime -- `sinon`, which
 * @salesforce/core's TestContext loads internally, is that case, and the guard
 * for it is running the suite in a clean checkout (which CI does, and which
 * `yarn check:isolated` reproduces locally).
 *
 * It also fails when a module resolves from OUTSIDE the project directory. Node
 * walks up the directory tree, so a checkout nested inside another checkout of
 * the same repo -- a git worktree, say -- silently borrows the parent's
 * dependencies. That is exactly how the missing `sinon` passed locally and
 * failed in CI.
 */
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(projectRoot, 'noop.cjs'));

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

// Bare specifiers only: anything not starting with '.' or 'node:'.
const specifiers = new Map();
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const [, spec] of source.matchAll(/(?:from|import)\s*\(?\s*['"]([^.'"][^'"]*)['"]/g)) {
    if (spec.startsWith('node:')) continue;
    if (!specifiers.has(spec)) specifiers.set(spec, file);
  }
}

const failures = [];
for (const [spec, firstSeenIn] of [...specifiers].sort()) {
  const where = relative(projectRoot, firstSeenIn);
  let resolved;
  try {
    resolved = require.resolve(spec);
  } catch {
    failures.push(`${spec} -- UNRESOLVABLE (imported by ${where}). Add it to package.json.`);
    continue;
  }
  if (!resolved.startsWith(projectRoot)) {
    failures.push(
      `${spec} -- resolved OUTSIDE the project, from ${resolved}.\n` +
      `      It is not installed here; a parent directory is supplying it. ` +
      `Declare it in package.json and verify in a checkout that is not nested inside another.`
    );
    continue;
  }
  console.log(`  ok  ${spec}`);
}

if (failures.length) {
  console.error(`\n${failures.length} undeclared or externally-resolved import(s):\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n${specifiers.size} bare imports, all declared and resolved from within the project.`);
