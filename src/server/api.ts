import { join, relative, isAbsolute, normalize } from 'path';
import matter from 'gray-matter';
import type { FileNode, FileContent, ErrorResponse, ErrorCode } from '../types';
import { findMarkdownFiles } from './files';

// ── Status mapping ─────────────────────────────────────────────────────────

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  FILE_DISCOVERY_ERROR: 500,
};

export function errorToStatus(code: ErrorCode): number {
  return STATUS_BY_CODE[code];
}

// ── Path safety ────────────────────────────────────────────────────────────

function isPathSafe(rootPath: string, requestedPath: string): boolean {
  const target = normalize(join(rootPath, requestedPath));
  const rel = relative(rootPath, target);
  return !rel.startsWith('..') && !isAbsolute(rel);
}

// ── Error helpers ──────────────────────────────────────────────────────────

function forbidden(): ErrorResponse {
  return { error: 'FORBIDDEN', message: 'Access to this file is not allowed' };
}

function notFound(message = 'File not found'): ErrorResponse {
  return { error: 'NOT_FOUND', message };
}

// ── Shared file loader ─────────────────────────────────────────────────────

async function loadFileBytes(
  rootPath: string,
  requestedPath: string
): Promise<{ fullPath: string } | ErrorResponse> {
  if (!isPathSafe(rootPath, requestedPath)) {
    return forbidden();
  }

  const fullPath = join(rootPath, requestedPath);
  const bunFile = Bun.file(fullPath);

  if (!(await bunFile.exists())) {
    return notFound();
  }

  return { fullPath };
}

// ── Frontmatter parsing ────────────────────────────────────────────────────

function parseFrontmatter(rawContent: string): Pick<FileContent, 'content' | 'frontmatter'> {
  const parsed = matter(rawContent);

  const hasData =
    parsed.data !== null &&
    typeof parsed.data === 'object' &&
    !Array.isArray(parsed.data) &&
    Object.keys(parsed.data).length > 0;

  if (!hasData) {
    return { content: rawContent };
  }

  const content = parsed.content || rawContent;
  return { content, frontmatter: parsed.data };
}

// ── Route handlers ─────────────────────────────────────────────────────────

export async function handleGetFiles(rootPath: string): Promise<FileNode | ErrorResponse> {
  try {
    return await findMarkdownFiles(rootPath);
  } catch {
    return { error: 'FILE_DISCOVERY_ERROR', message: 'Failed to discover markdown files' };
  }
}

export async function handleGetFile(
  rootPath: string,
  filePath: string
): Promise<FileContent | ErrorResponse> {
  const loaded = await loadFileBytes(rootPath, filePath);
  if ('error' in loaded) return loaded;

  try {
    const rawContent = await Bun.file(loaded.fullPath).text();
    return { path: filePath, ...parseFrontmatter(rawContent) };
  } catch {
    return notFound();
  }
}

export async function handleGetAsset(
  rootPath: string,
  assetPath: string
): Promise<Uint8Array | ErrorResponse> {
  const loaded = await loadFileBytes(rootPath, assetPath);
  if ('error' in loaded) return loaded;

  try {
    const bytes = await Bun.file(loaded.fullPath).bytes();
    return bytes;
  } catch {
    return notFound('Asset not found');
  }
}
