import { useEffect, useState } from 'react';
import { FileTree } from './FileTree';
import { SearchBar } from './SearchBar';
import type { FileNode, ConnectionStatus } from '../types';
import './Sidebar.css';

interface SidebarProps {
  files: FileNode | null;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  wsStatus: ConnectionStatus;
}

function countFiles(node: FileNode): number {
  if (node.type === 'file') return 1;
  return node.children.reduce((acc, child) => acc + countFiles(child), 0);
}

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('mdlens-dark-mode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('mdlens-dark-mode', String(dark));
  }, [dark]);

  return [dark, setDark] as const;
}

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Connecting…',
  open: 'Live',
  closed: 'Disconnected',
};

export function Sidebar({
  files,
  selectedPath,
  onSelectFile,
  wsStatus,
}: SidebarProps) {
  const [dark, setDark] = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cmd+K / Ctrl+K focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Find the search input inside the sidebar
        const input = document.querySelector<HTMLInputElement>('.search-bar input');
        input?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const fileCount = files ? countFiles(files) : 0;

  return (
    <>
      <button
        className="hamburger"
        aria-label={mobileOpen ? 'Close sidebar' : 'Open sidebar'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      <aside
        className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}
        aria-label="File navigation"
      >
        <div className="sidebar-header">
          <div className="sidebar-title-row">
            <h2>mdlens</h2>
            <button
              className="dark-mode-toggle"
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setDark((v) => !v)}
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
          <div className="sidebar-meta">
            <span className="file-count">{fileCount} files</span>
            <span className={`ws-status ws-status--${wsStatus}`} aria-live="polite">
              <span className="ws-dot" aria-hidden="true" />
              {STATUS_LABELS[wsStatus]}
            </span>
          </div>
        </div>

        {!files ? (
          <div className="sidebar-loading">Loading files…</div>
        ) : (
          <>
            <SearchBar files={files} onSelectFile={onSelectFile} />
            <FileTree
              node={files}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
            />
          </>
        )}
      </aside>
    </>
  );
}
