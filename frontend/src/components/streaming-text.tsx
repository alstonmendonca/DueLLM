"use client";

import { useEffect, useRef } from "react";
import CodeBlock from "./code-block";

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
  autoScroll?: boolean;
  syntaxHighlighting?: boolean;
  highlightTheme?: string;
  showLineNumbers?: boolean;
}

function formatContent(
  raw: string,
  syntaxHighlighting: boolean,
  highlightTheme: string,
  showLineNumbers: boolean
): React.ReactNode[] {
  const parts = raw.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const inner = part.slice(3, -3);
      const newlineIdx = inner.indexOf("\n");
      const lang = newlineIdx > -1 ? inner.slice(0, newlineIdx).trim() : "";
      const code = newlineIdx > -1 ? inner.slice(newlineIdx + 1) : inner;
      return (
        <CodeBlock
          key={i}
          code={code}
          language={lang}
          highlightEnabled={syntaxHighlighting}
          theme={highlightTheme}
          showLineNumbers={showLineNumbers}
        />
      );
    }

    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <span key={i} className="whitespace-pre-wrap">
        {inlineParts.map((p, j) => {
          if (p.startsWith("`") && p.endsWith("`")) {
            return (
              <code key={j} className="rounded px-1.5 py-0.5 font-mono"
                    style={{ color: "var(--duo-fg)", opacity: 0.8, backgroundColor: "rgba(128,128,128,0.1)", fontSize: "0.9em" }}>
                {p.slice(1, -1)}
              </code>
            );
          }
          const boldParts = p.split(/(\*\*[^*]+\*\*)/g);
          return boldParts.map((bp, k) => {
            if (bp.startsWith("**") && bp.endsWith("**")) {
              return (
                <strong key={`${j}-${k}`} className="font-semibold" style={{ color: "var(--duo-fg)", opacity: 0.95 }}>
                  {bp.slice(2, -2)}
                </strong>
              );
            }
            return <span key={`${j}-${k}`}>{bp}</span>;
          });
        })}
      </span>
    );
  });
}

export default function StreamingText({
  content,
  isStreaming,
  autoScroll = true,
  syntaxHighlighting = true,
  highlightTheme = "auto",
  showLineNumbers = false,
}: StreamingTextProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStreaming && autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [content, isStreaming, autoScroll]);

  if (!content && !isStreaming) return null;

  return (
    <div className="px-4 py-3 leading-relaxed" style={{ color: "var(--duo-fg)", opacity: 0.75, fontSize: "inherit" }}>
      {formatContent(content, syntaxHighlighting, highlightTheme, showLineNumbers)}
      {isStreaming && (
        <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse" style={{ backgroundColor: "var(--duo-fg)" }} />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
