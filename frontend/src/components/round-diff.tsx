"use client";

import React from 'react';
import { computeDiff, type DiffLine } from '@/lib/diff';

interface RoundDiffProps {
  oldText: string;
  newText: string;
  diffStyle: 'unified' | 'split';
  contextLines: number;
}

export default function RoundDiff({
  oldText,
  newText,
  diffStyle,
  contextLines,
}: RoundDiffProps) {
  const diffLines = computeDiff(oldText, newText, contextLines);

  if (diffStyle === 'unified') {
    return (
      <div
        style={{
          fontFamily: 'monospace',
          color: 'var(--duo-fg)',
          backgroundColor: 'var(--duo-bg)',
          overflow: 'auto',
        }}
      >
        {diffLines.map((line, index) => {
          const bgColor =
            line.type === 'added'
              ? 'rgba(0, 180, 0, 0.12)'
              : line.type === 'removed'
              ? 'rgba(220, 0, 0, 0.12)'
              : 'transparent';

          const lineNum =
            line.type === 'removed'
              ? line.oldLineNum
              : line.type === 'added'
              ? line.newLineNum
              : line.oldLineNum ?? line.newLineNum;

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                backgroundColor: bgColor,
                minHeight: '1.2em',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '3em',
                  textAlign: 'right',
                  paddingRight: '0.5em',
                  opacity: 0.5,
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                {lineNum}
              </span>
              <span
                style={{
                  paddingLeft: '0.5em',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {line.content}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // Split view
  const oldLines: DiffLine[] = [];
  const newLines: DiffLine[] = [];

  for (const line of diffLines) {
    if (line.type === 'removed') {
      oldLines.push(line);
    } else if (line.type === 'added') {
      newLines.push(line);
    } else {
      // context appears in both columns
      oldLines.push(line);
      newLines.push(line);
    }
  }

  // Balance the arrays so they're the same length
  const maxLength = Math.max(oldLines.length, newLines.length);
  while (oldLines.length < maxLength) {
    oldLines.push({ type: 'context', content: '', oldLineNum: undefined });
  }
  while (newLines.length < maxLength) {
    newLines.push({ type: 'context', content: '', newLineNum: undefined });
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1px',
        fontFamily: 'monospace',
        color: 'var(--duo-fg)',
        backgroundColor: 'var(--duo-bg)',
        overflow: 'auto',
      }}
    >
      {/* Old column */}
      <div>
        {oldLines.map((line, index) => {
          const bgColor =
            line.type === 'removed' ? 'rgba(220, 0, 0, 0.12)' : 'transparent';

          return (
            <div
              key={`old-${index}`}
              style={{
                display: 'flex',
                backgroundColor: bgColor,
                minHeight: '1.2em',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '3em',
                  textAlign: 'right',
                  paddingRight: '0.5em',
                  opacity: 0.5,
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                {line.oldLineNum}
              </span>
              <span
                style={{
                  paddingLeft: '0.5em',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {line.content}
              </span>
            </div>
          );
        })}
      </div>

      {/* New column */}
      <div>
        {newLines.map((line, index) => {
          const bgColor =
            line.type === 'added' ? 'rgba(0, 180, 0, 0.12)' : 'transparent';

          return (
            <div
              key={`new-${index}`}
              style={{
                display: 'flex',
                backgroundColor: bgColor,
                minHeight: '1.2em',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '3em',
                  textAlign: 'right',
                  paddingRight: '0.5em',
                  opacity: 0.5,
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                {line.newLineNum}
              </span>
              <span
                style={{
                  paddingLeft: '0.5em',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {line.content}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
