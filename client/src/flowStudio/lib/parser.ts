/**
 * Intelligent TXT Parser for storyboard production.
 * Groups multi-line descriptions into single prompts based on scene/prompt headers.
 */
export function parseScriptToPrompts(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const prompts: string[] = [];
  let currentBuffer: string[] = [];

  const isSeparator = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return /^[.\-=_#*]{3,}$/.test(trimmed);
  };

  const isNewSceneMarker = (line: string) => {
    const trimmed = line.trim();
    return /^(scene|prompt|image|shot)\s*\d+[:\-]?/i.test(trimmed);
  };

  const flushBuffer = () => {
    if (currentBuffer.length > 0) {
      const content = currentBuffer.join('\n').trim();
      if (content) prompts.push(content);
      currentBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) continue;
    if (isSeparator(trimmed)) {
      flushBuffer();
      continue;
    }

    if (isNewSceneMarker(trimmed)) {
      flushBuffer();
      currentBuffer.push(line);
    } else {
      currentBuffer.push(line);
    }
  }

  flushBuffer();
  return prompts;
}
