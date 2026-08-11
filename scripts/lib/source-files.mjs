import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

async function hashFile(filePath) {
  const hash = createHash('sha256');
  await new Promise((resolveStream, rejectStream) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', resolveStream);
    stream.on('error', rejectStream);
  });
  return hash.digest('hex');
}

async function listFiles(path) {
  const entry = await stat(path);
  if (entry.isFile()) return [path];

  const children = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(children.map((child) => listFiles(join(path, child.name))));
  return nested.flat();
}

export async function archiveSources({ root, archiveRoot, sourceRoots }) {
  const absoluteRoot = resolve(root);
  const absoluteArchiveRoot = resolve(archiveRoot);
  const files = (await Promise.all(sourceRoots.map((sourceRoot) => listFiles(join(absoluteRoot, sourceRoot))))).flat();
  const manifestFiles = [];

  for (const sourcePath of files.sort()) {
    const relativePath = relative(absoluteRoot, sourcePath).replaceAll('\\', '/');
    const destinationPath = join(absoluteArchiveRoot, relativePath);
    const sourceHash = await hashFile(sourcePath);
    const sourceStats = await stat(sourcePath);

    try {
      const destinationHash = await hashFile(destinationPath);
      if (destinationHash !== sourceHash) {
        throw new Error(`Archive conflict for ${relativePath}`);
      }
    } catch (error) {
      if (error?.code === 'ENOENT') {
        await mkdir(dirname(destinationPath), { recursive: true });
        await copyFile(sourcePath, destinationPath);
      } else {
        throw error;
      }
    }

    manifestFiles.push({ relativePath, size: sourceStats.size, sha256: sourceHash });
  }

  return { files: manifestFiles.sort((left, right) => left.relativePath.localeCompare(right.relativePath)) };
}
