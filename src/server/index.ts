import { file, type ServerWebSocket, type BunRequest, type Server } from 'bun';
import { join } from 'path';
import { handleGetFiles, handleGetFile, handleGetAsset, errorToStatus } from './api';
import { watchMarkdownFiles } from './files';
import type { WebSocketMessage, ErrorResponse } from '../types';

export interface ServerOptions {
  rootPath: string;
  port?: number;
  clientDistPath: string;
}

const WS_CHANNEL = 'files';
const IS_DEV = process.env.NODE_ENV !== 'production';

function debug(...args: unknown[]): void {
  if (IS_DEV) console.log(...args);
}

async function serveStaticFile(
  pathname: string,
  clientDistPath: string
): Promise<Response> {
  const filePath = pathname === '/' ? '/index.html' : pathname;
  const clientFile = file(join(clientDistPath, filePath));

  if (await clientFile.exists()) {
    return new Response(clientFile);
  }

  return new Response(file(join(clientDistPath, 'index.html')));
}

function makeErrorResponse(result: ErrorResponse): Response {
  return Response.json(result, { status: errorToStatus(result.error) });
}

function decodeWildcardPath(req: Request, prefix: string): string {
  return decodeURIComponent(new URL(req.url).pathname.slice(prefix.length));
}

export async function startServer(options: ServerOptions) {
  const { rootPath, port = 3456, clientDistPath } = options;

  const server = Bun.serve({
    port,
    routes: {
      '/ws': (req: BunRequest<'/ws'>, srv: Server<undefined>) => {
        const success = srv.upgrade(req);
        return success ? undefined : new Response('WebSocket upgrade failed', { status: 500 });
      },
      '/api/health': () => Response.json({ status: 'ok' }),
      '/api/files': async () => {
        const result = await handleGetFiles(rootPath);
        return Response.json(result);
      },
      '/api/file/*': async (req: BunRequest<'/api/file/*'>) => {
        const filePath = decodeWildcardPath(req, '/api/file/');
        const result = await handleGetFile(rootPath, filePath);
        if ('error' in result) return makeErrorResponse(result);
        return Response.json(result);
      },
      '/api/asset/*': async (req: BunRequest<'/api/asset/*'>) => {
        const assetPath = decodeWildcardPath(req, '/api/asset/');
        const result = await handleGetAsset(rootPath, assetPath);
        if ('error' in result) return makeErrorResponse(result);
        return new Response(result);
      },
    },
    async fetch(req) {
      const url = new URL(req.url);
      return serveStaticFile(url.pathname, clientDistPath);
    },
    websocket: {
      open(ws: ServerWebSocket) {
        ws.subscribe(WS_CHANNEL);
        debug('WebSocket client connected');
      },
      message() {
        // Inbound WS messages are not used by mdlens — silently ignored.
      },
      close() {
        debug('WebSocket client disconnected');
      },
    },
  });

  const stopWatching = watchMarkdownFiles(rootPath, (message: WebSocketMessage) => {
    server.publish(WS_CHANNEL, JSON.stringify(message));
  });

  console.log(`🚀 mdlens running at http://localhost:${port}`);
  console.log(`📁 Watching: ${rootPath}`);

  return {
    server,
    close: () => {
      stopWatching();
      server.stop();
    }
  };
}
