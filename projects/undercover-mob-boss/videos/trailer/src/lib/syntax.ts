import { CODE } from './colors';

export interface Token {
  text: string;
  color: string;
}

const KEYWORDS = new Set([
  'import', 'from', 'const', 'let', 'function', 'return', 'export',
  'if', 'else', 'async', 'await', 'new', 'type', 'interface', 'class',
  'for', 'of', 'in', 'switch', 'case', 'break', 'default', 'throw',
]);

const TYPES = new Set([
  'string', 'number', 'boolean', 'void', 'null', 'undefined',
  'true', 'false', 'Player', 'GameState', 'Role', 'PolicyType',
]);

/** Simple regex-based tokenizer for TypeScript — impressionistic, not precise. */
export function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let remaining = code;

  while (remaining.length > 0) {
    // Comments
    const commentMatch = remaining.match(/^\/\/.*/);
    if (commentMatch) {
      tokens.push({ text: commentMatch[0], color: CODE.comment });
      remaining = remaining.slice(commentMatch[0].length);
      continue;
    }

    // Strings
    const strMatch = remaining.match(/^('[^']*'|"[^"]*"|`[^`]*`)/);
    if (strMatch) {
      tokens.push({ text: strMatch[0], color: CODE.string });
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }

    // Numbers
    const numMatch = remaining.match(/^\b\d+(\.\d+)?\b/);
    if (numMatch) {
      tokens.push({ text: numMatch[0], color: CODE.number });
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }

    // Words (keywords, types, or identifiers)
    const wordMatch = remaining.match(/^\b[a-zA-Z_]\w*\b/);
    if (wordMatch) {
      const word = wordMatch[0];
      let color: string = CODE.text;
      if (KEYWORDS.has(word)) color = CODE.keyword;
      else if (TYPES.has(word)) color = CODE.type;
      else if (remaining[word.length] === '(') color = CODE.function;
      tokens.push({ text: word, color });
      remaining = remaining.slice(word.length);
      continue;
    }

    // Everything else (operators, punctuation, whitespace)
    tokens.push({ text: remaining[0], color: CODE.text });
    remaining = remaining.slice(1);
  }

  return tokens;
}
