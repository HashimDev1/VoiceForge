import React, { useState, useRef } from 'react';
import {
  Sparkles,
  X,
  FileText,
  Mic,
  Film,
  Camera,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  Layers,
  ChevronRight,
  ArrowRight,
  Wand2,
  Volume2,
  Upload,
  Subtitles,
  HelpCircle,
  Copy,
  RefreshCw
} from 'lucide-react';
import {
  EditorProject,
  AspectRatio,
  FacelessVisualStyle,
  FacelessScriptRequest,
  FacelessAudioRequest
} from '../../../../shared/src/videoEditorTypes';
import { videoEditorApi } from '../../services/videoEditorApi';

interface FacelessAutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectLoaded: (project: EditorProject) => void;
  currentAspectRatio?: AspectRatio;
}

const STYLE_CARDS: Array<{
  id: FacelessVisualStyle;
  name: string;
  badge: string;
  desc: string;
  icon: any;
  gradient: string;
  border: string;
}> = [
  {
    id: 'cinematic',
    name: 'Cinematic 8K',
    badge: 'Photorealistic',
    desc: '35mm lens, volumetric lighting, Arri Alexa realism',
    icon: Film,
    gradient: 'from-amber-500/20 to-orange-600/10',
    border: 'border-amber-500/40'
  },
  {
    id: 'dark_mystery',
    name: 'Dark Mystery',
    badge: 'True Crime',
    desc: 'Noir shadows, foggy atmosphere, thriller drama',
    icon: Camera,
    gradient: 'from-slate-700/30 to-indigo-950/30',
    border: 'border-slate-500/40'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Sci-Fi',
    badge: 'Neon Tech',
    desc: 'Glowing cyan & magenta neon, futuristic cityscapes',
    icon: Sparkles,
    gradient: 'from-cyan-500/20 to-fuchsia-600/15',
    border: 'border-cyan-400/40'
  },
  {
    id: 'anime',
    name: 'Anime Masterpiece',
    badge: 'Shinkai Style',
    desc: 'Breathtaking vibrant skies, emotional anime aesthetic',
    icon: Wand2,
    gradient: 'from-pink-500/20 to-indigo-500/15',
    border: 'border-pink-400/40'
  },
  {
    id: 'pixar_3d',
    name: '3D Pixar / Disney',
    badge: 'Stylized 3D',
    desc: 'Playful Octane 3D characters, soft clay lighting',
    icon: Layers,
    gradient: 'from-yellow-500/20 to-emerald-500/15',
    border: 'border-yellow-400/40'
  },
  {
    id: 'vintage',
    name: 'Vintage History',
    badge: 'Documentary',
    desc: '1920s archival photo, sepia Kodak film grain',
    icon: FileText,
    gradient: 'from-stone-600/20 to-amber-900/15',
    border: 'border-stone-400/40'
  },
  {
    id: 'stock_video',
    name: '4K Stock Video',
    badge: 'Pexels B-Roll',
    desc: 'Real high-definition stock video with drone camera motion',
    icon: Film,
    gradient: 'from-emerald-500/20 to-teal-600/15',
    border: 'border-emerald-400/40'
  }
];

const SAMPLE_SCRIPTS = [
  {
    title: 'Mysteries of Space',
    text: 'Deep in the cosmos, black holes swallow light and warp the very fabric of time. Scientists have recently detected an enigmatic signal repeating every sixteen days from a distant galaxy. No one knows what created it, but it proves we are not alone.'
  },
  {
    title: 'Stoic Mindset',
    text: 'You have power over your mind, not outside events. When you realize this, you will find immense strength. Do not let other people dictate your peace. Control what is within your control, and let everything else fall away.'
  },
  {
    title: 'Ancient Rome Mystery',
    text: 'Beneath the busy streets of modern Rome lies a subterranean labyrinth forgotten for centuries. Emperors hid their greatest treasures and darkest secrets here. Yesterday, archeologists uncovered a sealed marble chamber that hasn’t been opened in two thousand years.'
  }
];

const VOICES = [
  { id: 'en-US-ChristopherNeural', name: 'Christopher (Deep Documentary & Crime)' },
  { id: 'en-US-GuyNeural', name: 'Guy (Natural Storyteller)' },
  { id: 'en-US-JennyNeural', name: 'Jenny (Engaging Female Narrator)' },
  { id: 'kokoro_af_heart', name: 'Heart (Studio Golden Benchmark)' },
  { id: 'kokoro_am_adam', name: 'Adam (Cinematic Baritone)' }
];

export const FacelessAutoModal: React.FC<FacelessAutoModalProps> = ({
  isOpen,
  onClose,
  onProjectLoaded,
  currentAspectRatio = '9:16'
}) => {
  // Input Mode: 'script' | 'audio'
  const [activeMode, setActiveMode] = useState<'script' | 'audio'>('script');

  // Script Mode state
  const [scriptText, setScriptText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('en-US-ChristopherNeural');

  // Audio Mode state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [transcriptText, setTranscriptText] = useState('');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  // Common Settings
  const [style, setStyle] = useState<FacelessVisualStyle>('cinematic');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(currentAspectRatio);
  const [captionPreset, setCaptionPreset] = useState('hormozi_bold');
  const [projectName, setProjectName] = useState('');

  // Generation & Prompt Preview state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Prompt Customizer state
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [previewScenes, setPreviewScenes] = useState<Array<{ index: number; sentence: string; visualPrompt: string }>>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  const audioInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle previewing sentence prompts
  const handlePreviewPrompts = async () => {
    const textToAnalyze = activeMode === 'script' ? scriptText : transcriptText;
    if (!textToAnalyze.trim()) {
      setErrorMessage('Please enter your script or transcript to preview scene breakdown.');
      return;
    }
    setErrorMessage('');
    setIsLoadingPrompts(true);
    try {
      const scenes = await videoEditorApi.previewFacelessPrompts(textToAnalyze, style);
      setPreviewScenes(scenes);
      setShowPromptPreview(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to analyze script breakdown');
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  // Handle uploading audio file
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    setIsUploadingAudio(true);
    setErrorMessage('');
    try {
      const asset = await videoEditorApi.uploadMedia(file);
      setAudioUrl(asset.url);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload audio file');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // 1. Generate from Text Script
  const handleGenerateFromScript = async () => {
    if (!scriptText.trim()) {
      setErrorMessage('Please enter a script or select a sample to generate your video.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');
    setGenerationStage('Synthesizing voiceover audio with neural TTS...');

    try {
      const customPrompts = showPromptPreview ? previewScenes.map((s) => s.visualPrompt) : undefined;
      const result = await videoEditorApi.generateFacelessFromScript({
        script: scriptText,
        voiceId: selectedVoice,
        style,
        aspectRatio,
        captionPreset,
        customPrompts,
        projectName: projectName.trim() || undefined
      });

      if (!result.success || !result.project) {
        throw new Error(result.error || 'Failed to generate faceless video project');
      }

      onProjectLoaded(result.project);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating faceless video');
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Generate from Audio & Transcript
  const handleGenerateFromAudio = async () => {
    if (!audioUrl) {
      setErrorMessage('Please upload a voiceover audio file (.mp3, .wav, .m4a).');
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');
    setGenerationStage('Analyzing audio timestamps & synthesizing visual scenes...');

    try {
      const customPrompts = showPromptPreview ? previewScenes.map((s) => s.visualPrompt) : undefined;
      const result = await videoEditorApi.generateFacelessFromAudio({
        audioUrl,
        transcriptText: transcriptText.trim() || undefined,
        style,
        aspectRatio,
        captionPreset,
        customPrompts,
        projectName: projectName.trim() || undefined
      });

      if (!result.success || !result.project) {
        throw new Error(result.error || 'Failed to generate faceless video project');
      }

      onProjectLoaded(result.project);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error generating visuals from audio');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-2xl border border-[#2D3340] bg-[#16191F] text-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2D3340] bg-[#1C2028] px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#13E2CA] to-[#00F2DC] text-black font-extrabold shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-sans text-white tracking-tight flex items-center gap-2">
                Auto Faceless Video Studio
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#13E2CA]/20 text-[#13E2CA] border border-[#13E2CA]/40 uppercase font-bold">
                  AI Generator
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Generate complete captioned videos from script or sync visuals to an existing voiceover
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#282D38] hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selector Navigation */}
        <div className="flex border-b border-[#262A34] bg-[#12151B] px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => { setActiveMode('script'); setErrorMessage(''); }}
            disabled={isGenerating}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-sans font-bold transition cursor-pointer ${
              activeMode === 'script'
                ? 'border-[#13E2CA] text-[#13E2CA]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Mode 1: From Text Script</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveMode('audio'); setErrorMessage(''); }}
            disabled={isGenerating}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-sans font-bold transition cursor-pointer ${
              activeMode === 'audio'
                ? 'border-[#13E2CA] text-[#13E2CA]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Mode 2: From Voiceover Audio & Subtitles</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 vf-scrollbar">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ==============================================================
              MODE 1: TEXT SCRIPT MODE
              ============================================================== */}
          {activeMode === 'script' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold font-sans text-slate-200">
                    Video Script Text
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span>Sample scripts:</span>
                    {SAMPLE_SCRIPTS.map((s) => (
                      <button
                        key={s.title}
                        type="button"
                        onClick={() => setScriptText(s.text)}
                        className="px-2 py-0.5 rounded bg-[#222631] hover:bg-[#282D38] text-slate-300 hover:text-[#13E2CA] transition text-[10px] cursor-pointer"
                      >
                        {s.title}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="Paste your script here... Each sentence will automatically become a high-definition visual scene on the multitrack timeline."
                  className="w-full rounded-xl border border-[#2D3340] bg-[#111317] p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#13E2CA] transition resize-none font-sans"
                />
                <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
                  <span>{scriptText.split(/\s+/).filter(Boolean).length} words</span>
                  <span>Estimated duration: ~{Math.max(5, Math.round(scriptText.split(/\s+/).filter(Boolean).length / 2.5))}s</span>
                </div>
              </div>

              {/* Voiceover Voice Selection */}
              <div>
                <label className="text-xs font-bold font-sans text-slate-200 block mb-1.5">
                  AI Narrator Voice (Edge-TTS & Kokoro Neural)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {VOICES.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition cursor-pointer text-xs ${
                        selectedVoice === v.id
                          ? 'bg-[#153434] border-[#13E2CA] text-white shadow-xs'
                          : 'bg-[#1C2028] border-[#262A34] text-slate-300 hover:border-[#13E2CA]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Volume2 className={`w-4 h-4 shrink-0 ${selectedVoice === v.id ? 'text-[#13E2CA]' : 'text-slate-400'}`} />
                        <span className="font-sans font-medium truncate">{v.name}</span>
                      </div>
                      {selectedVoice === v.id && <CheckCircle2 className="w-4 h-4 text-[#13E2CA] shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              MODE 2: VOICE OVER AUDIO + TRANSCRIPT MODE
              ============================================================== */}
          {activeMode === 'audio' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold font-sans text-slate-200 block mb-1.5">
                  1. Upload Existing Voiceover Audio File
                </label>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*,video/mp4"
                  onChange={handleAudioUpload}
                  className="hidden"
                />

                <div
                  onClick={() => audioInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-[#2D3340] hover:border-[#13E2CA] bg-[#111317]/60 p-4 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <Upload className="w-6 h-6 text-[#13E2CA]" />
                  {audioFile ? (
                    <div>
                      <p className="text-xs font-bold text-white">{audioFile.name}</p>
                      <p className="text-[11px] text-emerald-400 font-mono mt-0.5">Uploaded & Ready ✓</p>
                    </div>
                  ) : isUploadingAudio ? (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <Loader2 className="w-4 h-4 animate-spin text-[#13E2CA]" />
                      <span>Uploading & probing audio...</span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-300">Click to select voiceover audio file</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">MP3, WAV, M4A, AAC supported</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold font-sans text-slate-200 flex items-center gap-1.5">
                    <span>2. Story Script or Transcript</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-medium">Recommended for story scenes</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-sans">
                    Syncs visuals to your narration
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Paste your story script or narration words here... (e.g. 'A lone warrior entered the dark kingdom. The sky turned crimson as dragons circled above.') Each sentence will become a matching AI visual scene!"
                  className="w-full rounded-xl border border-[#2D3340] bg-[#111317] p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#13E2CA] transition resize-none font-sans"
                />
                <div className="mt-1.5 p-2 rounded-lg bg-[#1A202C]/90 border border-amber-500/30 text-[11px] text-slate-300 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                  <span>
                    <strong>Why paste your script?</strong> The AI reads your story text to generate specific characters, environments, and dramatic moments. If left blank, scenes will be generated from generic atmospheric themes.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              SECTION 3: VISUAL STYLE SELECTION
              ============================================================== */}
          <div className="pt-2 border-t border-[#262A34]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold font-sans text-slate-200">
                Visual Art Style & B-Roll Engine
              </label>
              <span className="text-[10px] font-mono text-[#13E2CA]">
                7 Stylized Engines Supported
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {STYLE_CARDS.map((card) => {
                const Icon = card.icon;
                const isSelected = style === card.id;
                return (
                  <div
                    key={card.id}
                    onClick={() => setStyle(card.id)}
                    className={`relative p-3 rounded-xl border transition cursor-pointer select-none flex flex-col justify-between ${
                      isSelected
                        ? `bg-gradient-to-br ${card.gradient} ${card.border} shadow-sm shadow-[#13E2CA]/10`
                        : 'bg-[#181C23] border-[#262A34] hover:border-slate-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-[#13E2CA]' : 'text-slate-400'}`} />
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/50 text-slate-300">
                          {card.badge}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold font-sans text-white truncate">{card.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-[#13E2CA] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active Style</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ==============================================================
              SECTION 4: ASPECT RATIO & CAPTION PRESET
              ============================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#262A34]">
            {/* Aspect Ratio */}
            <div>
              <label className="text-xs font-bold font-sans text-slate-200 block mb-1.5">
                Aspect Ratio Format
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  ['9:16', 'Vertical (Shorts/TikTok)'],
                  ['16:9', 'Horizontal (YouTube)'],
                  ['1:1', 'Square (Instagram)']
                ].map(([ratio, label]) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio as AspectRatio)}
                    className={`p-2 rounded-lg border text-xs font-sans font-bold transition cursor-pointer text-center ${
                      aspectRatio === ratio
                        ? 'bg-[#13E2CA] text-black border-[#13E2CA] shadow-xs'
                        : 'bg-[#181C23] text-slate-300 border-[#262A34] hover:border-slate-500'
                    }`}
                  >
                    <div>{ratio}</div>
                    <div className="text-[9px] font-normal opacity-80 truncate">{label.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Captions Preset */}
            <div>
              <label className="text-xs font-bold font-sans text-slate-200 block mb-1.5">
                Dynamic Subtitles Preset
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  ['hormozi_bold', 'Hormozi Yellow'],
                  ['viral_pop', 'TikTok Bounce'],
                  ['neon_glow', 'Neon Cyan Glow'],
                  ['clean_minimal', 'Clean Minimal']
                ].map(([id, name]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCaptionPreset(id)}
                    className={`p-2 rounded-lg border text-xs font-sans font-bold transition cursor-pointer text-center truncate ${
                      captionPreset === id
                        ? 'bg-[#13E2CA]/20 text-[#13E2CA] border-[#13E2CA]'
                        : 'bg-[#181C23] text-slate-300 border-[#262A34] hover:border-slate-500'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Prompt Preview Accordion */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handlePreviewPrompts}
              disabled={isLoadingPrompts || isGenerating}
              className="flex items-center gap-1.5 text-xs text-[#13E2CA] hover:underline cursor-pointer font-sans font-medium"
            >
              {isLoadingPrompts ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sliders className="w-3.5 h-3.5" />
              )}
              <span>{showPromptPreview ? 'Refresh Scene Breakdown' : 'Preview & Tweak Visual Prompts'}</span>
            </button>

            {showPromptPreview && previewScenes.length > 0 && (
              <div className="mt-2.5 rounded-xl border border-[#2D3340] bg-[#111317] p-3 space-y-2 max-h-48 overflow-y-auto vf-scrollbar">
                <span className="text-[11px] font-bold text-slate-300 font-sans block mb-1">
                  Scene Breakdown ({previewScenes.length} scenes identified):
                </span>
                {previewScenes.map((sc, idx) => (
                  <div key={idx} className="p-2 rounded bg-[#181B20] border border-[#262A34] space-y-1">
                    <p className="text-[11px] text-slate-300 font-sans font-semibold">
                      Scene {idx + 1}: <span className="text-slate-400 font-normal">{sc.sentence}</span>
                    </p>
                    <input
                      type="text"
                      value={sc.visualPrompt}
                      onChange={(e) => {
                        const updated = [...previewScenes];
                        updated[idx].visualPrompt = e.target.value;
                        setPreviewScenes(updated);
                      }}
                      className="w-full bg-[#111317] border border-[#262A34] rounded px-2 py-1 text-[11px] text-amber-300 font-mono outline-none focus:border-[#13E2CA]"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#2D3340] bg-[#1C2028] px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-sans">
            <Sparkles className="w-3.5 h-3.5 text-[#13E2CA]" />
            <span>Ken Burns Pan & Zoom, Transitions & Captions included</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-[#222631] hover:bg-[#282D38] text-slate-300 text-xs font-bold font-sans cursor-pointer transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={activeMode === 'script' ? handleGenerateFromScript : handleGenerateFromAudio}
              disabled={isGenerating || (activeMode === 'audio' && !audioUrl)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#13E2CA] to-[#00C8B3] text-black text-xs font-bold font-sans cursor-pointer shadow-md hover:opacity-95 active:scale-98 transition disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>{generationStage || 'Generating...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-black" />
                  <span>Generate Full Faceless Video</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
