import React, { useState } from 'react';
import { ApiHealthResponse } from '../../../shared/src/types';
import { Settings as SettingsIcon, Radio, ShieldCheck, CheckCircle2, AlertCircle, Sparkles, RefreshCw, Sun, Moon, Zap, Volume2, Cpu } from 'lucide-react';
import { ApiClient } from '../services/api';

interface SettingsProps {
  apiHealth: ApiHealthResponse;
  onRefreshHealth: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ apiHealth, onRefreshHealth, theme, onToggleTheme }) => {
  const [testingFish, setTestingFish] = useState(false);
  const [fishTestResult, setFishTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingOpenSource, setTestingOpenSource] = useState(false);
  const [openSourceTestResult, setOpenSourceTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestFishConnection = async () => {
    try {
      setTestingFish(true);
      setFishTestResult(null);
      const res = await ApiClient.testConnection();
      setFishTestResult(res);
      onRefreshHealth();
    } catch (err: any) {
      setFishTestResult({
        success: false,
        message: err.message || 'Failed to connect to Fish Audio API.'
      });
    } finally {
      setTestingFish(false);
    }
  };

  const handleTestOpenSourceConnection = async () => {
    try {
      setTestingOpenSource(true);
      setOpenSourceTestResult(null);
      const res = await ApiClient.testOpenSourceConnection();
      setOpenSourceTestResult(res);
      onRefreshHealth();
    } catch (err: any) {
      setOpenSourceTestResult({
        success: false,
        message: err.message || 'Failed to test Open-Source TTS engine.'
      });
    } finally {
      setTestingOpenSource(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-studio-border pb-5 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm shrink-0">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900 dark:text-white tracking-tight">
              Studio & TTS Settings<span className="text-indigo-600 dark:text-indigo-400">.</span>
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300 border border-studio-border uppercase tracking-wider">
              System & API
            </span>
          </div>
          <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest pl-11">
            MULTI-ENGINE ARCHITECTURE: OPEN-SOURCE (100% FREE) & CLOUD TTS
          </p>
        </div>

        <button
          onClick={onRefreshHealth}
          className="px-4 py-2 bg-white dark:bg-studio-900 text-slate-900 dark:text-slate-100 hover:border-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider border border-studio-border transition flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Open-Source Neural TTS Card */}
      <div className="glass-panel rounded-2xl p-6 border border-emerald-500/30 dark:border-emerald-500/20 space-y-4 shadow-sm bg-white dark:bg-studio-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-studio-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-300 dark:border-emerald-800">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-serif font-bold text-slate-900 dark:text-white">Open-Source Neural TTS Engine</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  100% FREE • UNLIMITED
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500">Engine: Microsoft Edge-TTS Neural (Zero-cost, Python Asyncio Daemon)</p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border flex items-center gap-1.5 bg-emerald-500 text-white border-emerald-600 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ACTIVE & READY</span>
          </span>
        </div>

        {/* Configuration Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-slate-50 dark:bg-studio-850 p-3.5 rounded-xl border border-studio-border space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Pricing / Cost</span>
            <p className="font-bold text-emerald-600 dark:text-emerald-400">$0.00 / Free Forever (No Credit Card / No API Key)</p>
          </div>

          <div className="bg-slate-50 dark:bg-studio-850 p-3.5 rounded-xl border border-studio-border space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Available Voices</span>
            <p className="font-bold text-slate-900 dark:text-white">19+ Curated Voices (Christopher, Guy, Andrew, Jenny, etc.)</p>
          </div>

          <div className="bg-slate-50 dark:bg-studio-850 p-3.5 rounded-xl border border-studio-border space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Hardware Requirements</span>
            <p className="text-slate-700 dark:text-slate-300">Any CPU or laptop (Zero GPU needed, ~0.4s per sentence)</p>
          </div>

          <div className="bg-slate-50 dark:bg-studio-850 p-3.5 rounded-xl border border-studio-border space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">YouTube Monetization</span>
            <p className="font-bold text-slate-900 dark:text-white">Passed & Compliant (Natural cadence for Shorts & Essays)</p>
          </div>
        </div>

        {/* Test Open Source Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={handleTestOpenSourceConnection}
            disabled={testingOpenSource}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition self-start sm:self-auto cursor-pointer"
          >
            {testingOpenSource ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span>{testingOpenSource ? 'Testing Open-Source Voice...' : 'Test Open-Source TTS Engine'}</span>
          </button>

          {openSourceTestResult && (
            <div
              className={`p-3 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${
                openSourceTestResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                  : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
              }`}
            >
              {openSourceTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              )}
              <span>{openSourceTestResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Fish Audio Integration Card */}
      <div className="glass-panel rounded-2xl p-6 border border-studio-border space-y-4 shadow-sm bg-white dark:bg-studio-900">
        <div className="flex items-center justify-between border-b border-studio-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-studio-800 text-slate-900 dark:text-slate-100 flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-serif font-bold text-slate-900 dark:text-white">Fish Audio Provider Integration</h3>
              <p className="text-xs font-mono text-slate-500">Endpoint: https://api.fish.audio/v1/tts</p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border flex items-center gap-1.5 ${
              apiHealth.fishAudioConnected
                ? 'bg-black text-white dark:bg-white dark:text-black border-black'
                : 'bg-rose-100 text-rose-700 border-rose-300'
            }`}
          >
            {apiHealth.fishAudioConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>CONNECTED</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>NOT CONNECTED</span>
              </>
            )}
          </span>
        </div>

        {/* Configuration Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-slate-50 dark:bg-studio-850 p-3.5 rounded-xl border border-studio-border space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Provider</span>
            <p className="font-bold text-slate-900 dark:text-white">Fish Audio</p>
          </div>

          <div className="bg-slate-50 dark:bg-studio-850 p-3.5 rounded-xl border border-studio-border space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Current Model</span>
            <p className="font-bold text-slate-900 dark:text-white">S2.1 Pro Free (s2.1-pro-free)</p>
          </div>

          <div className="bg-slate-50 dark:bg-studio-850 p-3.5 rounded-xl border border-studio-border space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">API Key Storage</span>
            <p className="text-slate-700 dark:text-slate-300">•••••••••••••••• (Stored in server .env)</p>
          </div>

          <div className="bg-slate-50 dark:bg-studio-850 p-3.5 rounded-xl border border-studio-border space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Automatic Fallback</span>
            <p className="font-bold text-emerald-600 dark:text-emerald-400">Enabled → Falls back to Open-Source TTS if quota exhausted</p>
          </div>
        </div>

        {/* Test Connection Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={handleTestFishConnection}
            disabled={testingFish}
            className="px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition self-start sm:self-auto cursor-pointer"
          >
            {testingFish ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white dark:text-black" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{testingFish ? 'Testing API Connection...' : 'Test Fish Audio API'}</span>
          </button>

          {fishTestResult && (
            <div
              className={`p-3 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${
                fishTestResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                  : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
              }`}
            >
              {fishTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              )}
              <span>{fishTestResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Appearance Theme Card */}
      {onToggleTheme && (
        <div className="glass-panel rounded-2xl p-6 border border-studio-border flex items-center justify-between shadow-sm bg-white dark:bg-studio-900">
          <div>
            <h3 className="text-sm font-serif font-bold text-slate-900 dark:text-white">Appearance Theme</h3>
            <p className="text-xs font-mono text-slate-500">Currently active: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
          </div>
          <button
            onClick={onToggleTheme}
            className="px-4 py-2 bg-slate-100 dark:bg-studio-850 border border-studio-border rounded-xl text-xs font-mono font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200 hover:border-black transition cursor-pointer"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      )}

      {/* Architecture Highlights Card */}
      <div className="glass-panel rounded-2xl p-6 border border-studio-border space-y-3 shadow-sm bg-white dark:bg-studio-900">
        <div className="flex items-center gap-2 text-sm font-serif font-bold text-slate-900 dark:text-white">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>Multi-Engine & Key Protection Architecture</span>
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
          VoiceForge Studio gives you complete freedom and reliability:
        </p>

        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-sans">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span><strong>Open-Source TTS:</strong> 100% free, runs with zero API keys, no monthly usage bills, and instant rendering.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
            <span><strong>Fish Audio Cloud:</strong> Optional premium voice design and custom clone IDs loaded safely via server .env.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span><strong>Automatic Fallback:</strong> If Fish Audio API hits rate limits or credit limits, VoiceForge automatically falls back to Open-Source TTS so your workflow never gets interrupted.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
