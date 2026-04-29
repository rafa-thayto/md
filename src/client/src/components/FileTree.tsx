import { useState, memo, useCallback } from 'react';
import type { FileNode } from '../types';
import './FileTree.css';

interface FileTreeProps {
  node: FileNode;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  selectedPath: string | null;
  expandedDirs: Set<string>;
  onSelectFile: (path: string) => void;
  onToggleDir: (path: string) => void;
}

const TreeFileNode = memo(function TreeFileNode({
  node,
  depth,
  selectedPath,
  onSelectFile,
}: Omit<TreeNodeProps, 'expandedDirs' | 'onToggleDir'>) {
  const isSelected = node.path === selectedPath;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectFile(node.path);
    }
  };

  return (
    <div
      role="treeitem"
      aria-selected={isSelected}
      tabIndex={0}
      className={`tree-node tree-file${isSelected ? ' selected' : ''}`}
      style={{ paddingLeft: `${depth * 16 + 20}px` }}
      onClick={() => onSelectFile(node.path)}
      onKeyDown={handleKeyDown}
    >
      <span className="tree-icon" aria-hidden="true">📄</span>
      <span>{node.name}</span>
    </div>
  );
});

const TreeDirNode = memo(function TreeDirNode({
  node,
  depth,
  selectedPath,
  expandedDirs,
  onSelectFile,
  onToggleDir,
}: TreeNodeProps) {
  if (node.type !== 'directory') return null;

  const isExpanded = expandedDirs.has(node.path);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleDir(node.path);
    }
  };

  return (
    <div role="treeitem" aria-expanded={isExpanded} className="tree-directory">
      <div
        tabIndex={0}
        className="tree-node tree-directory-name"
        style={{ paddingLeft: `${depth * 16}px` }}
        onClick={() => onToggleDir(node.path)}
        onKeyDown={handleKeyDown}
      >
        <span className="tree-icon" aria-hidden="true">
          {isExpanded ? '📂' : '📁'}
        </span>
        <span>{node.name}</span>
      </div>
      {isExpanded && (
        <div role="group" className="tree-children">
          {node.children.map((child) => (
            <TreeNodeDispatch
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expandedDirs={expandedDirs}
              onSelectFile={onSelectFile}
              onToggleDir={onToggleDir}
            />
          ))}
        </div>
      )}
    </div>
  );
});

function TreeNodeDispatch(props: TreeNodeProps) {
  if (props.node.type === 'file') {
    return <TreeFileNode {...props} />;
  }
  return <TreeDirNode {...props} />;
}

export function FileTree({ node, selectedPath, onSelectFile }: FileTreeProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const handleToggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  if (node.type !== 'directory') return null;

  return (
    <div role="tree" className="file-tree" aria-label="File tree">
      {node.children.map((child) => (
        <TreeNodeDispatch
          key={child.path}
          node={child}
          depth={0}
          selectedPath={selectedPath}
          expandedDirs={expandedDirs}
          onSelectFile={onSelectFile}
          onToggleDir={handleToggleDir}
        />
      ))}
    </div>
  );
}
