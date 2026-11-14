import type { ReactNode } from 'react';

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

/**
 * Renders plain text/Markdown-lite content from the CMS without using
 * dangerouslySetInnerHTML. Supports headings, lists and bold emphasis.
 */
export function RichText({
  content,
  className,
}: {
  content: string | null | undefined;
  className?: string;
}) {
  if (!content?.trim()) return null;

  const blocks = content
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className={className ?? 'space-y-4'}>
      {blocks.map((block, index) => {
        if (block.startsWith('### ')) {
          return (
            <h3
              key={index}
              className="pt-2 font-display text-xl font-bold uppercase tracking-tight text-slate-950"
            >
              {block.slice(4)}
            </h3>
          );
        }
        if (block.startsWith('## ')) {
          return (
            <h2
              key={index}
              className="pt-2 font-display text-2xl font-bold uppercase tracking-tight text-slate-950"
            >
              {block.slice(3)}
            </h2>
          );
        }
        if (block.startsWith('# ')) {
          return (
            <h2
              key={index}
              className="pt-2 font-display text-3xl font-bold uppercase tracking-tight text-slate-950"
            >
              {block.slice(2)}
            </h2>
          );
        }
        if (block.startsWith('> ')) {
          return (
            <blockquote
              key={index}
              className="border-l-4 border-[var(--brand)] bg-[var(--brand-soft)]/50 px-4 py-3 text-base italic text-slate-700"
            >
              {block
                .slice(2)
                .split('\n')
                .map((line, lineIndex) => (
                  <span key={lineIndex} className="block">
                    {renderInline(line)}
                  </span>
                ))}
            </blockquote>
          );
        }
        if (/^[-*]\s/m.test(block)) {
          const items = block.split('\n').filter((line) => /^[-*]\s/.test(line));
          return (
            <ul key={index} className="space-y-2 pl-1">
              {items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-2.5 text-slate-600">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]"
                    aria-hidden
                  />
                  <span className="text-base leading-relaxed">
                    {renderInline(item.replace(/^[-*]\s/, ''))}
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        if (/^\d+\.\s/m.test(block)) {
          const items = block.split('\n').filter((line) => /^\d+\.\s/.test(line));
          return (
            <ol key={index} className="space-y-2">
              {items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-3 text-slate-600">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[11px] font-bold text-[var(--brand-dark)]">
                    {itemIndex + 1}
                  </span>
                  <span className="text-base leading-relaxed">
                    {renderInline(item.replace(/^\d+\.\s/, ''))}
                  </span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={index} className="text-base leading-relaxed text-slate-600">
            {block.split('\n').map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 && <br />}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
