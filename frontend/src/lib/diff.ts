import * as Diff from 'diff';

export interface DiffLine {
  type: 'added' | 'removed' | 'context';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

/**
 * Computes a diff between two texts and returns structured diff lines.
 *
 * @param oldText - The original text
 * @param newText - The modified text
 * @param contextLines - Number of surrounding context lines to show (default: 3)
 * @returns Array of DiffLine objects representing the diff
 */
export function computeDiff(
  oldText: string,
  newText: string,
  contextLines: number = 3
): DiffLine[] {
  // Create a unified diff patch
  const patch = Diff.createPatch(
    'text',
    oldText,
    newText,
    '',
    '',
    { context: contextLines }
  );

  // Parse the patch into DiffLine objects
  const lines = patch.split('\n');
  const diffLines: DiffLine[] = [];

  let oldLineNum = 0;
  let newLineNum = 0;
  let inHunk = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip header lines
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('Index:')) {
      continue;
    }

    // Parse hunk header (@@ -oldStart,oldCount +newStart,newCount @@)
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        oldLineNum = parseInt(match[1], 10);
        newLineNum = parseInt(match[2], 10);
        inHunk = true;
      }
      continue;
    }

    if (!inHunk) {
      continue;
    }

    // Parse diff lines
    if (line.startsWith('+')) {
      diffLines.push({
        type: 'added',
        content: line.slice(1),
        newLineNum: newLineNum++,
      });
    } else if (line.startsWith('-')) {
      diffLines.push({
        type: 'removed',
        content: line.slice(1),
        oldLineNum: oldLineNum++,
      });
    } else if (line.startsWith(' ')) {
      diffLines.push({
        type: 'context',
        content: line.slice(1),
        oldLineNum: oldLineNum++,
        newLineNum: newLineNum++,
      });
    } else if (line === '') {
      // Empty line in context
      diffLines.push({
        type: 'context',
        content: '',
        oldLineNum: oldLineNum++,
        newLineNum: newLineNum++,
      });
    }
  }

  return diffLines;
}
