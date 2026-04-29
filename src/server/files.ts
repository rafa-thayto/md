import { basename } from 'path';
import chokidar from 'chokidar';
import type { FileNode, WebSocketMessage } from '../types';

type DirNode = Extract<FileNode, { type: 'directory' }>;

function makeDir(name: string, path: string): DirNode {
  return { type: 'directory', name, path, children: [] };
}

function makeFile(name: string, path: string): FileNode {
  return { type: 'file', name, path };
}

export async function findMarkdownFiles(rootPath: string): Promise<FileNode> {
  const glob = new Bun.Glob('**/*.{md,markdown}');
  const root = makeDir(basename(rootPath), '');

  for await (const file of glob.scan({ cwd: rootPath, onlyFiles: true })) {
    insertIntoTree(root, file);
  }

  return root;
}

function findOrCreateChild(parent: DirNode, name: string, path: string, isFile: boolean): FileNode {
  const existing = parent.children.find(c => c.name === name);
  if (existing) return existing;

  const child = isFile ? makeFile(name, path) : makeDir(name, path);
  parent.children.push(child);
  return child;
}

function insertIntoTree(root: DirNode, filePath: string): void {
  const parts = filePath.split('/');
  let current: DirNode = root;

  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    const path = parts.slice(0, i + 1).join('/');
    const child = findOrCreateChild(current, parts[i], path, isLast);

    if (child.type === 'directory') current = child;
  }
}

export function watchMarkdownFiles(
  rootPath: string,
  onChange: (message: WebSocketMessage) => void
): () => void {
  const watcher = chokidar.watch('**/*.{md,markdown}', {
    cwd: rootPath,
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('add', (filePath) => {
    onChange({ type: 'file-added', path: filePath });
  });

  watcher.on('change', (filePath) => {
    onChange({ type: 'file-changed', path: filePath });
  });

  watcher.on('unlink', (filePath) => {
    onChange({ type: 'file-removed', path: filePath });
  });

  return () => watcher.close();
}
