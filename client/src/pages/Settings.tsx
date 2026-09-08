import React, { useState } from 'react';
import { ApiHealthResponse } from '../../../shared/src/types';
import { Settings as SettingsIcon, Radio, ShieldCheck, CheckCircle2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { ApiClient } from '../services/api';

interface SettingsProps {
  apiHealth: ApiHealthResponse;
  onRefreshHealth: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ apiHealth, onRefreshHealth }) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await ApiClient.testConnection();
      setTestResult(res);
      onRefreshHealth();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to connect to Fish Audio API.'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="border-b border-studio-border pb-4">
        <h1 className="text-2xl font-serif font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-black dark:text-white" />
          <span>Studio & API Settings.</span>
        </h1>
        <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mt-0.5">
          FISH AUDIO DEVELOPER INTEGRATION & SERVER STATUS
        </p>
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
            <span className="text-[10px] font-bold text-slate-500 uppercase">Max Concurrent TTS Jobs</span>
            <p className="font-bold text-slate-900 dark:text-white">2 Jobs (Controlled Rate Limit Queue)</p>
          </div>
        </div>

        {/* Test Connection Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition self-start sm:self-auto"
          >
            {testing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white dark:text-black" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{testing ? 'Testing API Connection...' : 'Test API Connection'}</span>
          </button>

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                  : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Security Best Practices Card */}
      <div className="glass-panel rounded-2xl p-6 border border-studio-border space-y-3 shadow-sm bg-white dark:bg-studio-900">
        <div className="flex items-center gap-2 text-sm font-serif font-bold text-slate-900 dark:text-white">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>Security & Key Protection Architecture</span>
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
          VoiceForge Studio strictly follows server-side security guidelines:
        </p>

        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-sans">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
            <span><code className="text-black dark:text-white font-mono bg-slate-100 dark:bg-studio-800 px-1 py-0.5 rounded">FISH_API_KEY</code> is loaded only in <code className="text-black dark:text-white font-mono bg-slate-100 dark:bg-studio-800 px-1 py-0.5 rounded">server/.env</code> and never bundled into frontend JavaScript.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
            <span>All TTS requests flow from Browser → Express Backend → Fish Audio API → Audio Stream → Browser.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
