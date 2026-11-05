import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireDemoRunLock } from '../../src/e2e-tests/support/demo-lock.js';

test('an active demo lock prevents a second process from acquiring the same ledger', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cas-demo-lock-'));
  const path = join(root, 'run.lock');
  const release = await acquireDemoRunLock(path);
  try {
    await expect(acquireDemoRunLock(path)).rejects.toThrow('lock already exists');
    await access(path); // Success means the lock exists; Bun/Node differ in the resolved void value.
    const moduleUrl = new URL('../../src/e2e-tests/support/demo-lock.ts', import.meta.url).href;
    const child = spawnSync(
      process.execPath,
      [
        '--eval',
        `
      const { acquireDemoRunLock } = await import(${JSON.stringify(moduleUrl)});
      try { const release = await acquireDemoRunLock(${JSON.stringify(path)}); await release(); process.exit(0); }
      catch (error) { process.exit(String(error.message).includes('lock already exists') ? 2 : 3); }
    `,
      ],
      { env: { ...process.env, RUN_DEMO_TESTS: '0', AUTHORIZE_DEMO_CHECKOUT: '0' } },
    );
    expect(child.status, 'A separate OS process must also be excluded').toBe(2);
  } finally {
    await release();
    await rm(root, { recursive: true, force: true });
  }
});

test('release is idempotent and permits a later explicit run', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cas-demo-lock-'));
  const path = join(root, 'run.lock');
  try {
    const release = await acquireDemoRunLock(path);
    await release();
    await release();
    const nextRelease = await acquireDemoRunLock(path);
    await nextRelease();
    await expect(access(path)).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('an invalid lock location fails instead of continuing without a lock', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cas-demo-lock-'));
  try {
    await expect(acquireDemoRunLock(join(root, 'missing', 'run.lock'))).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
