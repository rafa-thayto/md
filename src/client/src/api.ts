import type { FileNode, FileContent } from './types';

const BASE_URL = '/api';

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data.message === 'string') return data.message;
  } catch {
    // body not JSON — fall through
  }
  return fallback;
}

async function getFiles(): Promise<FileNode> {
  const response = await fetch(`${BASE_URL}/files`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to fetch files'));
  }
  return response.json();
}

async function getFile(path: string): Promise<FileContent> {
  const response = await fetch(`${BASE_URL}/file/${encodeURIComponent(path)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to fetch file'));
  }
  return response.json();
}

function getAssetUrl(path: string): string {
  return `${BASE_URL}/asset/${encodeURIComponent(path)}`;
}

export const apiClient = { getFiles, getFile, getAssetUrl };
