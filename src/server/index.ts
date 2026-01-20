import { serve, file } from 'bun';
import { join } from 'path';
import { ApiServer } from './api';
import { WSServer } from './websocket';
import { watchMarkdownFiles } from './files';

export interface ServerOptions {
  rootPath: string;
  port?: number;
  clientDistPath: string;
}

export async function startServer(options: ServerOptions) {
  const { rootPath, port = 3456, clientDistPath } = options;
  const api = new ApiServer(rootPath);

  const server = serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

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
    }
  });

  // Setup WebSocket
  const wsServer = new WSServer(server);

  // Setup file watcher
  const stopWatching = watchMarkdownFiles(rootPath, (message) => {
    wsServer.broadcast(message);
  });

  console.log(`🚀 MDViewer running at http://localhost:${port}`);
  console.log(`📁 Watching: ${rootPath}`);

  return {
    server,
    close: () => {
      stopWatching();
      wsServer.close();
      server.stop();
    }
  };
}
