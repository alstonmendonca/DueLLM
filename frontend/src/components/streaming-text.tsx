"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      const code = newlineIdx > -1 ? inner.slice(newlineIdx + 1) : inner;
      return (
        <pre
          key={i}
          className="my-3 overflow-x-auto rounded border border-neutral-800 bg-neutral-950 p-3 text-sm leading-relaxed"
        >
          <code className="font-mono text-neutral-300">{code}</code>
        </pre>
      );
    }
    return (
      <span key={i} className="whitespace-pre-wrap">
        {part}
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [content]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 text-sm leading-relaxed text-neutral-300">
        {formatContent(content)}
        {isStreaming && (
          <span className="inline-block h-4 w-1.5 animate-pulse bg-neutral-500" />
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
