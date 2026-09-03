/*
 * Runs the test suite in a copy of the tracked files placed outside this
 * checkout, with a fresh install.
 *
 * Node resolves modules by walking UP the directory tree, so a checkout nested
 * inside another checkout of the same repo -- a git worktree under
 * .claude/worktrees, for example -- silently borrows the parent's
 * node_modules. Deleting node_modules locally does not help. That is how a
 * missing `sinon` declaration passed locally and failed every CI leg.
 *
 * CI gets this for free from a clean checkout. This gives it to you locally.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(), 'skuid-sfdx-isolated-'));
let failed = false;
try {
  const tracked = execFileSync('git', ['ls-files'], { cwd: projectRoot, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  for (const file of tracked) {
    mkdirSync(join(work, dirname(file)), { recursive: true });
    cpSync(join(projectRoot, file), join(work, file));
  }
  console.log(`  copied ${tracked.length} tracked files to ${work}`);

  console.log('  installing...');
  execFileSync('yarn', ['install', '--frozen-lockfile'],
    { cwd: work, encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'],
      env: { ...process.env, GITHUB_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN ?? '' } });

  console.log('  running the suite with nothing borrowable...\n');
  process.stdout.write(execFileSync('npx', ['mocha'], { cwd: work, encoding: 'utf8' }));
} catch (e) {
  failed = true;
  console.error('\n  ✗ suite failed in isolation -- something works here only because a parent');
  console.error('    directory is supplying it. Check package.json declarations.\n');
  console.error(String(e.stdout || e.stderr || e.message).trim().split('\n').slice(-25).join('\n'));
} finally {
  rmSync(work, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
