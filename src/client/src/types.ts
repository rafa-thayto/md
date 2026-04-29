// Discriminated union — narrows cleanly in switch/if branches
export type FileNode =
  | { type: 'file'; name: string; path: string }
  | { type: 'directory'; name: string; path: string; children: FileNode[] };

export type WebSocketMessage =
  | { type: 'file-added'; path: string }
  | { type: 'file-changed'; path: string }
  | { type: 'file-removed'; path: string };

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

export interface FileContent {
  path: string;
  content: string;
  frontmatter?: Record<string, unknown>;
}

// Discriminated union for viewer render state — no nested ternaries needed
export type ViewerState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'file'; file: FileContent };
