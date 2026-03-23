"use client";

import { useEffect, useState } from "react";

interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  highlightEnabled?: boolean;
  theme?: string;
}

const THEME_MAP: Record<string, string> = {
  auto: "github-dark",
  "github-dark": "github-dark",
  "github-light": "github-light",
  "one-dark-pro": "one-dark-pro",
  dracula: "dracula",
  nord: "nord",
  "min-light": "min-light",
  "min-dark": "min-dark",
};

export default function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  highlightEnabled = true,
  theme = "auto",
}: CodeBlockProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!highlightEnabled) {
      setHighlightedHtml(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const { codeToHtml } = await import("shiki");
        if (cancelled) return;

        const shikiTheme = THEME_MAP[theme] || "github-dark";
        const html = await codeToHtml(code, {
          lang: language,
          theme: shikiTheme,
        });

        if (!cancelled) {
          setHighlightedHtml(html);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to highlight code:", error);
        if (!cancelled) {
          setHighlightedHtml(null);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, language, theme, highlightEnabled]);

  const addLineNumbers = (codeText: string) => {
    const lines = codeText.split("\n");
    return lines
      .map((line, idx) => {
        const lineNum = String(idx + 1).padStart(
          String(lines.length).length,
          " "
        );
        return `<span style="color: rgba(128,128,128,0.5); user-select: none; margin-right: 1em;">${lineNum}</span>${line}`;
      })
      .join("\n");
  };

  const renderPlainCode = () => {
    const codeContent = showLineNumbers ? addLineNumbers(code) : code;

    return (
      <pre
        style={{
          margin: 0,
          padding: "1rem",
          overflow: "auto",
          fontFamily: "monospace",
          fontSize: "0.875rem",
          lineHeight: "1.5",
          color: "var(--duo-fg)",
        }}
      >
        <code
          dangerouslySetInnerHTML={{ __html: codeContent }}
          style={{ fontFamily: "inherit" }}
        />
      </pre>
    );
  };

  const renderHighlightedCode = () => {
    if (!highlightedHtml) return renderPlainCode();

    let processedHtml = highlightedHtml;

    if (showLineNumbers) {
      // Extract code from shiki HTML and add line numbers
      const codeMatch = processedHtml.match(/<code[^>]*>([\s\S]*?)<\/code>/);
      if (codeMatch) {
        const innerCode = codeMatch[1];
        const lines = innerCode.split("\n");
        const numberedLines = lines
          .map((line, idx) => {
            const lineNum = String(idx + 1).padStart(
              String(lines.length).length,
              " "
            );
            return `<span style="color: rgba(128,128,128,0.5); user-select: none; margin-right: 1em;">${lineNum}</span>${line}`;
          })
          .join("\n");
        processedHtml = processedHtml.replace(
          /<code[^>]*>[\s\S]*?<\/code>/,
          `<code>${numberedLines}</code>`
        );
      }
    }

    return (
      <div
        dangerouslySetInnerHTML={{ __html: processedHtml }}
        style={{
          fontSize: "inherit",
          lineHeight: "inherit",
        }}
      />
    );
  };

  return (
    <div
      className="my-3"
      style={{
        border: "1px solid rgba(128,128,128,0.15)",
        borderRadius: "0.375rem",
        backgroundColor: "rgba(128,128,128,0.05)",
        overflow: "hidden",
      }}
    >
      {language && (
        <div
          style={{
            padding: "0.5rem 1rem",
            borderBottom: "1px solid rgba(128,128,128,0.15)",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--duo-fg)",
            opacity: 0.7,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {language}
        </div>
      )}
      <div
        style={{
          fontSize: "0.875rem",
          lineHeight: "1.5",
        }}
      >
        {isLoading || !highlightedHtml
          ? renderPlainCode()
          : renderHighlightedCode()}
      </div>
    </div>
  );
}
