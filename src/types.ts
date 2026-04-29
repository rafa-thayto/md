export type FileNode =
  | { type: 'file'; name: string; path: string }
  | { type: 'directory'; name: string; path: string; children: FileNode[] };

export type WebSocketMessage =
  | { type: 'file-added'; path: string }
  | { type: 'file-changed'; path: string }
  | { type: 'file-removed'; path: string };

export interface FileContent {
  path: string;
  content: string;
  frontmatter?: Record<string, unknown>;
}

export type ErrorCode = 'FORBIDDEN' | 'NOT_FOUND' | 'FILE_DISCOVERY_ERROR';

export interface ErrorResponse {
  error: ErrorCode;
  message: string;
}
