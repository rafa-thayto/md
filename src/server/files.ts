import { glob } from 'glob';
import { relative, dirname, basename, join } from 'path';
import chokidar from 'chokidar';
import type { FileNode, WebSocketMessage } from '../types';

export async function findMarkdownFiles(rootPath: string): Promise<FileNode> {
  const files = await glob('**/*.{md,markdown}', {
    cwd: rootPath,
    nodir: true,
    dot: false
  });

  const root: FileNode = {
    name: basename(rootPath),
    path: '',
    type: 'directory',
    children: []
  };

  for (const file of files) {
    insertIntoTree(root, file);
  }

  return root;
}

function insertIntoTree(root: FileNode, filePath: string): void {
  const parts = filePath.split('/');
  let current = root;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isFile = i === parts.length - 1;
    const path = parts.slice(0, i + 1).join('/');

    if (!current.children) {
      current.children = [];
    }

    let child = current.children.find(c => c.name === part);

    if (!child) {
      child = {
        name: part,
        path,
        type: isFile ? 'file' : 'directory',
        children: isFile ? undefined : []
      };
      current.children.push(child);
    }

    if (!isFile) {
      current = child;
    }
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
    onChange({
      type: 'file-added',
      path: filePath
    });
  });

  watcher.on('change', (filePath) => {
    onChange({
      type: 'file-changed',
      path: filePath
    });
  });

  watcher.on('unlink', (filePath) => {
    onChange({
      type: 'file-removed',
      path: filePath
    });
  });

  return () => watcher.close();
}
