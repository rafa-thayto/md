import { useState } from 'react';
import type { FileNode } from '../types';
import './FileTree.css';

interface FileTreeProps {
  node: FileNode;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

export function FileTree({ node, selectedPath, onSelectFile }: FileTreeProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderNode = (node: FileNode, depth = 0) => {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = node.path === selectedPath;

    if (node.type === 'directory') {
      return (
        <div key={node.path} className="tree-directory">
          <div
            className="tree-node tree-directory-name"
            style={{ paddingLeft: `${depth * 16}px` }}
            onClick={() => toggleDir(node.path)}
          >
            <span className="tree-icon">{isExpanded ? '📂' : '📁'}</span>
            <span>{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div className="tree-children">
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        className={`tree-node tree-file ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 20}px` }}
        onClick={() => onSelectFile(node.path)}
      >
        <span className="tree-icon">📄</span>
        <span>{node.name}</span>
      </div>
    );
  };

  return (
    <div className="file-tree">
      {node.children?.map(child => renderNode(child))}
    </div>
  );
}
