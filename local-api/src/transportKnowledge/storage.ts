import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import type { SnapshotFile, TransportCatalog } from './contracts.js';

const catalogFileName = 'transport-catalog.json';

export async function writeSnapshot(
  root: string,
  catalog: TransportCatalog,
  files: readonly SnapshotFile[]
): Promise<void> {
  const snapshotRoot = resolve(root);
  await mkdir(snapshotRoot, { recursive: true });

  await writeFile(
    resolveInsideRoot(snapshotRoot, catalogFileName),
    `${JSON.stringify(catalog, null, 2)}\n`
  );

  for (const file of files) {
    const targetPath = resolveInsideRoot(snapshotRoot, file.relativePath);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, file.contents);
  }
}

function resolveInsideRoot(root: string, relativePath: string): string {
  const targetPath = resolve(root, relativePath);
  const pathFromRoot = relative(root, targetPath);

  if (pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
    throw new Error(`Snapshot file path resolves outside snapshot root: ${relativePath}`);
  }

  return targetPath;
}
