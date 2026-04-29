import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { MarkdownViewer } from './components/MarkdownViewer';
import { useWebSocket } from './hooks/useWebSocket';
import { apiClient } from './api';
import type { FileNode, FileContent, WebSocketMessage } from './types';
import './App.css';

const FILE_PARAM = 'file';
const IS_DEV = import.meta.env.DEV;

function debug(...args: unknown[]): void {
  if (IS_DEV) console.log(...args);
}

function getInitialPath(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(FILE_PARAM);
}

function syncUrl(path: string | null): void {
  const url = new URL(window.location.href);
  if (path) {
    url.searchParams.set(FILE_PARAM, path);
  } else {
    url.searchParams.delete(FILE_PARAM);
  }
  window.history.replaceState({}, '', url.toString());
}

export function App() {
  const [files, setFiles] = useState<FileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(getInitialPath);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      const fileTree = await apiClient.getFiles();
      setFiles(fileTree);
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  }, []);

  const loadFile = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    setSelectedPath(path);
    syncUrl(path);
    try {
      const file = await apiClient.getFile(path);
      setSelectedFile(file);
    } catch (err) {
      console.error('Failed to load file:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file');
      setSelectedFile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Restore file from URL once the tree is available
  useEffect(() => {
    if (!files || !selectedPath || selectedFile) return;
    loadFile(selectedPath);
  }, [files, selectedPath, selectedFile, loadFile]);

  // Browser back/forward navigation
  useEffect(() => {
    function handlePopState() {
      const path = getInitialPath();
      if (path) {
        loadFile(path);
        return;
      }
      setSelectedPath(null);
      setSelectedFile(null);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadFile]);

  // Sync page title with current file
  useEffect(() => {
    const baseName = selectedPath ? selectedPath.split('/').pop() : null;
    document.title = baseName ? `${baseName} · mdlens` : 'mdlens';
  }, [selectedPath]);

  const handleWebSocketMessage = useCallback(
    (message: WebSocketMessage) => {
      debug('WebSocket message:', message);

      if (message.type === 'file-added' || message.type === 'file-removed') {
        loadFiles();
      }

      if (message.type === 'file-changed' && message.path === selectedPath) {
        loadFile(message.path);
      }

      if (message.type === 'file-removed' && message.path === selectedPath) {
        setSelectedFile(null);
        setSelectedPath(null);
        syncUrl(null);
        setError('File was deleted');
      }
    },
    [selectedPath, loadFiles, loadFile],
  );

  const wsStatus = useWebSocket(handleWebSocketMessage);

  return (
    <div className="app">
      <Sidebar
        files={files}
        selectedPath={selectedPath}
        onSelectFile={loadFile}
        wsStatus={wsStatus}
      />
      <MarkdownViewer
        file={selectedFile}
        loading={loading}
        error={error}
      />
    </div>
  );
}
