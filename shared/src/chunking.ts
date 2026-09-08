import { ScriptChunk, ChunkSettings, Chapter } from './types';

const ABBREVIATIONS = [
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'ave', 'rd', 'blvd',
  'vs', 'eg', 'ie', 'etc', 'vol', 'no', 'jan', 'feb', 'mar', 'apr', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'approx', 'dept'
];

/**
 * Checks if a period at `index` in `text` is likely part of an abbreviation, float number, or date.
 */
function isAbbreviationOrNumber(text: string, periodIndex: number): boolean {
  // Check if period is inside a number like 3.14
  const charBefore = text[periodIndex - 1];
  const charAfter = text[periodIndex + 1];
  if (charBefore && charAfter && /\d/.test(charBefore) && /\d/.test(charAfter)) {
    return true;
  }

  // Find word before period
  let start = periodIndex - 1;
  while (start >= 0 && /[a-zA-Z]/.test(text[start])) {
    start--;
  }
  const word = text.slice(start + 1, periodIndex).toLowerCase();
  if (ABBREVIATIONS.includes(word)) {
    return true;
  }

  return false;
}

/**
 * Splits a paragraph into sentences preserving natural boundaries and avoiding mid-sentence cuts.
 */
function splitIntoSentences(paragraph: string): string[] {
  const sentences: string[] = [];
  let current = '';

  for (let i = 0; i < paragraph.length; i++) {
    const char = paragraph[i];
    current += char;

    if (char === '.' || char === '!' || char === '?') {
      if (char === '.' && isAbbreviationOrNumber(paragraph, i)) {
        continue;
      }
      
      // Lookahead for closing quote or space
      let nextIdx = i + 1;
      while (nextIdx < paragraph.length && (paragraph[nextIdx] === '"' || paragraph[nextIdx] === '”' || paragraph[nextIdx] === "'")) {
        current += paragraph[nextIdx];
        i = nextIdx;
        nextIdx++;
      }

      if (nextIdx >= paragraph.length || /\s/.test(paragraph[nextIdx])) {
        if (current.trim()) {
          sentences.push(current.trim());
        }
        current = '';
      }
    }
  }

  if (current.trim()) {
    sentences.push(current.trim());
  }

  return sentences;
}

/**
 * Splits a long sentence by clauses (;, :, --, comma) if it exceeds maximum characters.
 */
function splitSentenceByClauses(sentence: string, maxChars: number): string[] {
  if (sentence.length <= maxChars) {
    return [sentence];
  }

  // Split by clause punctuation
  const clauseRegex = /([^;,:\u2014]+[;,:\u2014]?)/g;
  const clauses = sentence.match(clauseRegex) || [sentence];
  const results: string[] = [];
  let temp = '';

  for (const clause of clauses) {
    if ((temp + clause).length <= maxChars) {
      temp += clause;
    } else {
      if (temp.trim()) {
        results.push(temp.trim());
      }
      temp = clause;
    }
  }

  if (temp.trim()) {
    results.push(temp.trim());
  }

  // If a single clause is still too long, fallback to word splitting
  const finalResults: string[] = [];
  for (const chunk of results) {
    if (chunk.length > maxChars) {
      const words = chunk.split(' ');
      let wordTemp = '';
      for (const word of words) {
        if ((wordTemp + ' ' + word).length <= maxChars) {
          wordTemp += (wordTemp ? ' ' : '') + word;
        } else {
          if (wordTemp.trim()) finalResults.push(wordTemp.trim());
          wordTemp = word;
        }
      }
      if (wordTemp.trim()) finalResults.push(wordTemp.trim());
    } else {
      finalResults.push(chunk);
    }
  }

  return finalResults;
}

export interface DetectChapterResult {
  isHeading: boolean;
  title: string;
}

/**
 * Detects if a text line is a chapter heading (Markdown `# Title`, `CHAPTER 1`, or ALL CAPS short title).
 */
export function detectChapterHeading(line: string): DetectChapterResult {
  const trimmed = line.trim();
  if (!trimmed) return { isHeading: false, title: '' };

  // Markdown header
  if (/^#{1,3}\s+(.+)$/i.test(trimmed)) {
    const match = trimmed.match(/^#{1,3}\s+(.+)$/i);
    return { isHeading: true, title: match ? match[1].trim() : trimmed };
  }

  // Explicit Chapter prefix
  if (/^(chapter|part|section|act)\s+\d+[:\s-]*/i.test(trimmed)) {
    return { isHeading: true, title: trimmed };
  }

  // ALL CAPS short title (under 50 chars, at least 3 chars, no ending period)
  if (
    trimmed.length >= 3 &&
    trimmed.length <= 50 &&
    trimmed === trimmed.toUpperCase() &&
    /[A-Z]/.test(trimmed) &&
    !/[.!?]$/.test(trimmed)
  ) {
    return { isHeading: true, title: trimmed };
  }

  return { isHeading: false, title: '' };
}

/**
 * Splits raw script into smart speech chunks grouped by chapters.
 */
export function splitScriptIntoChunks(
  scriptText: string,
  settings: ChunkSettings,
  wpm: number = 145
): { chunks: ScriptChunk[]; chapters: Chapter[] } {
  if (!scriptText || !scriptText.trim()) {
    return { chunks: [], chapters: [] };
  }

  // Handle Single Chunk Mode (No Auto-Split)
  if (settings.preset === 'Single Chunk' || settings.maxCharacters >= 50000 || settings.autoChunk === false) {
    const cleanText = scriptText.trim();
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    const estimatedSec = Math.max(Math.round((wordCount / wpm) * 60), 1);

    const singleChunk: ScriptChunk = {
      id: `chunk_${Date.now()}_1`,
      index: 1,
      chapterIndex: 1,
      chapterTitle: 'Full Voiceover',
      text: cleanText,
      wordCount,
      characterCount: cleanText.length,
      estimatedDurationSec: estimatedSec,
      status: 'idle'
    };

    const singleChapter: Chapter = {
      id: 'chap_1',
      index: 1,
      title: 'Full Voiceover',
      chunks: [singleChunk]
    };

    return { chunks: [singleChunk], chapters: [singleChapter] };
  }

  const lines = scriptText.split(/\r?\n/);
  const rawParagraphs: { isChapter: boolean; text: string }[] = [];

  let currentPara = '';

  for (const line of lines) {
    const headingInfo = detectChapterHeading(line);

    if (headingInfo.isHeading) {
      if (currentPara.trim()) {
        rawParagraphs.push({ isChapter: false, text: currentPara.trim() });
        currentPara = '';
      }
      rawParagraphs.push({ isChapter: true, text: headingInfo.title });
    } else if (line.trim() === '') {
      if (currentPara.trim()) {
        rawParagraphs.push({ isChapter: false, text: currentPara.trim() });
        currentPara = '';
      }
    } else {
      currentPara += (currentPara ? ' ' : '') + line.trim();
    }
  }

  if (currentPara.trim()) {
    rawParagraphs.push({ isChapter: false, text: currentPara.trim() });
  }

  const chunks: ScriptChunk[] = [];
  const chapters: Chapter[] = [];

  let currentChapterIndex = 1;
  let currentChapterTitle = 'Introduction';
  let currentChapterChunks: ScriptChunk[] = [];

  let globalChunkIndex = 1;

  for (const item of rawParagraphs) {
    if (item.isChapter) {
      if (currentChapterChunks.length > 0) {
        chapters.push({
          id: `chap_${currentChapterIndex}`,
          index: currentChapterIndex,
          title: currentChapterTitle,
          chunks: [...currentChapterChunks]
        });
        currentChapterChunks = [];
        currentChapterIndex++;
      }
      currentChapterTitle = item.text;
      continue;
    }

    const sentences = splitIntoSentences(item.text);
    let chunkBuffer = '';

    for (const sentence of sentences) {
      // If single sentence is bigger than maxCharacters, split by clause
      const sentenceParts = sentence.length > settings.maxCharacters
        ? splitSentenceByClauses(sentence, settings.maxCharacters)
        : [sentence];

      for (const part of sentenceParts) {
        if (!chunkBuffer) {
          chunkBuffer = part;
        } else if ((chunkBuffer + ' ' + part).length <= settings.maxCharacters) {
          chunkBuffer += ' ' + part;
        } else {
          // Commit current chunkBuffer
          const wordCount = chunkBuffer.split(/\s+/).filter(Boolean).length;
          const estimatedSec = Math.round((wordCount / wpm) * 60);

          const chunk: ScriptChunk = {
            id: `chunk_${Date.now()}_${globalChunkIndex}`,
            index: globalChunkIndex,
            chapterIndex: currentChapterIndex,
            chapterTitle: currentChapterTitle,
            text: chunkBuffer,
            wordCount,
            characterCount: chunkBuffer.length,
            estimatedDurationSec: Math.max(estimatedSec, 1),
            status: 'idle'
          };

          chunks.push(chunk);
          currentChapterChunks.push(chunk);
          globalChunkIndex++;

          chunkBuffer = part;
        }
      }
    }

    if (chunkBuffer.trim()) {
      const wordCount = chunkBuffer.split(/\s+/).filter(Boolean).length;
      const estimatedSec = Math.round((wordCount / wpm) * 60);

      const chunk: ScriptChunk = {
        id: `chunk_${Date.now()}_${globalChunkIndex}`,
        index: globalChunkIndex,
        chapterIndex: currentChapterIndex,
        chapterTitle: currentChapterTitle,
        text: chunkBuffer.trim(),
        wordCount,
        characterCount: chunkBuffer.length,
        estimatedDurationSec: Math.max(estimatedSec, 1),
        status: 'idle'
      };

      chunks.push(chunk);
      currentChapterChunks.push(chunk);
      globalChunkIndex++;
    }
  }

  if (currentChapterChunks.length > 0) {
    chapters.push({
      id: `chap_${currentChapterIndex}`,
      index: currentChapterIndex,
      title: currentChapterTitle,
      chunks: [...currentChapterChunks]
    });
  }

  return { chunks, chapters };
}
