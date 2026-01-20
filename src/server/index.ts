import { serve, file, type ServerWebSocket } from 'bun';
import { join } from 'path';
import { ApiServer } from './api';
import { watchMarkdownFiles } from './files';
import type { WebSocketMessage } from '../types';

export interface ServerOptions {
  rootPath: string;
  port?: number;
  clientDistPath: string;
}

interface WSData {
  createdAt: number;
}

const clients = new Set<ServerWebSocket<WSData>>();

export async function startServer(options: ServerOptions) {
  const { rootPath, port = 3456, clientDistPath } = options;
  const api = new ApiServer(rootPath);

  const server = serve({
    port,
    async fetch(req, server) {
      const url = new URL(req.url);

      // WebSocket upgrade
      if (url.pathname === '/ws') {
        const success = server.upgrade(req, {
          data: {
            createdAt: Date.now(),
          },
        });
        return success
          ? undefined
          : new Response('WebSocket upgrade failed', { status: 500 });
      }

      // API Routes
      if (url.pathname === '/api/files') {
        const result = await api.handleGetFiles();
        return Response.json(result);
      }

      if (url.pathname.startsWith('/api/file/')) {
        const filePath = url.pathname.slice('/api/file/'.length);
        const result = await api.handleGetFile(decodeURIComponent(filePath));

        if ('error' in result) {
          return Response.json(result, { status: 'FORBIDDEN' in result ? 403 : 404 });
        }

        return Response.json(result);
      }

      if (url.pathname.startsWith('/api/asset/')) {
        const assetPath = url.pathname.slice('/api/asset/'.length);
        const result = await api.handleGetAsset(decodeURIComponent(assetPath));

        if ('error' in result) {
          return Response.json(result, { status: 'FORBIDDEN' in result ? 403 : 404 });
        }

        return new Response(result);
      }

      if (url.pathname === '/api/health') {
        return Response.json({ status: 'ok' });
      }

      // Serve static client files
      const filePath = url.pathname === '/' ? '/index.html' : url.pathname;
      const clientFile = file(join(clientDistPath, filePath));

      if (await clientFile.exists()) {
        return new Response(clientFile);
      }

      // SPA fallback
      return new Response(file(join(clientDistPath, 'index.html')));
    },
    websocket: {
      open(ws) {
        clients.add(ws);
        console.log('WebSocket client connected');
      },
      message(ws, message) {
        // Echo messages back (not needed for our use case but required by interface)
        console.log('WebSocket message received:', message);
      },
      close(ws) {
        clients.delete(ws);
        console.log('WebSocket client disconnected');
      },
    },
  });

  // Setup file watcher
  const stopWatching = watchMarkdownFiles(rootPath, (message: WebSocketMessage) => {
    const data = JSON.stringify(message);
    clients.forEach(client => {
      client.send(data);
    });
  });

  console.log(`🚀 MDViewer running at http://localhost:${port}`);
  console.log(`📁 Watching: ${rootPath}`);

  return {
    server,
    close: () => {
      stopWatching();
      clients.forEach(client => client.close());
      clients.clear();
      server.stop();
    }
  };
}
