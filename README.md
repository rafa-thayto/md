# mdlens

A CLI tool for browsing markdown files in a beautiful web interface with real-time updates.

## Features

- 📁 Recursive markdown file discovery
- 🔍 Fuzzy search (Cmd/Ctrl+K), with keyboard navigation
- 🎨 GitHub-flavored markdown rendering with frontmatter support
- 🌗 Dark mode (respects `prefers-color-scheme`, persisted)
- 📊 Mermaid diagrams (lazy-loaded — no cost when unused)
- 💻 Syntax highlighting + copy buttons for code blocks
- 🔄 Live reload over WebSocket on file changes
- 🔗 Permalink URLs (`?file=...`) — refresh stays on the same doc
- ♿ Full keyboard navigation + ARIA roles for screen readers
- 📱 Responsive sidebar with mobile collapse
- 🖼️ Image and asset support relative to the markdown file

## Installation

```bash
bun install -g mdlens
# or
npm install -g mdlens
```

## Usage

```bash
md                         # serve the current directory
md docs/                   # serve a specific directory
md --port 4000             # use a custom port (default 3456)
md --no-open               # don't auto-open the browser
md --help                  # show all options
```

The app will:
1. Start a local web server
2. Scan for all markdown files
3. Open your browser automatically (unless `--no-open`)
4. Watch for file changes in real-time

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+K` | Focus search |
| `↑` / `↓` | Move highlight in search results / file tree |
| `Enter` | Open selected file |
| `Space` | Expand/collapse directory |
| `Esc` | Close search results |

## Development

### Prerequisites

- Bun 1.0+

### Setup

```bash
git clone <repository>
cd mdlens
bun install
cd src/client
bun install
cd ../..
```

### Run dev server

```bash
bun run dev
```

This runs the Bun server on `:3456` and the Vite frontend on `:5173` (with proxy to the Bun server).

### Build

```bash
bun run build
```

### Test

```bash
bun test
```

### Link for local CLI testing

```bash
bun run build
bun link
md ~/some-dir-with-markdown
```

## Architecture

- **Backend**: `Bun.serve()` with declarative `routes`, native pub/sub for WebSocket broadcast (no manual subscriber tracking), `Bun.file` and `Bun.Glob` for I/O.
- **Frontend**: React + Vite + TypeScript with discriminated unions throughout, lazy-loaded Mermaid, memoized markdown rendering, and a single CSS-variable-driven theme.
- **File watching**: chokidar emits structured `WebSocketMessage` events broadcast on the `'files'` topic.
- **Search**: Fuse.js with memoized index + 150 ms debounce.
- **Security**: `path.relative` containment check on every file/asset request — sibling-prefix escapes are explicitly tested.

## License

MIT
