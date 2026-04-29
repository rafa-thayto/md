import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Fuse from 'fuse.js';
import type { FileNode } from '../types';
import './SearchBar.css';

interface SearchBarProps {
  files: FileNode;
  onSelectFile: (path: string) => void;
}

function flattenFiles(node: FileNode): FileNode[] {
  if (node.type === 'file') return [node];
  return node.children.flatMap(flattenFiles);
}

export function SearchBar({ files, onSelectFile }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce: update debouncedQuery 150ms after keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  // Memoize flat file list — only recomputes when files tree changes
  const flatFiles = useMemo(() => flattenFiles(files), [files]);

  // Memoize Fuse instance — only recomputes when flat list changes
  const fuse = useMemo(
    () => new Fuse(flatFiles, { keys: ['name', 'path'], threshold: 0.4 }),
    [flatFiles],
  );

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return fuse.search(debouncedQuery).map((r) => r.item);
  }, [debouncedQuery, fuse]);

  useEffect(() => {
    setShowResults(results.length > 0 && query.trim().length > 0);
    setHighlightedIndex(-1);
  }, [results, query]);

  const handleSelect = useCallback(
    (path: string) => {
      onSelectFile(path);
      setQuery('');
      setDebouncedQuery('');
      setShowResults(false);
    },
    [onSelectFile],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === 'Enter' && highlightedIndex >= 0) {
      handleSelect(results[highlightedIndex].path);
      return;
    }

    if (e.key === 'Escape') {
      setShowResults(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="search-bar">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search files... (Cmd+K)"
        value={query}
        aria-label="Search files"
        aria-autocomplete="list"
        aria-expanded={showResults}
        aria-controls="search-results-list"
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setShowResults(false)}
        onFocus={() => query.trim() && results.length > 0 && setShowResults(true)}
        onKeyDown={handleKeyDown}
      />
      {showResults && (
        <div
          id="search-results-list"
          className="search-results"
          role="listbox"
          aria-label="Search results"
        >
          {results.map((file, index) => (
            <div
              key={file.path}
              role="option"
              aria-selected={index === highlightedIndex}
              className={`search-result-item${index === highlightedIndex ? ' highlighted' : ''}`}
              // onMouseDown fires before onBlur — prevents blur hiding before click registers
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(file.path);
              }}
            >
              <span className="search-icon" aria-hidden="true">📄</span>
              <span className="search-path">{file.path}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
