import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { handleGetFile, handleGetAsset } from '../api';
import { writeFileSync, rmSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('handleGetFile', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'mdlens-api-test-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test('parses YAML frontmatter from markdown files', async () => {
    const content = `---
title: 'Test Article'
author: testuser
date: 2025-01-21
---

# Hello World

This is the content.`;

    writeFileSync(join(testDir, 'test.md'), content);

    const result = await handleGetFile(testDir, 'test.md');

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.frontmatter).toBeDefined();
      expect(result.frontmatter?.title).toBe('Test Article');
      expect(result.frontmatter?.author).toBe('testuser');
      expect(result.content.trim()).toBe('# Hello World\n\nThis is the content.');
    }
  });

  test('handles files without frontmatter', async () => {
    const content = `# No Frontmatter

Just regular markdown content.`;

    writeFileSync(join(testDir, 'no-frontmatter.md'), content);

    const result = await handleGetFile(testDir, 'no-frontmatter.md');

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.frontmatter).toBeUndefined();
      expect(result.content).toBe(content);
    }
  });

  test('handles complex frontmatter with nested values', async () => {
    const content = `---
title: 'Complex Article'
author: username
author_url: https://example.com/user
tags:
  - javascript
  - typescript
url: https://example.com/article/123
---

# Content`;

    writeFileSync(join(testDir, 'complex.md'), content);

    const result = await handleGetFile(testDir, 'complex.md');

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.frontmatter).toBeDefined();
      expect(result.frontmatter?.title).toBe('Complex Article');
      expect(result.frontmatter?.author_url).toBe('https://example.com/user');
      expect(result.frontmatter?.tags).toEqual(['javascript', 'typescript']);
      expect(result.frontmatter?.url).toBe('https://example.com/article/123');
    }
  });

  test('returns error for non-existent files', async () => {
    const result = await handleGetFile(testDir, 'nonexistent.md');

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('NOT_FOUND');
    }
  });

  test('returns error for path traversal attempts', async () => {
    const result = await handleGetFile(testDir, '../../../etc/passwd');

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('FORBIDDEN');
    }
  });

  test('returns FORBIDDEN for sibling directory with shared name prefix (prefix-collision)', async () => {
    // rootPath = testDir, attacker tries to escape to a sibling whose name
    // starts with the same prefix (the old startsWith check would allow this).
    // e.g. rootPath = /tmp/mdlens-api-test-ABC
    //      target   = /tmp/mdlens-api-test-ABCevil/secret.md
    // relative path that escapes: ../mdlens-api-test-ABCevil/secret.md
    const result = await handleGetFile(testDir, '../mdlens-api-test-SIBLING/secret.md');

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('FORBIDDEN');
    }
  });

  test('handles malformed frontmatter (starts with --- but no closing ---)', async () => {
    const content = `---
# This looks like frontmatter but has no closing delimiter

Regular content here.`;

    writeFileSync(join(testDir, 'malformed.md'), content);

    const result = await handleGetFile(testDir, 'malformed.md');

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.frontmatter).toBeUndefined();
      expect(result.content).toBe(content);
    }
  });

  test('handles horizontal rules that are not frontmatter', async () => {
    const content = `# Title

Some intro text.

---

Content after horizontal rule.`;

    writeFileSync(join(testDir, 'horizontal-rule.md'), content);

    const result = await handleGetFile(testDir, 'horizontal-rule.md');

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.frontmatter).toBeUndefined();
      expect(result.content).toBe(content);
    }
  });
});

describe('handleGetAsset', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'mdlens-asset-test-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test('returns FORBIDDEN for path traversal', async () => {
    const result = await handleGetAsset(testDir, '../../../etc/passwd');

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('FORBIDDEN');
    }
  });

  test('returns NOT_FOUND for missing asset', async () => {
    const result = await handleGetAsset(testDir, 'missing.png');

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('NOT_FOUND');
    }
  });
});
