/*
 * Audits the dependency tree for known advisories.
 *
 * The repo accumulated seven open advisories unnoticed because nothing in CI
 * ever audited anything.
 *
 * Runtime dependencies are what ship to consumers, so high and critical
 * findings there fail the build. Everything else -- lower severities, and the
 * dev tree -- is reported without failing, deliberately: today's advisories
 * were mostly transitive and sometimes genuinely unfixable (a parent capping
 * the version), and a hard gate on those would leave master permanently red,
 * which is the failure mode AB#545952 already had to dig out of.
 *
 * `npm audit` needs an npm lockfile and this project uses yarn, so the lock is
 * generated from package.json in a temp directory rather than committed.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
const work = mkdtempSync(join(tmpdir(), 'skuid-sfdx-audit-'));

const auditIn = (dir, omitDev) => {
  // npm audit exits 0 when clean and non-zero when it finds advisories, and puts
  // its report on stdout either way -- so a non-zero exit is not itself an error.
  // What IS an error is stdout that will not parse, or that carries no
  // `vulnerabilities` key: that means audit never ran (registry unreachable,
  // auth failure, npm crash). Returning "no advisories" in that case would let a
  // security check pass while auditing nothing, so it throws instead and the
  // caller fails the build.
  let stdout;
  try {
    stdout = execFileSync('npm', ['audit', '--json', ...(omitDev ? ['--omit=dev'] : [])],
      { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    stdout = e.stdout;
  }

  let parsed;
  try {
    parsed = JSON.parse(stdout ?? '');
  } catch {
    throw new Error(
      `npm audit produced no parseable JSON, so nothing was audited: ` +
      `${String(stdout ?? '(no output)').trim().slice(0, 300)}`
    );
  }
  if (parsed.error) {
    throw new Error(`npm audit reported an error: ${JSON.stringify(parsed.error).slice(0, 300)}`);
  }
  if (typeof parsed.vulnerabilities !== 'object' || parsed.vulnerabilities === null) {
    throw new Error('npm audit JSON has no "vulnerabilities" object, so its output cannot be trusted.');
  }
  return parsed.vulnerabilities;
};

const report = (label, vulns) => {
  const rows = Object.values(vulns).filter(v => (v.via ?? []).length);
  if (!rows.length) { console.log(`  ${label}: 0 advisories`); return rows; }
  console.log(`  ${label}: ${rows.length} advisor${rows.length === 1 ? 'y' : 'ies'}`);
  for (const v of rows.sort((a, b) => a.name.localeCompare(b.name))) {
    const titles = (v.via ?? []).filter(x => typeof x === 'object').map(x => x.title).slice(0, 1);
    console.log(`      ${(v.severity || '?').toUpperCase().padEnd(9)} ${v.name} ${v.range}${titles.length ? ` -- ${titles[0]}` : ''}`);
  }
  return rows;
};

let failed = false;
try {
  writeFileSync(join(work, 'package.json'), JSON.stringify({
    name: 'audit-probe', version: '1.0.0', private: true,
    dependencies: pkg.dependencies ?? {}, devDependencies: pkg.devDependencies ?? {},
  }, null, 2));
  execFileSync('npm', ['install', '--package-lock-only', '--loglevel=error', '--fetch-retries=1', '--fetch-timeout=20000'],
    { cwd: work, encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'] });

  console.log('\nRuntime dependencies (shipped to consumers):');
  const runtime = report('runtime', auditIn(work, true));
  const blocking = runtime.filter(v => ['high', 'critical'].includes(v.severity));

  console.log('\nFull tree (dev included, reported only):');
  report('full', auditIn(work, false));

  if (blocking.length) {
    console.error(`\n✗ ${blocking.length} high/critical advisor${blocking.length === 1 ? 'y' : 'ies'} in dependencies that ship: ` +
      blocking.map(v => v.name).join(', '));
    failed = true;
  } else {
    console.log('\nNo high or critical advisories in shipped dependencies.');
  }
} catch (e) {
  console.error('audit check errored:', String(e.stderr || e.message).trim().slice(-500));
  failed = true;
} finally {
  rmSync(work, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
