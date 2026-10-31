import assert from 'assert';
import {
  CAPTION_PRESETS,
  CaptionCategory,
  CaptionPresetId,
  CATEGORY_DEFINITIONS,
  hexToAssColor,
  assToHexColor
} from '../shared/src/captionPresets';
import { CAPTION_PRESET_PREVIEWS } from '../shared/src/captionPresetPreviews';
import { AiCaptionStyler } from '../shared/src/aiCaptionStyler';
import { assDocument, CaptionRenderOptions } from '../server/src/services/captionVideoService';
import { TranscriptionSegment } from '../shared/src/types';

console.log('=======================================================');
console.log(' Running Caption Studio 2.0 Feature & Engine Tests');
console.log('=======================================================');

async function runCaptionTests() {
  // ----------------------------------------------------
  // TEST 1: Preset Library & Categories Completeness
  // ----------------------------------------------------
  console.log('\n[Test 1] Validating Preset Library & Category Mapping...');

  assert(CAPTION_PRESETS.length >= 45, `Expected >= 45 presets, got ${CAPTION_PRESETS.length}`);
  console.log(`✓ Total Presets in Library: ${CAPTION_PRESETS.length}`);

  const requiredCategories: CaptionCategory[] = [
    'cinematic',
    'viral',
    'typography',
    'gaming',
    'educational',
    'documentary',
    'multilingual',
    'classics'
  ];

  for (const cat of requiredCategories) {
    const inCat = CAPTION_PRESETS.filter((p) => p.category === cat);
    assert(inCat.length > 0, `Category '${cat}' must have presets defined.`);
    console.log(`  - Category '${cat}': ${inCat.length} presets`);
  }

  // Check specific requested presets
  const checkPresets: CaptionPresetId[] = [
    'doc_white',
    'historical_gold',
    'cinematic_serif',
    'minimal_film',
    'dramatic_shadow',
    'luxury_editorial',
    'vintage_doc',
    'netflix_doc',
    'bold_viral',
    'dynamic_pop',
    'creator_highlight',
    'podcast_punch',
    'reaction_captions',
    'high_contrast',
    'fast_emphasis',
    'minimal_creator',
    'modern_sans',
    'elegant_serif',
    'editorial_magazine',
    'typewriter_clean',
    'condensed_bold',
    'geometric_minimal',
    'retro_typography',
    'luxury_typography',
    'neon_pulse',
    'electric_impact',
    'glitch_typography',
    'rgb_highlight',
    'gaming_bold',
    'energy_burst',
    'clean_learning',
    'lecture_notes',
    'keyword_focus',
    'explainer_pro',
    'prof_presentation',
    'minimal_academic',
    'historical_archive',
    'ancient_gold',
    'investigation',
    'mystery_dark',
    'news_documentary',
    'dark_cinematic',
    'epic_storytelling',
    'narrator_focus',
    'urdu_nastaliq',
    'urdu_naskh',
    'urdu_modern',
    'roman_urdu_viral',
    'roman_hindi_bold',
    'roman_shayari',
    'roman_desi_hype'
  ];

  for (const pid of checkPresets) {
    const found = CAPTION_PRESETS.find((p) => p.id === pid);
    assert(found, `Preset '${pid}' must be registered in CAPTION_PRESETS.`);
    const preview = CAPTION_PRESET_PREVIEWS[pid];
    assert(preview, `Preset preview card must be registered for '${pid}'.`);
  }
  console.log(`✓ All 51 designated signature presets & preview cards verified.`);

  // ----------------------------------------------------
  // TEST 2: Color Conversion Utilities
  // ----------------------------------------------------
  console.log('\n[Test 2] Validating Hex ↔ ASS Color Format Conversions...');

  // Pure White
  assert.strictEqual(hexToAssColor('#FFFFFF'), '&H00FFFFFF&');
  assert.strictEqual(assToHexColor('&H00FFFFFF&'), '#FFFFFF');

  // Red (#FF0000 -> &H000000FF&)
  assert.strictEqual(hexToAssColor('#FF0000'), '&H000000FF&');
  assert.strictEqual(assToHexColor('&H000000FF&'), '#FF0000');

  // Gold (#FFD700 -> &H0000D7FF&)
  assert.strictEqual(hexToAssColor('#FFD700'), '&H0000D7FF&');
  assert.strictEqual(assToHexColor('&H0000D7FF&'), '#FFD700');

  console.log('✓ Hex and ASS color transformations verified.');

  // ----------------------------------------------------
  // TEST 3: Intelligent AI Caption Styling Engine
  // ----------------------------------------------------
  console.log('\n[Test 3] Testing Intelligent AI Caption Styling Engine...');

  // Test Case A: Historical Narration
  const historySegments: TranscriptionSegment[] = [
    {
      id: 'h1',
      start: 0,
      end: 4.5,
      text: 'In the ancient centuries of the Egyptian empire, great pharaohs ruled the golden desert.'
    },
    {
      id: 'h2',
      start: 4.5,
      end: 8.5,
      text: 'Archaeological ruins and historic monuments remain timeless.'
    }
  ];

  const historyAnalysis = AiCaptionStyler.analyze(historySegments, 8.5);
  assert(
    historyAnalysis.recommendedPreset === 'historical_gold' ||
      historyAnalysis.recommendedPreset === 'ancient_gold',
    `Expected historical preset, got: ${historyAnalysis.recommendedPreset}`
  );
  assert(historyAnalysis.keyPhrases.length > 0, 'Should extract historical key phrases');
  console.log(
    `✓ Historical script correctly analyzed → Recommended: ${historyAnalysis.recommendedPresetName} (WPM: ${historyAnalysis.pacingWpm})`
  );

  // Test Case B: High-Energy Viral / Gaming
  const viralSegments: TranscriptionSegment[] = [
    {
      id: 'v1',
      start: 0,
      end: 2.0,
      text: 'OMG this is insane! Look at that crazy win!'
    },
    {
      id: 'v2',
      start: 2.0,
      end: 4.0,
      text: 'Unbelievable clutch level boss defeat! Drop a like right now!'
    }
  ];

  const viralAnalysis = AiCaptionStyler.analyze(viralSegments, 4.0);
  assert(
    viralAnalysis.recommendedPreset === 'bold_viral' ||
      viralAnalysis.recommendedPreset === 'dynamic_pop' ||
      viralAnalysis.recommendedPreset === 'reaction_captions',
    `Expected viral preset, got: ${viralAnalysis.recommendedPreset}`
  );
  assert.strictEqual(viralAnalysis.recommendedWordsPerCaption, 2, 'High-energy clips should recommend punchy 2 words per caption');
  console.log(
    `✓ Viral script correctly analyzed → Recommended: ${viralAnalysis.recommendedPresetName} (Words/Clip: ${viralAnalysis.recommendedWordsPerCaption})`
  );

  // Test Case C: Educational / Explainer
  const eduSegments: TranscriptionSegment[] = [
    {
      id: 'e1',
      start: 0,
      end: 5.0,
      text: 'In this lesson, we will understand the scientific principle behind neural algorithms.'
    },
    {
      id: 'e2',
      start: 5.0,
      end: 10.0,
      text: 'The first step is to analyze the formula using structured methods.'
    }
  ];

  const eduAnalysis = AiCaptionStyler.analyze(eduSegments, 10.0);
  assert(
    eduAnalysis.recommendedPreset === 'clean_learning' ||
      eduAnalysis.recommendedPreset === 'keyword_focus',
    `Expected educational preset, got: ${eduAnalysis.recommendedPreset}`
  );
  console.log(
    `✓ Educational script correctly analyzed → Recommended: ${eduAnalysis.recommendedPresetName}`
  );

  // Test Case D: Urdu Nastaliq
  const urduSegments: TranscriptionSegment[] = [
    {
      id: 'u1',
      start: 0,
      end: 3.5,
      text: 'یہ داستانِ محبت اور دل کی یادوں کا سفر ہے۔'
    }
  ];

  const urduAnalysis = AiCaptionStyler.analyze(urduSegments, 3.5);
  assert.strictEqual(urduAnalysis.recommendedPreset, 'urdu_nastaliq');
  assert.strictEqual(urduAnalysis.isRtl, true);
  console.log(`✓ Urdu script correctly analyzed → RTL: true, Preset: ${urduAnalysis.recommendedPresetName}`);

  // Test Case E: Roman Urdu / Hindi
  const romanSegments: TranscriptionSegment[] = [
    {
      id: 'r1',
      start: 0,
      end: 3.0,
      text: 'Bhai ye video dekh ke maza aayega, bilkul crazy content hai!'
    }
  ];

  const romanAnalysis = AiCaptionStyler.analyze(romanSegments, 3.0);
  assert(
    romanAnalysis.recommendedPreset === 'roman_urdu_viral' ||
      romanAnalysis.recommendedPreset === 'roman_hindi_bold',
    `Expected Roman Desi preset, got: ${romanAnalysis.recommendedPreset}`
  );
  console.log(
    `✓ Roman Urdu/Hindi script correctly analyzed → Preset: ${romanAnalysis.recommendedPresetName}`
  );

  // ----------------------------------------------------
  // TEST 4: ASS Subtitle Engine & Resolution Scaling
  // ----------------------------------------------------
  console.log('\n[Test 4] Testing ASS Subtitle Generation & Resolution Scaling...');

  const sampleSegments: TranscriptionSegment[] = [
    {
      id: 's1',
      start: 1.0,
      end: 3.0,
      text: 'VoiceForge Studio Captions',
      words: [
        { word: 'VoiceForge', start: 1.0, end: 1.6 },
        { word: 'Studio', start: 1.6, end: 2.2 },
        { word: 'Captions', start: 2.2, end: 3.0 }
      ]
    }
  ];

  // 1. Vertical 9:16 (1080x1920)
  const verticalAss = assDocument(
    sampleSegments,
    {
      preset: 'bold_viral',
      animationStyle: 'pop',
      wordHighlight: true,
      safeZone: true
    },
    1080,
    1920
  );

  assert(verticalAss.includes('PlayResX: 1080'), 'Must define PlayResX: 1080');
  assert(verticalAss.includes('PlayResY: 1920'), 'Must define PlayResY: 1920');
  assert(verticalAss.includes('Style: Default,Montserrat'), 'Must use Montserrat for bold_viral');
  assert(verticalAss.includes('Dialogue: 0,0:00:01.00'), 'Must start at 0:00:01.00');
  assert(verticalAss.includes('\\fscx'), 'Must contain scaling animation tag');
  console.log('✓ Vertical 9:16 (1080x1920) ASS document verified.');

  // 2. Landscape 16:9 (1920x1080)
  const landscapeAss = assDocument(
    sampleSegments,
    {
      preset: 'historical_gold',
      animationStyle: 'fade'
    },
    1920,
    1080
  );

  assert(landscapeAss.includes('PlayResX: 1920'), 'Must define PlayResX: 1920');
  assert(landscapeAss.includes('PlayResY: 1080'), 'Must define PlayResY: 1080');
  assert(landscapeAss.includes('Style: Default,Cinzel'), 'Must use Cinzel font');
  console.log('✓ Landscape 16:9 (1920x1080) ASS document verified.');

  // 3. Square 1:1 (1080x1080)
  const squareAss = assDocument(
    sampleSegments,
    {
      preset: 'podcast_punch',
      boxBackground: true
    },
    1080,
    1080
  );

  assert(squareAss.includes('PlayResX: 1080'), 'Must define PlayResX: 1080');
  assert(squareAss.includes('PlayResY: 1080'), 'Must define PlayResY: 1080');
  console.log('✓ Square 1:1 (1080x1080) ASS document verified.');

  // 4. RTL Urdu Script
  const urduAss = assDocument(
    urduSegments,
    {
      preset: 'urdu_nastaliq'
    },
    1080,
    1920
  );
  assert(urduAss.includes('Noto Nastaliq Urdu'), 'Must specify Noto Nastaliq Urdu');
  console.log('✓ RTL Urdu ASS document verified with Noto Nastaliq font.');

  console.log('\n=======================================================');
  console.log(' ALL CAPTION STUDIO 2.0 UNIT TESTS PASSED SUCCESSFULLY!');
  console.log('=======================================================');
}

runCaptionTests().catch((err) => {
  console.error('\n❌ CAPTION TEST FAILED:', err);
  process.exit(1);
});

