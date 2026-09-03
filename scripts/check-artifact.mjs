/*
 * Packs the plugin, installs it somewhere clean with production dependencies
 * only, and verifies it actually loads.
 *
 * This is the check that would have caught skuid-sfdx#29 before release. The
 * full suite passed while the published plugin was broken for consumers,
 * because tests import from src/ against the repo's own node_modules -- neither
 * the packed output nor a fresh dependency resolution was ever exercised.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// Deliberately outside the project so nothing can be borrowed from it.
const work = mkdtempSync(join(tmpdir(), 'skuid-sfdx-artifact-'));
let failed = false;
try {
  console.log('  packing...');
  const packed = run('npm', ['pack', '--pack-destination', work], projectRoot).trim().split('\n').pop();
  const tarball = join(work, packed);
  console.log(`  packed ${packed}`);

  // mkdirSync, not an external `mkdir`: on Windows that is a shell builtin with
  // no executable, so execFile would fail with ENOENT. tar is fine -- Windows has
  // shipped tar.exe since Server 2019 / Windows 10 1803.
  const extracted = join(work, 'pkg');
  mkdirSync(extracted, { recursive: true });
  run('tar', ['xzf', tarball, '-C', extracted, '--strip-components=1']);

  for (const required of ['lib', 'messages', 'oclif.manifest.json', 'package.json']) {
    if (!existsSync(join(extracted, required))) throw new Error(`tarball is missing ${required}`);
  }
  console.log(`  contents: ${readdirSync(extracted).join(', ')}`);

  // Fresh resolution of the DECLARED dependencies, which is what a consumer gets.
  console.log('  installing production dependencies in isolation...');
  run('npm', ['install', '--omit=dev', '--no-audit', '--no-fund', '--loglevel=error', '--fetch-retries=1', '--fetch-timeout=20000'], extracted);

  // Every command in the manifest must import cleanly and expose a command class.
  console.log('  importing every command from the packed output...');
  const probe = `
    import { readFileSync } from 'node:fs';
    const manifest = JSON.parse(readFileSync('./oclif.manifest.json', 'utf8'));
    const ids = Object.keys(manifest.commands);
    if (!ids.length) { console.error('manifest lists no commands'); process.exit(1); }
    for (const id of ids) {
      const rel = './lib/commands/' + id.split(':').join('/') + '.js';
      const mod = await import(rel);
      if (typeof mod.default !== 'function') { console.error(id + ': no command class default export'); process.exit(1); }
      // Flags are reported, not required. This check is about whether the packed
      // artifact loads; a command with no flags of its own is legitimate and
      // should not be rejected for a reason unrelated to that.
      const flags = Object.keys(mod.default.flags ?? {});
      console.log('    ok ' + id + ' -> ' + mod.default.name + (flags.length ? ' [' + flags.join(', ') + ']' : ' (no flags)'));
    }
  `;
  process.stdout.write(run(process.execPath, ['--input-type=module', '-e', probe], extracted));
  console.log('\n  packed artifact installs and loads with only its declared dependencies.');
} catch (e) {
  failed = true;
  console.error('\n  ✗ artifact check failed');
  console.error(String(e.stderr || e.message).trim().split('\n').slice(-15).join('\n'));
} finally {
  rmSync(work, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
