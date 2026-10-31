import {
  TranscriptionSegment,
  TranscriptionWord,
  ReferenceScriptFormat,
  AlignmentStatus,
  AlignmentReviewItem,
  ReviewResolutionState
} from '../../../shared/src/types';
import { ScriptConversionService } from './scriptConversionService';
import { logger } from '../utils/logger';

export interface ReferenceAlignmentResult {
  alignedSegments: TranscriptionSegment[];
  reviewItems: AlignmentReviewItem[];
  detectedScriptFormat: ReferenceScriptFormat;
  omittedReferencePassages: string[];
  stats: {
    totalSegments: number;
    confirmedCount: number;
    correctionCount: number;
    additionCount: number;
    omittedCount: number;
    lowConfidenceCount: number;
  };
}

/**
 * ReferenceAlignmentService
 * 
 * Implements reference-guided speech alignment for voiceover transcription:
 * - Spoken audio remains the authoritative source of truth for timestamps and spoken words.
 * - Reference script serves as the linguistic standard for spelling, punctuation, and terminology.
 * - Detects omissions, additions, ad-libs, and spelling discrepancies.
 * - Never forces skipped sentences into audio timelines or deletes spoken ad-libs.
 */
export class ReferenceAlignmentService {
  // Distinctive Roman Urdu markers that do not collide with standard English words (e.g. avoid 'the', 'to', 'me')
  private static readonly DISTINCT_ROMAN_URDU_MARKERS = new Set([
    'hai', 'hain', 'kya', 'nahi', 'nahin', 'aur', 'bhi', 'main', 'aap', 'yeh', 'woh',
    'wo', 'ye', 'tha', 'thi', 'kaise', 'kaisi', 'hum', 'tum', 'karna', 'raha',
    'rahi', 'rahe', 'mein', 'liye', 'wala', 'wali', 'wale', 'kuch', 'sab', 'bahut',
    'acha', 'achha', 'kyun', 'kyu', 'zinda', 'jahaz', 'samandar', 'safhar', 'safar',
    'waqt', 'vakt', 'kisi', 'kahan', 'dono', 'lekin', 'magar', 'paas', 'hoga', 'hogi'
  ]);

  /**
   * Automatically detect the script/orthography of reference text
   */
  public static detectScriptFormat(text: string): ReferenceScriptFormat {
    if (!text || !text.trim()) return 'auto';

    let devaCount = 0;
    let urduCount = 0;
    let latinCount = 0;

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      // Devanagari range: 0x0900 - 0x097F
      if (code >= 0x0900 && code <= 0x097F) {
        devaCount++;
      }
      // Arabic / Perso-Arabic / Urdu range
      else if (
        (code >= 0x0600 && code <= 0x06FF) ||
        (code >= 0x0750 && code <= 0x077F) ||
        (code >= 0xFB50 && code <= 0xFDFF) ||
        (code >= 0xFE70 && code <= 0xFEFF)
      ) {
        urduCount++;
      }
      // Latin letters: A-Z, a-z
      else if ((code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A)) {
        latinCount++;
      }
    }

    if (devaCount > urduCount && devaCount > latinCount && devaCount > 5) {
      return 'hindi_devanagari';
    }

    if (urduCount > devaCount && urduCount > latinCount && urduCount > 5) {
      return 'urdu_script';
    }

    if (latinCount > 5) {
      // Analyze words to differentiate Roman Urdu from pure English
      const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 2);

      let romanUrduHits = 0;
      for (const w of words) {
        if (this.DISTINCT_ROMAN_URDU_MARKERS.has(w)) {
          romanUrduHits++;
        }
      }

      // If at least 2 distinct Roman Urdu markers and >= 6% frequency
      if (words.length > 0 && romanUrduHits >= 2 && (romanUrduHits / words.length) >= 0.06) {
        return 'roman_urdu';
      }

      return 'english_mixed';
    }

    return 'auto';
  }

  /**
   * Split reference script into logical sentence / clause passages
   */
  public static splitReferenceScript(scriptText: string): string[] {
    if (!scriptText || !scriptText.trim()) return [];

    // Split on line breaks, danda (।), double danda (॥), periods, questions, and exclamations
    const rawChunks = scriptText.split(/(?:\r?\n+|[।॥.?!؛؟]+)/);

    return rawChunks
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
  }

  /**
   * Normalize text for phonetic comparison (strips punctuation, diacritics, nuktas)
   */
  public static normalizeForComparison(text: string): string {
    if (!text) return '';

    return text
      .toLowerCase()
      // Remove punctuation and symbols
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()।॥؛؟—–"']/g, '')
      // Remove Arabic diacritics (Harakat)
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // Remove Devanagari nukta (0x093C)
      .replace(/\u093C/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate Levenshtein similarity between two strings (0.0 to 1.0)
   */
  public static calculateSimilarity(str1: string, str2: string): number {
    const s1 = this.normalizeForComparison(str1);
    const s2 = this.normalizeForComparison(str2);

    if (s1 === s2) return 1.0;
    if (!s1 || !s2) return 0.0;

    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return Math.max(0, 1 - distance / maxLen);
  }

  /**
   * Align recognized audio segments with the original reference script
   */
  public static alignTranscriptWithReference(params: {
    recognizedSegments: TranscriptionSegment[];
    referenceScript: string;
    scriptFormat?: ReferenceScriptFormat;
    detectedLanguageCode: string;
  }): ReferenceAlignmentResult {
    const { recognizedSegments, referenceScript, scriptFormat, detectedLanguageCode } = params;

    const detectedFormat =
      scriptFormat && scriptFormat !== 'auto'
        ? scriptFormat
        : this.detectScriptFormat(referenceScript);

    const refPassages = this.splitReferenceScript(referenceScript);
    const matchedRefIndices = new Set<number>();

    const alignedSegments: TranscriptionSegment[] = [];
    const reviewItems: AlignmentReviewItem[] = [];

    let confirmedCount = 0;
    let correctionCount = 0;
    let additionCount = 0;
    let lowConfidenceCount = 0;

    // Process each recognized speech segment
    recognizedSegments.forEach((seg, idx) => {
      const segText = seg.text.trim();
      let bestRefIdx = -1;
      let highestSimilarity = 0.0;

      // Find the closest matching reference passage
      refPassages.forEach((refText, rIdx) => {
        // Direct similarity
        let sim = this.calculateSimilarity(segText, refText);

        // Cross-script transliteration fallback if scripts differ
        if (sim < 0.4) {
          const normRef = this.normalizeForComparison(refText);
          const normSeg = this.normalizeForComparison(segText);

          // If comparing Devanagari to Roman or Urdu, project to Roman
          const romanSeg = ScriptConversionService.devanagariToRomanUrdu(normSeg);
          const romanRef =
            detectedFormat === 'urdu_script'
              ? ScriptConversionService.persoArabicToRomanUrdu(normRef)
              : detectedFormat === 'hindi_devanagari'
              ? ScriptConversionService.devanagariToRomanUrdu(normRef)
              : normRef;

          const crossSim = this.calculateSimilarity(romanSeg, romanRef);
          if (crossSim > sim) {
            sim = crossSim;
          }
        }

        if (sim > highestSimilarity) {
          highestSimilarity = sim;
          bestRefIdx = rIdx;
        }
      });

      const matchedRefText = bestRefIdx !== -1 && highestSimilarity >= 0.40 ? refPassages[bestRefIdx] : undefined;
      if (bestRefIdx !== -1 && highestSimilarity >= 0.40) {
        matchedRefIndices.add(bestRefIdx);
      }

      let status: AlignmentStatus = 'confirmed';
      let statusLabel = 'Confirmed Alignment';
      let suggestedText: string | undefined = undefined;

      // Classify alignment fidelity
      if (!matchedRefText || highestSimilarity < 0.40) {
        // Speaker said something absent from the reference script (ad-lib or unscripted remark)
        status = 'spoken_addition';
        statusLabel = 'Spoken Addition (Not in Script)';
        additionCount++;
      } else if (highestSimilarity >= 0.90) {
        // Near-perfect match - adopt refined punctuation and orthography from reference
        status = 'confirmed';
        statusLabel = 'Confirmed Alignment';
        confirmedCount++;
        suggestedText = matchedRefText;
      } else if (highestSimilarity >= 0.40) {
        // Moderate match: ASR likely had phonetic/nukta/spelling discrepancy
        status = 'suggested_correction';
        statusLabel = 'Suggested Correction from Script';
        suggestedText = matchedRefText;
        correctionCount++;
      }

      // Check for low audio confidence
      const avgConfidence =
        seg.words && seg.words.length > 0
          ? seg.words.reduce((sum, w) => sum + (w.confidence ?? 1.0), 0) / seg.words.length
          : 0.9;

      if (avgConfidence < 0.60 && status !== 'spoken_addition') {
        status = 'low_confidence';
        statusLabel = 'Low-Confidence Audio';
        lowConfidenceCount++;
      }

      const isTextReplaced = (status === 'confirmed' && Boolean(suggestedText) && suggestedText !== seg.text);
      const updatedText = (status === 'confirmed' && suggestedText) ? suggestedText : seg.text;

      // Update segment with alignment metadata
      // If reference text replaces ASR text, clear raw ASR word tokens to prevent displaying mismatched words
      const updatedSegment: TranscriptionSegment = {
        ...seg,
        alignmentStatus: status,
        referenceMatch: matchedRefText,
        text: updatedText,
        words: isTextReplaced ? [] : seg.words
      };

      alignedSegments.push(updatedSegment);

      // Create review item if there is a suggestion, addition, or low-confidence
      const reviewItem: AlignmentReviewItem = {
        id: `rev_${seg.id || idx + 1}_${Date.now().toString(36)}`,
        segmentId: seg.id || `seg_${idx + 1}`,
        start: seg.start,
        end: seg.end,
        recognizedText: seg.text,
        referenceText: matchedRefText,
        suggestedText: suggestedText || seg.text,
        status,
        statusLabel,
        confidence: Number(highestSimilarity.toFixed(2)),
        resolvedState: status === 'confirmed' ? 'accepted' : 'pending'
      };

      reviewItems.push(reviewItem);
    });

    // Detect omitted reference passages (in script, but skipped by speaker)
    const omittedReferencePassages: string[] = [];
    refPassages.forEach((refText, rIdx) => {
      if (!matchedRefIndices.has(rIdx)) {
        omittedReferencePassages.push(refText);
      }
    });

    const omittedCount = omittedReferencePassages.length;

    logger.info(
      `[ReferenceAlignment] Aligned ${recognizedSegments.length} segments with reference (${confirmedCount} confirmed, ${correctionCount} corrections, ${additionCount} additions, ${omittedCount} omitted).`
    );

    return {
      alignedSegments,
      reviewItems,
      detectedScriptFormat: detectedFormat,
      omittedReferencePassages,
      stats: {
        totalSegments: recognizedSegments.length,
        confirmedCount,
        correctionCount,
        additionCount,
        omittedCount,
        lowConfidenceCount
      }
    };
  }

  /**
   * Apply a user resolution to a specific review item
   */
  public static resolveReviewItem(params: {
    segments: TranscriptionSegment[];
    reviewItems: AlignmentReviewItem[];
    reviewItemId: string;
    action: ReviewResolutionState;
    editedText?: string;
  }): { segments: TranscriptionSegment[]; reviewItems: AlignmentReviewItem[] } {
    const { segments, reviewItems, reviewItemId, action, editedText } = params;

    const item = reviewItems.find((r) => r.id === reviewItemId);
    if (!item) return { segments, reviewItems };

    item.resolvedState = action;
    if (editedText !== undefined) {
      item.editedText = editedText;
    }

    // Determine the final text to apply to the transcript segment
    let finalSegText = item.recognizedText;
    if (action === 'accepted') {
      finalSegText = item.suggestedText || item.referenceText || item.recognizedText;
    } else if (action === 'edited') {
      finalSegText = item.editedText || item.recognizedText;
    } else if (action === 'rejected') {
      finalSegText = item.recognizedText;
    }

    // Update the segment text without modifying timestamps
    const updatedSegments = segments.map((seg) => {
      if (seg.id === item.segmentId) {
        const isTextChanged = finalSegText !== item.recognizedText;
        return {
          ...seg,
          text: finalSegText,
          // When reference text replaces ASR text, clear raw ASR word tokens to prevent displaying mismatched words
          words: isTextChanged ? [] : seg.words
        };
      }
      return seg;
    });

    return {
      segments: updatedSegments,
      reviewItems
    };
  }

  /**
   * Accept all pending suggested corrections in one click
   */
  public static acceptAllCorrections(params: {
    segments: TranscriptionSegment[];
    reviewItems: AlignmentReviewItem[];
  }): { segments: TranscriptionSegment[]; reviewItems: AlignmentReviewItem[] } {
    const { segments, reviewItems } = params;

    const segMap = new Map<string, string>();

    reviewItems.forEach((item) => {
      if (item.status === 'suggested_correction' || item.status === 'confirmed') {
        item.resolvedState = 'accepted';
        segMap.set(item.segmentId, item.suggestedText || item.referenceText || item.recognizedText);
      }
    });

    const updatedSegments = segments.map((seg) => {
      if (segMap.has(seg.id)) {
        const newText = segMap.get(seg.id)!;
        const isTextChanged = newText !== seg.text;
        return {
          ...seg,
          text: newText,
          // When reference text replaces ASR text, clear raw ASR word tokens to prevent displaying mismatched words
          words: isTextChanged ? [] : seg.words
        };
      }
      return seg;
    });

    return {
      segments: updatedSegments,
      reviewItems
    };
  }
}