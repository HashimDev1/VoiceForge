import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Sparkles, 
  Play, 
  Pause, 
  Download, 
  RefreshCw, 
  Sliders, 
  Volume2, 
  Globe, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Music,
  Award,
  Layers
} from 'lucide-react';
import { Voice } from '../../../shared/src/types';
import { ApiClient } from '../services/api';

interface OpenSourceStudioProps {
  onAudioPlay?: (url: string) => void;
  onSendToScriptStudio?: (text: string, voiceId: string, audioUrl?: string) => void;
}

const SAMPLE_SCRIPTS = [
  {
    title: 'Documentary Mystery (Kokoro Adam)',
    voice: 'kokoro_am_adam',
    engine: 'Kokoro 82M',
    text: 'Deep beneath the Antarctic ice sheet, researchers uncovered something that defied modern physics. An acoustic pulse, repeating every thirty-two minutes with mathematical precision.'
  },
  {
    title: 'Studio Narrator (Kokoro Heart)',
    voice: 'kokoro_af_heart',
    engine: 'Kokoro 82M',
    text: 'Welcome to VoiceForge Studio. There are moments in science when everything we thought we understood about the cosmos quietly dissolves, making way for the extraordinary.'
  },
  {
    title: 'BBC Documentary (Kokoro George)',
    voice: 'kokoro_bm_george',
    engine: 'Kokoro 82M',
    text: 'In the high misty valleys of the Scottish Highlands, the golden eagle rides the thermal updrafts, surveying an ancient landscape untouched for millennia.'
  },
  {
    title: 'Tech Explainer (Kokoro Michael)',
    voice: 'kokoro_am_michael',
    engine: 'Kokoro 82M',
    text: 'Artificial intelligence is moving faster than any technological revolution in history. Today, we are breaking down three breakthroughs that will completely change how you work.'
  },
  {
    title: 'Viral Shorts Hook (Kokoro Nova)',
    voice: 'kokoro_af_nova',
    engine: 'Kokoro 82M',
    text: 'Stop scrolling! What if I told you that the pyramids were built using a technique that was lost for four thousand years? Here is what archaeologists just found.'
  },
  {
    title: 'British Narration (Edge Brian)',
    voice: 'edge_en-US-BrianNeural',
    engine: 'Edge-TTS',
    text: 'For centuries, historians debated the origin of the library of Alexandria. The reality was far more dramatic than anyone had previously imagined.'
  }
];

export const OpenSourceStudio: React.FC<OpenSourceStudioProps> = ({
  onAudioPlay,
  onSendToScriptStudio
}) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('kokoro_af_heart');
  const [text, setText] = useState<string>(SAMPLE_SCRIPTS[0].text);
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<string>('+0Hz');
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'wav'>('mp3');
  const [isGenerating, setIsGenerating] = useState(false);
  const [testStatus, setTestStatus] = useState<{ running: boolean; message?: string; success?: boolean } | null>(null);
  
  // Results & Multi-takes
  const [generatedTakes, setGeneratedTakes] = useState<{ id: string; take: number; url: string; size: number; duration: number; voiceId?: string }[]>([]);
  const [activeTakeIndex, setActiveTakeIndex] = useState<number>(0);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Filters
  const [engineFilter, setEngineFilter] = useState<'all' | 'kokoro' | 'edge'>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('All');

  useEffect(() => {
    // Fetch dedicated open-source voices
    ApiClient.getOpenSourceVoices()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.voices || []);
        if (list.length > 0) {
          setVoices(list);
          // Prefer kokoro_af_heart or kokoro_am_adam if available
          const preferred = list.find((v: Voice) => v.id === 'kokoro_af_heart') || list.find((v: Voice) => v.id === 'kokoro_am_adam') || list[0];
          setSelectedVoiceId(preferred.id);
        }
      })
      .catch((err) => {
        console.error('Failed to load open-source voices:', err);
      });
  }, []);

  const handleTestEngine = async () => {
    setTestStatus({ running: true });
    try {
      const res = await ApiClient.testOpenSourceConnection();
      setTestStatus({
        running: false,
        success: res.success,
        message: res.message || (res.success ? 'Open-Source TTS Engines verified & active!' : 'Check failed.')
      });
    } catch (err: any) {
      setTestStatus({
        running: false,
        success: false,
        message: err.message || 'Engine test failed.'
      });
    }
  };

  const handleGenerate = async (takeNum: number = 1) => {
    if (!text.trim()) {
      setErrorMsg('Please enter some text to synthesize.');
      return;
    }
    setErrorMsg(null);
    setIsGenerating(true);

    try {
      const res = await ApiClient.generateOpenSourceTTS({
        text: text.trim(),
        voiceId: selectedVoiceId,
        speechSpeed,
        pitch,
        format: audioFormat,
        numTakes: takeNum
      });

      if (res.success && res.audioUrl) {
        const newTake = {
          id: `take_${Date.now()}_${takeNum}`,
          take: takeNum,
          url: res.audioUrl,
          size: res.sizeBytes || 0,
          duration: res.duration || 0,
          voiceId: selectedVoiceId
        };
        setGeneratedTakes((prev) => [newTake, ...prev]);
        setActiveTakeIndex(0);
        handlePlayAudio(res.audioUrl);
      } else {
        setErrorMsg('Failed to synthesize speech.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Generation failed. Verify engine health.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayAudio = (url: string) => {
    if (audioElement) {
      audioElement.pause();
    }
    const audio = new Audio(url);
    setAudioElement(audio);
    setPlayingUrl(url);
    audio.play().catch(console.error);
    audio.onended = () => setPlayingUrl(null);

    if (onAudioPlay) {
      onAudioPlay(url);
    }
  };

  const handleStopAudio = () => {
    if (audioElement) {
      audioElement.pause();
      setPlayingUrl(null);
    }
  };

  const currentTake = generatedTakes[activeTakeIndex] || null;

  // Filter voices by engine and language
  const filteredVoices = voices.filter((v) => {
    const isKokoro = v.id.startsWith('kokoro_');
    const matchesEngine = 
      engineFilter === 'all' ? true :
      engineFilter === 'kokoro' ? isKokoro :
      !isKokoro;
    
    const matchesLang = languageFilter === 'All' || v.language === languageFilter;
    return matchesEngine && matchesLang;
  });

  const languages = ['All', ...Array.from(new Set(voices.map((v) => v.language || 'English')))];
  const selectedVoice = voices.find((v) => v.id === selectedVoiceId) || voices[0];
  const isCurrentKokoro = selectedVoiceId?.startsWith('kokoro_');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-studio-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center shadow-md font-mono font-bold">
              <Cpu className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-serif font-extrabold text-slate-900 dark:text-white">
              Open-Source AI Studio.
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
              KOKORO-82M & EDGE-TTS
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              100% FREE & UNLIMITED
            </span>
          </div>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mt-1">
            LOCAL NEURAL AI • ELEVENLABS-GRADE AUDIO CADENCE • ZERO API KEYS • ZERO COST
          </p>
        </div>

        {/* Engine Diagnostic & Quick Health Status */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTestEngine}
            disabled={testStatus?.running}
            className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-studio-border hover:bg-slate-100 dark:hover:bg-studio-800 transition flex items-center gap-2 text-slate-700 dark:text-slate-300 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testStatus?.running ? 'animate-spin' : ''}`} />
            <span>{testStatus?.running ? 'Testing Models...' : 'Check Engine Status'}</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-studio-850 border border-studio-border text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-700 dark:text-slate-300 font-semibold">Kokoro + Edge Active</span>
          </div>
        </div>
      </div>

      {/* Test Status Alert */}
      {testStatus && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            testStatus.success
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {testStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{testStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setTestStatus(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl text-xs bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-xs underline"
          >
            Close
          </button>
        </div>
      )}

      {/* Main Grid: Script Input on Left, Voice & Audio Settings on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Script Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-studio-border bg-white dark:bg-studio-900 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Script / Narration Prompt
              </span>
              <div className="flex items-center gap-2">
                {isCurrentKokoro && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1 font-mono">
                    <Award className="w-3 h-3 text-purple-600" />
                    Kokoro Studio AI
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono">
                  {text.length} chars • ~{Math.ceil(text.trim().split(/\s+/).filter(Boolean).length / 2.5)}s duration
                </span>
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="Paste or type your script here. Experience studio-grade neural voiceover with Kokoro-82M and Edge-TTS with unlimited zero-cost generation..."
              className="w-full p-4 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-900 dark:text-white font-sans text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none transition resize-y"
            />

            {/* Quick Presets */}
            <div className="mt-4 pt-3 border-t border-studio-border">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-2">
                Sample Production Scripts (Click to Load):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_SCRIPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setText(item.text);
                      if (voices.some((v) => v.id === item.voice)) {
                        setSelectedVoiceId(item.voice);
                      }
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg border border-studio-border hover:bg-slate-100 dark:hover:bg-studio-800 transition text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5"
                  >
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-studio-border">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setText('')}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition font-medium"
                >
                  Clear Text
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerate(1)}
                  disabled={isGenerating || !text.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm font-sans"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 fill-white" />
                  )}
                  <span>{isGenerating ? 'Synthesizing Studio Audio...' : 'Generate Voiceover (100% Free)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerate(2)}
                  disabled={isGenerating || !text.trim()}
                  title="Generate alternative take with natural cadence variation"
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-studio-800 dark:hover:bg-studio-750 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <span>+ Take 2</span>
                </button>
              </div>
            </div>
          </div>

          {/* Audio Output / Player Card */}
          {generatedTakes.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50/30 dark:bg-indigo-950/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider font-mono text-indigo-900 dark:text-indigo-300">
                    Generated Audio ({generatedTakes.length} {generatedTakes.length === 1 ? 'Take' : 'Takes'})
                  </span>
                </div>

                {/* Take Switcher */}
                <div className="flex items-center gap-1">
                  {generatedTakes.map((take, idx) => (
                    <button
                      key={take.id}
                      type="button"
                      onClick={() => {
                        setActiveTakeIndex(idx);
                        handlePlayAudio(take.url);
                      }}
                      className={`px-2.5 py-1 text-xs rounded-lg font-mono font-bold transition ${
                        activeTakeIndex === idx
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white dark:bg-studio-800 text-slate-700 dark:text-slate-300 border border-studio-border'
                      }`}
                    >
                      Take {take.take}
                    </button>
                  ))}
                </div>
              </div>

              {currentTake && (
                <div className="bg-white dark:bg-studio-900 p-4 rounded-xl border border-studio-border space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <span>Duration: ~{currentTake.duration.toFixed(1)}s</span>
                    <span>Size: {(currentTake.size / 1024).toFixed(1)} KB</span>
                    <span className="text-indigo-600 font-bold">
                      {currentTake.voiceId?.startsWith('kokoro_') ? 'Kokoro 82M Studio AI' : 'Edge-TTS Neural'}
                    </span>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center gap-3">
                    {playingUrl === currentTake.url ? (
                      <button
                        type="button"
                        onClick={handleStopAudio}
                        className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center hover:opacity-90 transition shadow-sm"
                      >
                        <Pause className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(currentTake.url)}
                        className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition shadow-sm"
                      >
                        <Play className="w-5 h-5 ml-0.5 fill-white" />
                      </button>
                    )}

                    <audio
                      src={currentTake.url}
                      controls
                      className="w-full h-10 rounded-lg accent-indigo-600"
                    />
                  </div>

                  {/* Download & Transfer Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-studio-border">
                    <a
                      href={currentTake.url}
                      download={`voiceforge_studio_${Date.now()}.${audioFormat}`}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-studio-border hover:bg-slate-100 dark:hover:bg-studio-800 transition flex items-center gap-2 text-slate-700 dark:text-slate-300"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download {audioFormat.toUpperCase()}</span>
                    </a>

                    {onSendToScriptStudio && (
                      <button
                        type="button"
                        onClick={() => onSendToScriptStudio(text, selectedVoiceId, currentTake.url)}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <span>Send to Script Studio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Voice Library & Audio Settings (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Voice Selector Card */}
          <div className="glass-panel p-5 rounded-2xl border border-studio-border bg-white dark:bg-studio-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Model & Voice Library ({filteredVoices.length})
              </span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                Zero Cost / No API Key
              </span>
            </div>

            {/* Model Engine Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-studio-800 rounded-xl">
              <button
                type="button"
                onClick={() => setEngineFilter('all')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  engineFilter === 'all'
                    ? 'bg-white dark:bg-studio-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Models
              </button>
              <button
                type="button"
                onClick={() => setEngineFilter('kokoro')}
                className={`py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                  engineFilter === 'kokoro'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                    : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-800'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Kokoro 82M ⭐</span>
              </button>
              <button
                type="button"
                onClick={() => setEngineFilter('edge')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  engineFilter === 'edge'
                    ? 'bg-white dark:bg-studio-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Edge-TTS
              </button>
            </div>

            {/* Language Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {languages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguageFilter(lang)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-medium whitespace-nowrap transition ${
                    languageFilter === lang
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm font-bold'
                      : 'bg-slate-100 dark:bg-studio-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Voice Cards List */}
            <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
              {filteredVoices.map((v) => {
                const isSelected = v.id === selectedVoiceId;
                const isKokoro = v.id.startsWith('kokoro_');
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVoiceId(v.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                      isSelected
                        ? isKokoro 
                          ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 shadow-sm ring-1 ring-indigo-500'
                          : 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm ring-1 ring-emerald-500'
                        : 'border-studio-border bg-slate-50/50 dark:bg-studio-850 hover:border-slate-300 dark:hover:border-studio-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {v.name}
                        </span>
                        {v.gender && (
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            ({v.gender})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {v.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-slate-200 dark:bg-studio-750 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                          {v.category || 'Narration'}
                        </span>
                        {isKokoro ? (
                          <span className="text-[9px] font-mono bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                            Kokoro Studio 82M
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            Edge-TTS
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isSelected && (
                        <div className={`w-5 h-5 rounded-full text-white flex items-center justify-center ${isKokoro ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prosody & Audio Controls */}
          <div className="glass-panel p-5 rounded-2xl border border-studio-border bg-white dark:bg-studio-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>Audio Prosody Controls</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSpeechSpeed(1.0);
                  setPitch('+0Hz');
                }}
                className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-mono flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Speed Multiplier Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-600 dark:text-slate-400">Speech Speed:</span>
                <span className="font-bold text-slate-900 dark:text-white">{speechSpeed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={speechSpeed}
                onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0.5x (Slow)</span>
                <span>1.0x (Natural)</span>
                <span>2.0x (Fast)</span>
              </div>
            </div>

            {/* Pitch Shift Controls (Edge-TTS only) */}
            {!isCurrentKokoro && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-600 dark:text-slate-400">Pitch Shift:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{pitch}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Deep (-5Hz)', val: '-5Hz' },
                    { label: 'Natural (0Hz)', val: '+0Hz' },
                    { label: 'High (+3Hz)', val: '+3Hz' },
                    { label: 'Bright (+6Hz)', val: '+6Hz' }
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setPitch(item.val)}
                      className={`px-2 py-1.5 text-[11px] rounded-lg font-mono font-medium transition text-center ${
                        pitch === item.val
                          ? 'bg-emerald-600 text-white font-bold shadow-sm'
                          : 'bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-studio-750'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Audio Format Selector */}
            <div className="space-y-1.5 pt-2 border-t border-studio-border">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-600 dark:text-slate-400">Audio Format:</span>
                <span className="font-bold uppercase text-slate-900 dark:text-white">{audioFormat}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAudioFormat('mp3')}
                  className={`py-2 text-xs rounded-xl font-bold transition font-mono ${
                    audioFormat === 'mp3'
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                      : 'bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  MP3 (YouTube Ready)
                </button>
                <button
                  type="button"
                  onClick={() => setAudioFormat('wav')}
                  className={`py-2 text-xs rounded-xl font-bold transition font-mono ${
                    audioFormat === 'wav'
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                      : 'bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  WAV (Lossless 24kHz/48kHz)
                </button>
              </div>
            </div>

            {/* Zero-Cost & Privacy Guarantee Badge */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-studio-950 border border-studio-border flex items-center gap-2 text-xs text-slate-500 font-mono">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Zero API usage charged. Kokoro runs locally on your machine with 100% privacy.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
