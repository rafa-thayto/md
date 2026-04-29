#!/usr/bin/env bun

import { startServer } from './server/index';
import { join, resolve, isAbsolute } from 'path';
import open from 'open';

interface CliArgs {
  rootPath: string;
  port: number;
  openBrowser: boolean;
  help: boolean;
}

const DEFAULT_PORT = 3456;

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    rootPath: process.cwd(),
    port: DEFAULT_PORT,
    openBrowser: true,
    help: false,
  };

  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === '-h' || a === '--help') {
      args.help = true;
      continue;
    }

    if (a === '--no-open') {
      args.openBrowser = false;
      continue;
    }

    if (a === '-p' || a === '--port') {
      const next = argv[++i];
      const n = Number(next);
      if (!Number.isInteger(n) || n <= 0 || n > 65535) {
        throw new Error(`Invalid --port value: ${next}`);
      }
      args.port = n;
      continue;
    }

    if (a.startsWith('--port=')) {
      const n = Number(a.slice('--port='.length));
      if (!Number.isInteger(n) || n <= 0 || n > 65535) {
        throw new Error(`Invalid --port value: ${a}`);
      }
      args.port = n;
      continue;
    }

    if (a.startsWith('-')) {
      throw new Error(`Unknown option: ${a}`);
    }

    positional.push(a);
  }

  if (positional.length > 1) {
    throw new Error(`Expected at most 1 path argument, got ${positional.length}`);
  }

  if (positional.length === 1) {
    const p = positional[0];
    args.rootPath = isAbsolute(p) ? p : resolve(process.cwd(), p);
  }

  return args;
}

function printHelp(): void {
  console.log(`mdlens — browse markdown files in a beautiful web interface

Usage:
  md [path] [options]

Arguments:
  path                  Directory to serve (default: current working dir)

Options:
  -p, --port <number>   Port to listen on (default: ${DEFAULT_PORT})
      --no-open         Do not open the browser automatically
  -h, --help            Show this help and exit
`);
}

async function main() {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`✖ ${(err as Error).message}`);
    console.error('Run "md --help" for usage.');
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    return;
  }

  const clientDistPath = join(import.meta.dir, 'client');

  console.log('🔍 Starting mdlens...');

  const { server, close } = await startServer({
    rootPath: args.rootPath,
    port: args.port,
    clientDistPath,
  });

  const url = `http://localhost:${args.port}`;

  if (args.openBrowser) {
    try {
      await open(url);
      console.log(`\n✨ Browser opened at ${url}`);
    } catch {
      console.log(`\n✨ Server running at ${url}`);
      console.log('   (Unable to open browser automatically)');
    }
  } else {
    console.log(`\n✨ Server running at ${url}`);
  }

  console.log('Press Ctrl+C to stop\n');

  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    close();
    server.stop();
    process.exit(0);
  });
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { parseArgs };
