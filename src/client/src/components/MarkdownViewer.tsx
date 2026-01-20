import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { CodeBlock } from './CodeBlock';
import { MermaidDiagram } from './MermaidDiagram';
import type { FileContent } from '../types';
import './MarkdownViewer.css';

interface MarkdownViewerProps {
  file: FileContent | null;
  loading: boolean;
  error: string | null;
}

export function MarkdownViewer({ file, loading, error }: MarkdownViewerProps) {
  const getImageUrl = useMemo(() => {
    if (!file) return (src: string) => src;

    return (src: string) => {
      if (src.startsWith('http://') || src.startsWith('https://')) {
        return src;
      }

      const fileDir = file.path.split('/').slice(0, -1).join('/');
      const imagePath = fileDir ? `${fileDir}/${src}` : src;
      return `/api/asset/${encodeURIComponent(imagePath)}`;
    };
  }, [file]);

  if (loading) {
    return (
      <div className="markdown-viewer">
        <div className="viewer-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="markdown-viewer">
        <div className="viewer-error">{error}</div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="markdown-viewer">
        <div className="viewer-empty">
          <h2>Welcome to MDViewer</h2>
          <p>Select a markdown file from the sidebar to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="markdown-viewer">
      <div className="markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
          components={{
            code(props) {
              const { children, className, node, ...rest } = props;
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';
              const value = String(children).replace(/\n$/, '');
              const inline = !className;

              if (!inline && language === 'mermaid') {
                return <MermaidDiagram chart={value} />;
              }

              if (!inline && language) {
                return <CodeBlock language={language} value={value} />;
              }

              return (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            },
            img(props) {
              const { src, alt, ...rest } = props;
              return (
                <img
                  src={src ? getImageUrl(src) : ''}
                  alt={alt}
                  {...rest}
                />
              );
            },
            a(props) {
              const { href, children, ...rest } = props;
              const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
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
            }
          }}
        >
          {file.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
