import { lazy, Suspense } from 'react';
import type { Components } from 'react-markdown';
import { CodeBlock } from './CodeBlock';

// Mermaid is heavy (~1MB) — only load it when a `mermaid` code block is rendered.
const MermaidDiagram = lazy(() =>
  import('./MermaidDiagram').then((m) => ({ default: m.MermaidDiagram })),
);

type GetAsset = (src: string) => string;

export function buildMarkdownComponents(getAsset: GetAsset): Components {
  return {
    code(props) {
      const { children, className } = props;
      const match = /language-(\w+)/.exec(className ?? '');
      const language = match ? match[1] : '';
      const value = String(children).replace(/\n$/, '');
      const isInline = !className;

      if (!isInline && language === 'mermaid') {
        return (
          <Suspense fallback={<div className="mermaid-loading" aria-busy="true">Loading diagram…</div>}>
            <MermaidDiagram chart={value} />
          </Suspense>
        );
      }

      if (!isInline && language) {
        return <CodeBlock language={language} value={value} />;
      }

      return <code className={className}>{children}</code>;
    },

    img(props) {
      const { src, alt, ...rest } = props;
      return (
        <img
          src={src ? getAsset(src) : ''}
          alt={alt}
          {...rest}
        />
      );
    },

    a(props) {
      const { href, children, ...rest } = props;
      const isExternal =
        href?.startsWith('http://') || href?.startsWith('https://');
      return (
        <a
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          {...rest}
        >
          {children}
        </a>
      );
    },
  };
}
