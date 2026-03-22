"use client";

import { useEffect, useRef } from "react";

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
}

function formatContent(raw: string): React.ReactNode[] {
  const parts = raw.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const inner = part.slice(3, -3);
      const newlineIdx = inner.indexOf("\n");
      const lang = newlineIdx > -1 ? inner.slice(0, newlineIdx).trim() : "";
      const code = newlineIdx > -1 ? inner.slice(newlineIdx + 1) : inner;
      return (
        <div key={i} className="my-3">
          {lang && (
            <div className="rounded-t border border-b-0 border-[#F0EDE5]/8 px-3 py-1">
              <span className="font-mono text-[10px] text-[#F0EDE5]/25">
                {lang}
              </span>
            </div>
          )}
          <pre
            className={`overflow-x-auto border border-[#F0EDE5]/8 bg-[#312F2C] p-3 text-[13px] leading-relaxed ${
              lang ? "rounded-b" : "rounded"
            }`}
          >
            <code className="font-mono text-[#F0EDE5]/70">{code}</code>
          </pre>
        </div>
      );
    }

    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <span key={i} className="whitespace-pre-wrap">
        {inlineParts.map((p, j) => {
          if (p.startsWith("`") && p.endsWith("`")) {
            return (
              <code
                key={j}
                className="rounded bg-[#F0EDE5]/5 px-1.5 py-0.5 font-mono text-[12px] text-[#F0EDE5]/60"
              >
                {p.slice(1, -1)}
              </code>
            );
          }
          const boldParts = p.split(/(\*\*[^*]+\*\*)/g);
          return boldParts.map((bp, k) => {
            if (bp.startsWith("**") && bp.endsWith("**")) {
              return (
                <strong key={`${j}-${k}`} className="font-semibold text-[#F0EDE5]/80">
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
}: StreamingTextProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [content, isStreaming]);

  if (!content && !isStreaming) return null;

  return (
    <div className="px-4 py-3 text-[13px] leading-relaxed text-[#F0EDE5]/50">
      {formatContent(content)}
      {isStreaming && (
        <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-[#F0EDE5]/40" />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
