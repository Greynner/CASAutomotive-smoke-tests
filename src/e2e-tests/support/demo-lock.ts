import { type FileHandle, open, rm } from 'node:fs/promises';

/** Cross-process lock. A stale lock must be reviewed manually; never auto-expire it. */
export async function acquireDemoRunLock(
  path = '.auth/demo-run.lock',
): Promise<() => Promise<void>> {
  let handle: FileHandle;
  try {
    handle = await open(path, 'wx', 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(
        'A demo run lock already exists. Stop; review the active/stale process and private ledger before proceeding.',
      );
    }
    throw error;
  }
  let released = false;
  return async () => {
    if (released) return;
    released = true;
    try {
      await handle.close();
    } finally {
      await rm(path);
    }
  };
}
