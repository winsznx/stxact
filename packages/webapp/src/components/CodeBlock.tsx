import { clsx } from 'clsx';

interface CodeBlockProps {
  title?: string;
  code: string;
  language?: 'json' | 'javascript' | 'bash' | 'text';
  className?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function highlightJson(code: string): string {
  const escaped = escapeHtml(code);
  return escaped.replace(
    /(&quot;[^&]*&quot;)(\s*:)?|(-?\b\d+(?:\.\d+)?\b)|(true|false|null)/g,
    (match, quoted, keyColon, numberValue, primitiveValue) => {
      if (quoted) {
        if (keyColon) {
          return `<span class="text-accent">${quoted}</span>${keyColon}`;
        }
        return `<span class="text-success">${quoted}</span>`;
      }
      if (numberValue) {
        return `<span class="text-warning">${numberValue}</span>`;
      }
      if (primitiveValue) {
        return `<span class="text-error">${primitiveValue}</span>`;
      }
      return match;
    }
  );
}

export function CodeBlock({ title, code, language = 'text', className }: CodeBlockProps) {
  const highlighted = language === 'json' ? highlightJson(code) : escapeHtml(code);

  return (
    <div className={clsx('overflow-hidden rounded-none border border bg-background', className)}>
      {(title || language) && (
        <div className="flex items-center justify-between border-b border px-3 py-2">
          <span className="text-xs font-medium text-foreground-muted">{title || 'Code'}</span>
          <span className="font-mono text-[10px] uppercase tracking-wide text-foreground-subtle">
            {language}
          </span>
        </div>
      )}
      <pre className="max-h-[26rem] overflow-auto p-3 text-xs leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}
