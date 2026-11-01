import {
  DocumentaryProject,
  DocumentaryScene,
  DocumentaryHandoffResult
} from './documentaryTypes';
import {
  EditorProject,
  TimelineClip,
  TimelineTrack,
  MediaAsset
} from './videoEditorTypes';
import {
  createNewProject,
  DEFAULT_TRANSFORM,
  DEFAULT_SPEED,
  DEFAULT_COLOR_GRADING,
  DEFAULT_AUDIO_SETTINGS
} from './videoEditorDefaults';

/**
 * Calculates estimated reading duration in seconds for narration text (~140 wpm).
 */
export function estimateWordDuration(text: string): number {
  if (!text || !text.trim()) return 3.5;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // ~2.33 words per second (140 WPM)
  return Math.max(3.0, Number((words / 2.33).toFixed(2)));
}

/**
 * Parses raw documentary text into structured scenes.
 * Handles headings like:
 * [SCENE 1: The Discovery]
 * Visual: Aerial shot of ruins
 * Narration text here...
 */
export function parseScriptToScenes(scriptText: string): DocumentaryScene[] {
  if (!scriptText || !scriptText.trim()) {
    return [
      {
        id: `scene_${Date.now()}_1`,
        sceneNumber: 1,
        title: 'Opening Scene',
        narrationText: 'Every civilization begins with a forgotten truth.',
        visualInstruction: 'Cinematic wide shot establishing historical context',
        sceneDescription: 'Atmospheric opening with moody lighting',
        duration: 4.5
      }
    ];
  }

  // Split by scene headers: [SCENE ...], ### Scene ..., or double newline blocks
  const sceneHeaderRegex = /(?:\[SCENE\s*(\d*):?\s*([^\]]*)\])|(?:###\s*Scene\s*(\d*):?\s*([^\n]+))|(?:Scene\s*(\d+):?\s*([^\n]+))/gi;

  const sections: Array<{ title: string; body: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let currentTitle = 'Scene 1: Introduction';

  const matches: Array<{ index: number; title: string }> = [];
  while ((match = sceneHeaderRegex.exec(scriptText)) !== null) {
    const rawTitle = (match[2] || match[4] || match[6] || '').trim();
    const sceneNum = match[1] || match[3] || match[5] || (matches.length + 1).toString();
    const title = rawTitle ? `Scene ${sceneNum}: ${rawTitle}` : `Scene ${sceneNum}`;
    matches.push({ index: match.index, title });
  }

  if (matches.length === 0) {
    // Split by double newlines into natural paragraphs
    const paragraphs = scriptText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    return paragraphs.map((para, idx) => {
      // Check for visual cue like [Visual: ...] or Visual: ...
      let visual = 'Establishing shot matching narrative tone';
      let narration = para;

      const visualMatch = para.match(/(?:\[Visual:?\s*([^\]]+)\])|(?:Visual:?\s*([^\n]+))/i);
      if (visualMatch) {
        visual = (visualMatch[1] || visualMatch[2] || '').trim();
        narration = para.replace(visualMatch[0], '').trim();
      }

      return {
        id: `scene_${Date.now()}_${idx + 1}`,
        sceneNumber: idx + 1,
        title: `Scene ${idx + 1}`,
        narrationText: narration,
        visualInstruction: visual,
        sceneDescription: `Scene ${idx + 1} narration and visual setup`,
        duration: estimateWordDuration(narration)
      };
    });
  }

  // Slice sections according to header positions
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : scriptText.length;
    const rawSection = scriptText.substring(start, end).trim();
    // remove header line
    const lines = rawSection.split('\n');
    const body = lines.slice(1).join('\n').trim();
    sections.push({ title: matches[i].title, body });
  }

  return sections.map((sec, idx) => {
    let visual = 'Atmospheric scene matching narration tone';
    let narration = sec.body;

    const visualMatch = sec.body.match(/(?:\[Visual:?\s*([^\]]+)\])|(?:Visual:?\s*([^\n]+))/i);
    if (visualMatch) {
      visual = (visualMatch[1] || visualMatch[2] || '').trim();
      narration = sec.body.replace(visualMatch[0], '').trim();
    }

    return {
      id: `scene_${Date.now()}_${idx + 1}`,
      sceneNumber: idx + 1,
      title: sec.title,
      narrationText: narration,
      visualInstruction: visual,
      sceneDescription: `Visual setup for ${sec.title}`,
      duration: estimateWordDuration(narration)
    };
  });
}

/**
 * Compiles a DocumentaryProject into a full-featured multitrack EditorProject.
 */
export function compileDocumentaryToEditorProject(doc: DocumentaryProject): DocumentaryHandoffResult {
  const baseProject = createNewProject(doc.name || 'Documentary Cut', doc.aspectRatio || '16:9');
  
  // Custom multitrack tracks layout optimized for documentary production
  const tracks: TimelineTrack[] = [
    { id: 'track-titles', name: 'Titles & Motion Graphics (V2)', type: 'text', locked: false, muted: false, hidden: false, order: 0 },
    { id: 'track-visuals', name: 'Documentary B-Roll (V1)', type: 'video', locked: false, muted: false, hidden: false, order: 1 },
    { id: 'track-voiceover', name: 'Narration Voiceover (A1)', type: 'audio', locked: false, muted: false, hidden: false, order: 2 },
    { id: 'track-music', name: 'Documentary Score (A2)', type: 'audio', locked: false, muted: false, hidden: false, order: 3 }
  ];

  const clips: TimelineClip[] = [];
  const assets: MediaAsset[] = [];
  const assetMap = new Map<string, MediaAsset>();

  let timelineCursor = 0;
  let visualClipsCount = 0;
  let voiceoverClipsCount = 0;
  let titleClipsCount = 0;
  let captionCount = 0;

  doc.scenes.forEach((scene, index) => {
    // Resolve scene duration based on voiceover duration or computed duration
    const sceneDuration = Math.max(
      2.0,
      scene.voiceoverAsset?.duration || scene.duration || estimateWordDuration(scene.narrationText)
    );

    // 1. Voiceover Narration Track (A1)
    if (scene.voiceoverAsset && scene.voiceoverAsset.url) {
      const voAssetId = scene.voiceoverAsset.id || `vo_asset_${scene.id}`;
      if (!assetMap.has(voAssetId)) {
        const ma: MediaAsset = {
          id: voAssetId,
          name: scene.voiceoverAsset.name || `Voiceover Scene ${scene.sceneNumber}`,
          url: scene.voiceoverAsset.url,
          type: 'audio',
          duration: sceneDuration,
          createdAt: new Date().toISOString()
        };
        assetMap.set(voAssetId, ma);
        assets.push(ma);
      }

      clips.push({
        id: `clip_vo_${scene.id}`,
        trackId: 'track-voiceover',
        assetId: voAssetId,
        name: `VO: ${scene.title}`,
        type: 'audio',
        start: timelineCursor,
        duration: sceneDuration,
        sourceStart: 0,
        sourceDuration: sceneDuration,
        url: scene.voiceoverAsset.url,
        transform: { ...DEFAULT_TRANSFORM },
        speed: { ...DEFAULT_SPEED },
        colorGrading: { ...DEFAULT_COLOR_GRADING },
        audio: { ...DEFAULT_AUDIO_SETTINGS, volume: 100 },
        effects: [],
        keyframes: []
      });
      voiceoverClipsCount++;
    }

    // 2. Visual B-Roll Track (V1)
    if (scene.visualAsset && scene.visualAsset.url) {
      const visAssetId = scene.visualAsset.id || `vis_asset_${scene.id}`;
      if (!assetMap.has(visAssetId)) {
        const ma: MediaAsset = {
          id: visAssetId,
          name: scene.visualAsset.name || `B-Roll Scene ${scene.sceneNumber}`,
          url: scene.visualAsset.url,
          type: scene.visualAsset.type || 'video',
          duration: sceneDuration,
          thumbnailUrl: scene.visualAsset.thumbnailUrl,
          createdAt: new Date().toISOString()
        };
        assetMap.set(visAssetId, ma);
        assets.push(ma);
      }

      clips.push({
        id: `clip_vis_${scene.id}`,
        trackId: 'track-visuals',
        assetId: visAssetId,
        name: `B-Roll: ${scene.visualAsset.name || scene.title}`,
        type: scene.visualAsset.type === 'image' ? 'image' : 'video',
        start: timelineCursor,
        duration: sceneDuration,
        sourceStart: 0,
        sourceDuration: scene.visualAsset.duration || sceneDuration,
        url: scene.visualAsset.url,
        captionPresetId: doc.captionSettings.enabled ? doc.captionSettings.presetId : undefined,
        transform: {
          ...DEFAULT_TRANSFORM,
          fitMode: 'fill'
        },
        speed: { ...DEFAULT_SPEED },
        colorGrading: {
          ...DEFAULT_COLOR_GRADING,
          // subtle cinematic contrast for documentary feel
          contrast: 8,
          highlights: 4,
          saturation: 2
        },
        audio: { ...DEFAULT_AUDIO_SETTINGS, volume: 0, muted: true }, // Mute raw B-roll audio by default
        effects: [],
        keyframes: []
      });
      visualClipsCount++;
    }

    // 3. Motion Graphic Titles (V2)
    if (scene.motionGraphic && scene.motionGraphic.enabled && scene.motionGraphic.titleDesign) {
      const titleDur = Math.min(sceneDuration, Math.max(1.5, scene.motionGraphic.duration || 3.5));
      const titleStart = timelineCursor + (scene.motionGraphic.startTimeOffset || 0);

      clips.push({
        id: `clip_title_${scene.id}`,
        trackId: 'track-titles',
        name: scene.motionGraphic.titleDesign.mainText || `Title: ${scene.title}`,
        type: 'text',
        start: titleStart,
        duration: titleDur,
        sourceStart: 0,
        sourceDuration: titleDur,
        text: scene.motionGraphic.titleDesign.mainText,
        titleDesign: { ...scene.motionGraphic.titleDesign },
        transform: { ...DEFAULT_TRANSFORM },
        speed: { ...DEFAULT_SPEED },
        colorGrading: { ...DEFAULT_COLOR_GRADING },
        audio: { ...DEFAULT_AUDIO_SETTINGS },
        effects: [],
        keyframes: []
      });
      titleClipsCount++;
    }

    // 4. Transcription Segments for Captions
    if (scene.transcriptionSegments && scene.transcriptionSegments.length > 0) {
      captionCount += scene.transcriptionSegments.length;
    }

    timelineCursor += sceneDuration;
  });

  // 5. Background Score Track (A2)
  if (doc.backgroundMusic && doc.backgroundMusic.url) {
    const musicAssetId = doc.backgroundMusic.assetId || 'bg_doc_score';
    if (!assetMap.has(musicAssetId)) {
      const ma: MediaAsset = {
        id: musicAssetId,
        name: doc.backgroundMusic.name || 'Documentary Score',
        url: doc.backgroundMusic.url,
        type: 'audio',
        duration: timelineCursor,
        createdAt: new Date().toISOString()
      };
      assetMap.set(musicAssetId, ma);
      assets.push(ma);
    }

    clips.push({
      id: 'clip_bg_score',
      trackId: 'track-music',
      assetId: musicAssetId,
      name: doc.backgroundMusic.name || 'Documentary Score',
      type: 'audio',
      start: 0,
      duration: timelineCursor,
      sourceStart: 0,
      sourceDuration: timelineCursor,
      url: doc.backgroundMusic.url,
      transform: { ...DEFAULT_TRANSFORM },
      speed: { ...DEFAULT_SPEED },
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      audio: {
        ...DEFAULT_AUDIO_SETTINGS,
        volume: doc.backgroundMusic.volume || 18, // Bed level under voiceover
        fadeInDuration: 1.5,
        fadeOutDuration: 2.0
      },
      effects: [],
      keyframes: []
    });
  }

  const finalDuration = Math.max(10, Math.ceil(timelineCursor));

  const editorProject: EditorProject = {
    ...baseProject,
    id: `doc_cut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: doc.name ? `${doc.name} (Documentary Cut)` : 'Documentary Cut',
    duration: finalDuration,
    tracks,
    clips,
    assets,
    updatedAt: new Date().toISOString()
  };

  return {
    success: true,
    editorProject,
    stats: {
      totalDuration: finalDuration,
      sceneCount: doc.scenes.length,
      visualClipsCount,
      voiceoverClipsCount,
      titleClipsCount,
      captionCount
    }
  };
}

