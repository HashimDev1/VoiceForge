import * as mm from 'music-metadata-browser';
import {
  AudioMetadataSummary,
  AudioTagDetail,
  AudioAiIndicator,
  AudioFormat,
} from './audioTypes';
import { detectAudioFormatFromBytes, detectAudioFormatFromMimeOrName } from './audioFormatDetector';
import { inspectAudioTagForAi, detectAudioAiProvenance } from './audioAiTagMatcher';

function scanBytesForC2paAndXmp(buffer: ArrayBuffer): {
  c2paDetected: boolean;
  xmpDetected: boolean;
  digitalSourceTypeFound: boolean;
} {
  const bytes = new Uint8Array(buffer);
  const len = Math.min(bytes.length, 1024 * 1024); // Scan first 1MB
  let text = '';
  // Convert printable ASCII chars to string for fast regex scanning
  for (let i = 0; i < len; i++) {
    const b = bytes[i];
    if (b >= 32 && b <= 126) {
      text += String.fromCharCode(b);
    } else {
      text += ' ';
    }
  }

  const c2paDetected =
    text.includes('c2pa') ||
    text.includes('jumb') ||
    text.includes('c2ma') ||
    text.includes('urn:c2pa') ||
    text.includes('ContentCredentials');

  const xmpDetected =
    text.includes('<x:xmpmeta') ||
    text.includes('http://ns.adobe.com/xap/1.0/') ||
    text.includes('DigitalSourceType');

  const digitalSourceTypeFound =
    text.includes('trainedAlgorithmicMedia') ||
    text.includes('compositeWithTrainedAlgorithmicMedia') ||
    text.includes('DigitalSourceType');

  return { c2paDetected, xmpDetected, digitalSourceTypeFound };
}

export async function readAudioMetadata(file: File): Promise<AudioMetadataSummary> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let detectedFormat: AudioFormat = detectAudioFormatFromBytes(bytes);
  if (detectedFormat === 'unknown') {
    detectedFormat = detectAudioFormatFromMimeOrName(file.name, file.type);
  }

  const tags: AudioTagDetail[] = [];
  const aiIndicators: AudioAiIndicator[] = [];

  let duration: number | undefined;
  let bitrate: number | undefined;
  let sampleRate: number | undefined;
  let numberOfChannels: number | undefined;

  let hasId3v2 = false;
  let hasId3v1 = false;
  let hasVorbis = false;
  let hasMp4Atoms = false;
  let hasRiffInfo = false;

  let id3TagCount = 0;
  let vorbisTagCount = 0;
  let mp4AtomCount = 0;
  let riffChunkCount = 0;

  // 1. Try parsing with music-metadata-browser
  try {
    const parsed = await mm.parseBlob(file, { duration: true });
    if (parsed.format) {
      duration = parsed.format.duration;
      bitrate = parsed.format.bitrate;
      sampleRate = parsed.format.sampleRate;
      numberOfChannels = parsed.format.numberOfChannels;

      if (parsed.format.tagTypes) {
        hasId3v2 = parsed.format.tagTypes.some((t) => t.toLowerCase().includes('id3v2'));
        hasId3v1 = parsed.format.tagTypes.some((t) => t.toLowerCase().includes('id3v1'));
        hasVorbis = parsed.format.tagTypes.some((t) => t.toLowerCase().includes('vorbis'));
        hasMp4Atoms = parsed.format.tagTypes.some(
          (t) => t.toLowerCase().includes('itunes') || t.toLowerCase().includes('mp4')
        );
        hasRiffInfo = parsed.format.tagTypes.some((t) => t.toLowerCase().includes('riff'));
      }
    }

    // Process common tags
    if (parsed.common) {
      for (const [k, v] of Object.entries(parsed.common)) {
        if (v === undefined || v === null || k === 'picture') continue;
        const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
        const aiCheck = inspectAudioTagForAi(k, valStr);

        tags.push({
          key: k,
          value: valStr,
          category: hasId3v2 ? 'ID3v2' : hasVorbis ? 'Vorbis' : 'Other',
          isAi: aiCheck.isAi,
          aiReason: aiCheck.reason,
        });

        if (aiCheck.isAi) {
          aiIndicators.push({
            tag: k,
            value: valStr,
            source: 'comment',
            reason: aiCheck.reason || 'AI tool marker detected',
          });
        }
      }
    }

    // Process native tags
    if (parsed.native) {
      for (const [tagFamily, nativeTags] of Object.entries(parsed.native)) {
        let cat: AudioTagDetail['category'] = 'Other';
        const tf = tagFamily.toLowerCase();
        if (tf.includes('id3v2')) {
          cat = 'ID3v2';
          id3TagCount += nativeTags.length;
        } else if (tf.includes('id3v1')) {
          cat = 'ID3v1';
          id3TagCount += nativeTags.length;
        } else if (tf.includes('vorbis')) {
          cat = 'Vorbis';
          vorbisTagCount += nativeTags.length;
        } else if (tf.includes('itunes') || tf.includes('mp4')) {
          cat = 'MP4';
          mp4AtomCount += nativeTags.length;
        } else if (tf.includes('riff')) {
          cat = 'RIFF';
          riffChunkCount += nativeTags.length;
        }

        for (const t of nativeTags) {
          if (!t.id || t.value === undefined || t.value === null) continue;
          const valStr = typeof t.value === 'object' ? JSON.stringify(t.value) : String(t.value);
          const aiCheck = inspectAudioTagForAi(t.id, valStr);

          tags.push({
            key: t.id,
            value: valStr,
            category: cat,
            isAi: aiCheck.isAi,
            aiReason: aiCheck.reason,
          });

          if (aiCheck.isAi) {
            aiIndicators.push({
              tag: t.id,
              value: valStr,
              source:
                cat === 'ID3v2' || cat === 'ID3v1'
                  ? 'id3'
                  : cat === 'Vorbis'
                  ? 'vorbis'
                  : cat === 'MP4'
                  ? 'mp4'
                  : 'other',
              reason: aiCheck.reason || 'AI tool signature in audio tag',
            });
          }
        }
      }
    }
  } catch (err) {
    // If music-metadata-browser fails or throws on raw bytes, we still do byte-level inspection below
    console.warn('music-metadata-browser parse warning:', err);
  }

  // 2. Direct binary scanning for C2PA, XMP & ID3 markers
  const rawScan = scanBytesForC2paAndXmp(buffer);

  // Check ID3v2 header manually if not flagged
  if (!hasId3v2 && bytes.length >= 10) {
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      hasId3v2 = true;
      id3TagCount = Math.max(id3TagCount, 1);
    }
  }

  // Check ID3v1 trailing tag manually if not flagged
  if (!hasId3v1 && bytes.length >= 128) {
    const offset = bytes.length - 128;
    if (bytes[offset] === 0x54 && bytes[offset + 1] === 0x41 && bytes[offset + 2] === 0x47) {
      hasId3v1 = true;
      id3TagCount = Math.max(id3TagCount, 1);
    }
  }

  if (rawScan.c2paDetected) {
    tags.unshift({
      key: 'C2PA Manifest',
      value: 'Content Credentials (C2PA / JUMBF) detected in audio container',
      category: 'C2PA',
      isAi: true,
      aiReason: 'Cryptographic C2PA provenance manifest embedded',
    });
    aiIndicators.unshift({
      tag: 'C2PA',
      value: 'C2PA Manifest',
      source: 'c2pa',
      reason: 'Cryptographic provenance manifest found',
    });
  }

  if (rawScan.digitalSourceTypeFound) {
    tags.unshift({
      key: 'XMP:DigitalSourceType',
      value: 'trainedAlgorithmicMedia (AI-generated audio provenance)',
      category: 'XMP',
      isAi: true,
      aiReason: 'Direct AI digital source type declaration',
    });
    aiIndicators.unshift({
      tag: 'DigitalSourceType',
      value: 'trainedAlgorithmicMedia',
      source: 'other',
      reason: 'Standard AI generation provenance declaration',
    });
  }

  const aiDetection = detectAudioAiProvenance(tags);

  return {
    format: detectedFormat,
    mimeType: file.type || `audio/${detectedFormat}`,
    duration,
    bitrate,
    sampleRate,
    numberOfChannels,
    hasId3v2,
    hasId3v1,
    hasVorbis,
    hasMp4Atoms,
    hasRiffInfo,
    hasC2pa: rawScan.c2paDetected,
    hasAiProvenance: aiDetection.isAi || rawScan.digitalSourceTypeFound || rawScan.c2paDetected,
    aiToolDetected: aiDetection.toolName,
    aiIndicators,
    totalTagsCount: tags.length,
    tags,
    rawSummary: {
      id3TagCount: id3TagCount || (hasId3v2 ? 1 : 0),
      vorbisTagCount,
      mp4AtomCount,
      riffChunkCount,
      c2paDetected: rawScan.c2paDetected,
    },
  };
}

