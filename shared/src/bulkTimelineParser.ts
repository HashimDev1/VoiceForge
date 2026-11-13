import {
  BulkMediaItem,
  BulkTimingRecord,
  BulkTimingParseResult,
  BulkMissingDurationPolicy
} from './bulkTimelineTypes';

/**
 * Natural numeric comparator for filenames and strings:
 * Guarantees "scene_2.jpg" comes BEFORE "scene_10.jpg", "1.jpg" before "2.jpg" before "10.jpg".
 */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Sorts an array of items by filename or any string key using natural numeric comparison.
 */
export function naturalSort<T>(items: T[], keyExtractor: (item: T) => string): T[] {
  return [...items].sort((a, b) => naturalCompare(keyExtractor(a), keyExtractor(b)));
}

/**
 * Parses timestamp string "HH:MM:SS,mmm" or "HH:MM:SS.mmm" or "MM:SS.mmm" or "MM:SS" into seconds.
 */
export function parseTimestampToSeconds(ts: string): number {
  const clean = ts.trim().replace(',', '.');
  const parts = clean.split(':').map((p) => parseFloat(p) || 0);

  if (parts.length === 3) {
    // HH:MM:SS.mmm
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    // MM:SS.mmm
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    // SS.mmm or raw number
    return parts[0];
  }
  return 0;
}

/**
 * Normalizes duration string (e.g. "3.5 sec", "4s", "5.25 seconds", "2.5") into numeric seconds.
 */
export function parseDurationValue(str: string): number {
  if (!str) return 0;
  // Match first floating point / integer number in the string
  const match = str.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  return isNaN(num) || num <= 0 ? 0 : num;
}

/**
 * Parse an SRT subtitle file content into BulkTimingRecords.
 */
export function parseSrtTiming(content: string): BulkTimingRecord[] {
  const records: BulkTimingRecord[] = [];
  const blocks = content.replace(/\r\n/g, '\n').split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    let seqNum: number | undefined;
    let timeLine = '';
    let textStartIndex = 1;

    // First line might be sequence number
    if (/^[0-9]+$/.test(lines[0])) {
      seqNum = parseInt(lines[0], 10);
      timeLine = lines[1] || '';
      textStartIndex = 2;
    } else {
      timeLine = lines[0];
      textStartIndex = 1;
    }

    // Match "00:00:01,000 --> 00:00:04,500"
    const timeMatch = timeLine.match(/([0-9:,.]+)\s*-->\s*([0-9:,.]+)/);
    if (!timeMatch) continue;

    const start = parseTimestampToSeconds(timeMatch[1]);
    const end = parseTimestampToSeconds(timeMatch[2]);
    const duration = Math.max(0.1, Number((end - start).toFixed(3)));
    const text = lines.slice(textStartIndex).join(' ').trim();

    records.push({
      sequenceNumber: seqNum,
      start,
      end,
      duration,
      text: text || undefined,
      rawLine: timeLine
    });
  }

  return records;
}

/**
 * Parse a WebVTT subtitle file content into BulkTimingRecords.
 */
export function parseVttTiming(content: string): BulkTimingRecord[] {
  const stripped = content.replace(/^WEBVTT[^\n]*\n+/i, '');
  return parseSrtTiming(stripped);
}

/**
 * Parse custom CSV/TSV, numbered list, or key-value duration list.
 */
export function parseCustomTimingText(text: string): BulkTimingParseResult {
  const result: BulkTimingParseResult = {
    success: false,
    records: [],
    formatDetected: 'unknown',
    errors: [],
    warnings: [],
    matchedCount: 0,
    unmatchedCount: 0
  };

  const clean = text.trim();
  if (!clean) {
    result.errors.push('Timing input is empty.');
    return result;
  }

  // Detect SRT / VTT
  if (clean.includes('-->')) {
    result.formatDetected = clean.startsWith('WEBVTT') ? 'vtt' : 'srt';
    result.records = parseSrtTiming(clean);
    if (result.records.length > 0) {
      result.success = true;
      return result;
    }
  }

  const lines = clean.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('#'));
  const seenSeqNums = new Set<number>();

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // Pattern 1: Key-Value with equals or colon (e.g. "01_scene.jpg = 3.5" or "scene_2.mp4 : 4.0s")
    const kvMatch = line.match(/^([^=:,]+?)\s*[:=]\s*(.+)$/);
    if (kvMatch && !/^[0-9]+$/.test(kvMatch[1].trim())) {
      const filenameOrId = kvMatch[1].trim();
      const durVal = parseDurationValue(kvMatch[2]);
      if (durVal <= 0) {
        result.errors.push(`Line ${idx + 1}: Invalid or non-positive duration "${kvMatch[2]}" for "${filenameOrId}".`);
      } else {
        result.records.push({
          filename: filenameOrId,
          duration: Number(durVal.toFixed(3)),
          rawLine: line
        });
      }
      if (result.formatDetected === 'unknown') result.formatDetected = 'key_value';
      continue;
    }

    // Pattern 2: Numbered dot list (e.g. "1. 3.5 sec" or "2. scene_intro.jpg 4.5s")
    const dotMatch = line.match(/^([0-9]+)\.\s*(.*)$/);
    if (dotMatch) {
      const seqNum = parseInt(dotMatch[1], 10);
      const rest = dotMatch[2].trim();
      if (seenSeqNums.has(seqNum)) {
        result.warnings.push(`Line ${idx + 1}: Duplicate sequence number "${seqNum}".`);
      }
      seenSeqNums.add(seqNum);

      // Check if filename is mentioned before duration: "scene_01.jpg 3.5s"
      const fnAndDur = rest.match(/^([a-zA-Z0-9_\-.]+\.[a-zA-Z0-9]{3,4})\s+(.+)$/);
      let filename: string | undefined;
      let durStr = rest;
      if (fnAndDur) {
        filename = fnAndDur[1];
        durStr = fnAndDur[2];
      }

      const durVal = parseDurationValue(durStr);
      if (durVal <= 0) {
        result.errors.push(`Line ${idx + 1}: Invalid duration in numbered item #${seqNum}: "${rest}".`);
      } else {
        result.records.push({
          sequenceNumber: seqNum,
          filename,
          duration: Number(durVal.toFixed(3)),
          rawLine: line
        });
      }
      if (result.formatDetected === 'unknown') result.formatDetected = 'numbered_list';
      continue;
    }

    // Pattern 3: CSV or TSV (e.g. "1, 3.5" or "scene_1.jpg, 4.5" or "1\t3.5")
    const delimiter = line.includes('\t') ? '\t' : line.includes(',') ? ',' : null;
    if (delimiter) {
      const cols = line.split(delimiter).map((c) => c.trim());
      if (cols.length >= 2) {
        const col0 = cols[0];
        const col1 = cols[1];

        // Is col0 a sequence number?
        const isNum = /^[0-9]+$/.test(col0);
        const seqNum = isNum ? parseInt(col0, 10) : undefined;
        const filename = !isNum ? col0 : undefined;
        const durVal = parseDurationValue(col1);

        if (durVal <= 0) {
          result.errors.push(`Line ${idx + 1}: Invalid duration value "${col1}".`);
        } else {
          result.records.push({
            sequenceNumber: seqNum,
            filename,
            duration: Number(durVal.toFixed(3)),
            rawLine: line
          });
        }
        if (result.formatDetected === 'unknown') result.formatDetected = 'csv';
        continue;
      }
    }

    // Pattern 4: Bare duration on line (e.g. "3.5" or "4 sec") -> sequential
    const bareDur = parseDurationValue(line);
    if (bareDur > 0) {
      result.records.push({
        sequenceNumber: idx + 1,
        duration: Number(bareDur.toFixed(3)),
        rawLine: line
      });
      if (result.formatDetected === 'unknown') result.formatDetected = 'numbered_list';
      continue;
    }

    result.errors.push(`Line ${idx + 1}: Unrecognized timing format: "${line}".`);
  }

  result.success = result.records.length > 0 && result.errors.length === 0;
  return result;
}

/**
 * Match parsed timing records to media queue items with strict validation:
 * 1. Explicit filename match (case-insensitive, extension-tolerant)
 * 2. Explicit scene / sequence number match
 * 3. Fallback sequential index order
 */
export function matchTimingRecordsToMedia(
  items: BulkMediaItem[],
  records: BulkTimingRecord[],
  missingPolicy: BulkMissingDurationPolicy = 'use_default',
  defaultDuration: number = 4.0
): {
  matchedItems: BulkMediaItem[];
  unmatchedRecords: BulkTimingRecord[];
  missingCount: number;
  matchedCount: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  const usedRecords = new Set<BulkTimingRecord>();
  const updatedItems: BulkMediaItem[] = items.map((it) => ({ ...it }));

  // Helper to normalize filenames for fuzzy extension matching
  const normName = (name?: string) => (name || '').trim().toLowerCase().replace(/\.[^/.]+$/, '');

  // Step 1: Match by explicit filename
  for (const item of updatedItems) {
    const match = records.find((r) => {
      if (usedRecords.has(r)) return false;
      if (!r.filename) return false;
      const fn = r.filename.toLowerCase();
      const itemFn = item.filename.toLowerCase();
      return fn === itemFn || normName(fn) === normName(itemFn);
    });

    if (match) {
      item.assignedDuration = match.duration;
      if (match.text) item.transcriptText = match.text;
      item.status = 'valid';
      usedRecords.add(match);
    }
  }

  // Step 2: Match remaining items by sequence number
  for (const item of updatedItems) {
    if (item.assignedDuration && usedRecords.has(records.find((r) => r.sequenceNumber === item.sequenceNumber && r.duration === item.assignedDuration)!)) {
      continue;
    }

    const match = records.find((r) => {
      if (usedRecords.has(r)) return false;
      return r.sequenceNumber === item.sequenceNumber;
    });

    if (match) {
      item.assignedDuration = match.duration;
      if (match.text) item.transcriptText = match.text;
      item.status = 'valid';
      usedRecords.add(match);
    }
  }

  // Step 3: Match remaining unassigned items by remaining records in sequential order
  const remainingRecords = records.filter((r) => !usedRecords.has(r));
  let remIdx = 0;

  for (const item of updatedItems) {
    if (usedRecords.has(records.find((r) => r.sequenceNumber === item.sequenceNumber || (r.filename && r.filename.toLowerCase() === item.filename.toLowerCase()))!)) {
      continue;
    }

    if (remIdx < remainingRecords.length) {
      const match = remainingRecords[remIdx++];
      item.assignedDuration = match.duration;
      if (match.text) item.transcriptText = match.text;
      item.status = 'valid';
      usedRecords.add(match);
    } else {
      // Item has no matching record in timing list
      if (missingPolicy === 'use_default') {
        item.assignedDuration = defaultDuration;
        item.status = 'warning';
        item.statusMessage = `No timing record found. Applied default ${defaultDuration}s.`;
        warnings.push(`Item #${item.sequenceNumber} (${item.filename}) had no timing record. Defaulted to ${defaultDuration}s.`);
      } else if (missingPolicy === 'keep_existing') {
        // Keep whatever source or previously assigned duration it had
        item.status = 'valid';
      } else {
        item.status = 'error';
        item.statusMessage = 'Missing duration value in custom timing list.';
        warnings.push(`Item #${item.sequenceNumber} (${item.filename}) requires manual duration correction.`);
      }
    }
  }

  const unmatchedRecords = records.filter((r) => !usedRecords.has(r));
  if (unmatchedRecords.length > 0) {
    warnings.push(`${unmatchedRecords.length} timing record(s) did not match any imported media item.`);
  }

  const matchedCount = updatedItems.filter((i) => i.status === 'valid').length;
  const missingCount = updatedItems.filter((i) => i.status === 'error' || i.status === 'warning').length;

  return {
    matchedItems: updatedItems,
    unmatchedRecords,
    missingCount,
    matchedCount,
    warnings
  };
}

