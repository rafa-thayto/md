import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { buildMarkdownComponents } from './markdownComponents';
import type { FileContent, ViewerState } from '../types';
import './MarkdownViewer.css';

// Pure helper — derives asset URL from a file's directory and a relative src
export function getAssetUrl(file: FileContent, src: string): string {
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  const fileDir = file.path.split('/').slice(0, -1).join('/');
  const imagePath = fileDir ? `${fileDir}/${src}` : src;
  return `/api/asset/${encodeURIComponent(imagePath)}`;
}

function formatDate(date: unknown): string | null {
  if (!date) return null;
  const d = new Date(String(date));
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function FrontmatterHeader({
  frontmatter,
}: {
  frontmatter: Record<string, unknown>;
}) {
  const title = frontmatter.title as string | undefined;
  const author = frontmatter.author as string | undefined;
  const authorUrl = frontmatter.author_url as string | undefined;
  const date = formatDate(frontmatter.date);
  const url = frontmatter.url as string | undefined;

  if (!title && !author && !date && !url) return null;

  return (
    <header className="frontmatter-header">
      {title && <h1 className="frontmatter-title">{title}</h1>}
      <div className="frontmatter-meta">
        {author && (
          <span className="frontmatter-author">
            {authorUrl ? (
              <a href={authorUrl} target="_blank" rel="noopener noreferrer">
                {author}
              </a>
            ) : (
              author
            )}
          </span>
        )}
        {date && <span className="frontmatter-date">{date}</span>}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="frontmatter-source"
          >
            View original
          </a>
        )}
      </div>
    </header>
  );
}

function LoadingSkeleton() {
  return (
    <div className="markdown-viewer">
      <div className="viewer-loading" aria-busy="true" aria-label="Loading content">
        <div className="skeleton-block skeleton-title" />
        <div className="skeleton-block skeleton-line" />
        <div className="skeleton-block skeleton-line skeleton-line--short" />
        <div className="skeleton-block skeleton-line" />
        <div className="skeleton-block skeleton-line skeleton-line--med" />
      </div>
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="markdown-viewer">
      <div className="viewer-error" role="alert">
        {message}
      </div>
    </div>
  );
}

function EmptyView() {
  return (
    <div className="markdown-viewer">
      <div className="viewer-empty">
        <span className="empty-illustration" aria-hidden="true">📖</span>
        <h2>Welcome to mdlens</h2>
        <p>Select a markdown file from the sidebar to get started.</p>
      </div>
    </div>
  );
}

const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeRaw, rehypeSanitize];

function FileView({ file }: { file: FileContent }) {
  const components = useMemo(
    () => buildMarkdownComponents((src) => getAssetUrl(file, src)),
    [file],
  );

  // Memoize the rendered tree so unrelated re-renders (e.g. WS reconnect)
  // don't re-parse the markdown.
  const rendered = useMemo(
    () => (
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}
      >
        {file.content}
      </ReactMarkdown>
    ),
    [file.content, components],
  );

  return (
    <div className="markdown-viewer">
      <div className="markdown-content">
        {file.frontmatter && (
          <FrontmatterHeader frontmatter={file.frontmatter} />
        )}
        {rendered}
      </div>
    </div>
  );
}

// Converts flat props into a discriminated ViewerState for clean dispatch
function resolveViewerState(
  file: FileContent | null,
  loading: boolean,
  error: string | null,
): ViewerState {
  if (loading) return { kind: 'loading' };
  if (error) return { kind: 'error', message: error };
  if (!file) return { kind: 'empty' };
  return { kind: 'file', file };
}

interface MarkdownViewerProps {
  file: FileContent | null;
  loading: boolean;
  error: string | null;
}

export function MarkdownViewer({ file, loading, error }: MarkdownViewerProps) {
  const state = resolveViewerState(file, loading, error);

  switch (state.kind) {
    case 'loading':
      return <LoadingSkeleton />;
    case 'error':
      return <ErrorView message={state.message} />;
    case 'empty':
      return <EmptyView />;
    case 'file':
      return <FileView file={state.file} />;
  }
}
