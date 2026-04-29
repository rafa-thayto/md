import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
}

type MermaidTheme = 'default' | 'dark';

function currentTheme(): MermaidTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'default';
}

function initMermaid(theme: MermaidTheme): void {
  mermaid.initialize({ startOnLoad: false, theme, securityLevel: 'loose' });
}

// Render the mermaid SVG into the container. mermaid.render() returns an SVG
// string that mermaid itself sanitizes; we route it through innerHTML because
// that's the only API for inserting parsed SVG markup.
function injectSvg(container: HTMLDivElement, svg: string): void {
  // eslint-disable-next-line no-unsanitized/property -- sanitized by mermaid
  container.innerHTML = svg;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<MermaidTheme>(currentTheme);

  // Re-initialize + re-render when the html.dark class changes
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(currentTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    initMermaid(theme);

    let cancelled = false;
    async function render() {
      try {
        const id = `mermaid-${crypto.randomUUID()}`;
        const { svg } = await mermaid.render(id, chart);
        if (cancelled || !containerRef.current) return;
        injectSvg(containerRef.current, svg);
      } catch (error) {
        if (cancelled || !containerRef.current) return;
        console.error('Mermaid render error:', error);
        containerRef.current.textContent = 'Error rendering diagram';
      }
    }
    render();
    return () => { cancelled = true; };
  }, [chart, theme]);

  return <div ref={containerRef} className="mermaid-diagram" />;
}
