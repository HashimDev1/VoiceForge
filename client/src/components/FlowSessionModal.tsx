import React, { useState } from 'react';
import {
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  Upload,
  RefreshCw,
  ExternalLink,
  X,
  HelpCircle,
  Layers,
  Sparkles,
  Trash2
} from 'lucide-react';
import { FlowAccount } from '../../../shared/src/types';
import { FlowApi } from '../services/flowApi';

interface FlowSessionModalProps {
  accounts: FlowAccount[];
  initialAccountId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSessionUpdated: () => void;
}

export const FlowSessionModal: React.FC<FlowSessionModalProps> = ({
  accounts,
  initialAccountId,
  isOpen,
  onClose,
  onSessionUpdated
}) => {
  const [modalTab, setModalTab] = useState<'single' | 'bulk' | 'guide'>('single');
  const [selectedAccId, setSelectedAccId] = useState<string>(
    initialAccountId || (accounts.length > 0 ? accounts[0].id : '')
  );
  const [sessionInput, setSessionInput] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [tier, setTier] = useState('Google AI Pro / Flow Unlimited');
  const [bulkInput, setBulkInput] = useState('');

  // Status & loading
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentAccount = accounts.find((a) => a.id === selectedAccId);

  const handleSaveSingleSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionInput.trim()) {
      setResultMsg({ type: 'error', text: 'Please paste your Google Flow cookies or authorization token.' });
      return;
    }

    setSubmitting(true);
    setResultMsg(null);

    try {
      const updated = await FlowApi.saveAccountSession(selectedAccId, {
        cookies: sessionInput.trim(),
        userEmail: userEmail.trim() || undefined,
        tier: tier.trim() || undefined
      });

      // Automatically verify the newly saved session
      setVerifying(true);
      const verifyRes = await FlowApi.verifyAccountSession(selectedAccId);
      setVerifying(false);

      if (verifyRes.success) {
        setResultMsg({
          type: 'success',
          text: `Session successfully connected for ${updated.name}! Credits active and verified.`
        });
      } else {
        setResultMsg({
          type: 'success',
          text: `Session saved for ${updated.name}. Note: ${verifyRes.message}`
        });
      }

      setSessionInput('');
      onSessionUpdated();
    } catch (err: any) {
      setResultMsg({ type: 'error', text: err.message || 'Failed to save session credentials.' });
    } finally {
      setSubmitting(false);
      setVerifying(false);
    }
  };

  const handleVerifyCurrent = async () => {
    if (!selectedAccId) return;
    setVerifying(true);
    setResultMsg(null);

    try {
      const res = await FlowApi.verifyAccountSession(selectedAccId);
      if (res.success) {
        setResultMsg({ type: 'success', text: `Session verified: ${res.message}` });
      } else {
        setResultMsg({ type: 'error', text: `Session check: ${res.message}` });
      }
      onSessionUpdated();
    } catch (err: any) {
      setResultMsg({ type: 'error', text: err.message || 'Verification probe failed.' });
    } finally {
      setVerifying(false);
    }
  };

  const handleClearCurrent = async () => {
    if (!selectedAccId) return;
    if (!confirm('Disconnect this Google Flow session from the account profile?')) return;

    try {
      await FlowApi.deleteAccountSession(selectedAccId);
      setResultMsg({ type: 'success', text: 'Session removed successfully.' });
      onSessionUpdated();
    } catch (err: any) {
      setResultMsg({ type: 'error', text: err.message || 'Failed to clear session.' });
    }
  };

  const handleBulkImport = async () => {
    if (!bulkInput.trim()) {
      setResultMsg({ type: 'error', text: 'Please paste JSON containing the sessions to import.' });
      return;
    }

    setSubmitting(true);
    setResultMsg(null);

    try {
      const parsed = JSON.parse(bulkInput.trim());
      const sessions = Array.isArray(parsed) ? parsed : [parsed];

      const res = await FlowApi.bulkImportSessions({ sessions });
      setResultMsg({
        type: 'success',
        text: `Bulk import complete! Successfully connected ${res.importedCount} session(s).`
      });
      setBulkInput('');
      onSessionUpdated();
    } catch (err: any) {
      setResultMsg({ type: 'error', text: `Import failed: ${err.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportSessions = async () => {
    try {
      const sessions = await FlowApi.exportSessions();
      if (!sessions || sessions.length === 0) {
        setResultMsg({ type: 'error', text: 'No active sessions to export.' });
        return;
      }

      const jsonStr = JSON.stringify(sessions, null, 2);
      await navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      setResultMsg({ type: 'success', text: `Exported ${sessions.length} session(s) copied to clipboard!` });
      setTimeout(() => setCopied(false), 2500);
    } catch (err: any) {
      setResultMsg({ type: 'error', text: err.message || 'Failed to export sessions.' });
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-dropdown">
      <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-studio-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm shrink-0">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-extrabold text-slate-900 dark:text-white tracking-tight">
                Flow Session Vault<span className="text-indigo-600 dark:text-indigo-400">.</span>
              </h2>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                LINK GOOGLE FLOW ACCOUNTS & USE PRO CREDITS DIRECTLY
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-studio-800 flex items-center justify-center text-slate-400 hover:text-black dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-studio-border bg-slate-50/50 dark:bg-studio-950/40">
          <button
            onClick={() => { setModalTab('single'); setResultMsg(null); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer ${
              modalTab === 'single'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                : 'bg-white dark:bg-studio-900 border border-studio-border text-slate-600 dark:text-slate-400 hover:border-black'
            }`}
          >
            <span>Single Account</span>
          </button>

          <button
            onClick={() => { setModalTab('bulk'); setResultMsg(null); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer ${
              modalTab === 'bulk'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                : 'bg-white dark:bg-studio-900 border border-studio-border text-slate-600 dark:text-slate-400 hover:border-black'
            }`}
          >
            <span>Bulk Import / Export</span>
          </button>

          <button
            onClick={() => { setModalTab('guide'); setResultMsg(null); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              modalTab === 'guide'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                : 'bg-white dark:bg-studio-900 border border-studio-border text-slate-600 dark:text-slate-400 hover:border-black'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How to Copy Session</span>
          </button>
        </div>

        {/* Feedback message */}
        {resultMsg && (
          <div
            className={`mx-5 mt-4 px-4 py-2.5 rounded-xl text-xs font-mono flex items-center justify-between border ${
              resultMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {resultMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              )}
              <span>{resultMsg.text}</span>
            </div>
            <button
              onClick={() => setResultMsg(null)}
              className="text-xs font-bold underline cursor-pointer ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* TAB 1: SINGLE ACCOUNT */}
          {modalTab === 'single' && (
            <form onSubmit={handleSaveSingleSession} className="space-y-4">
              {/* Account Selection */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Target Account Profile
                </label>
                <select
                  value={selectedAccId}
                  onChange={(e) => { setSelectedAccId(e.target.value); setResultMsg(null); }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-studio-950 border border-studio-border text-xs text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-mono"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      #{acc.slotNumber} {acc.name} ({acc.profileDirectory}) — {acc.sessionData?.status === 'connected' ? '✓ SESSION ACTIVE' : 'NO SESSION'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Session Status Card */}
              {currentAccount?.sessionData ? (
                <div className="p-3.5 rounded-xl border border-studio-border bg-slate-50/70 dark:bg-studio-950/70 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Session Connected
                      </span>
                      {currentAccount.sessionData.userEmail && (
                        <span className="text-xs font-mono text-slate-500">
                          ({currentAccount.sessionData.userEmail})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-500">
                      Credits: {currentAccount.sessionData.creditsLabel || 'Active Pro Credits'} • {currentAccount.sessionData.tier || 'Google AI Pro'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleVerifyCurrent}
                      disabled={verifying}
                      className="px-2.5 py-1 bg-white dark:bg-studio-900 hover:border-black dark:hover:border-white text-slate-800 dark:text-slate-200 border border-studio-border rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition shadow-xs"
                      title="Test session validity"
                    >
                      <RefreshCw className={`w-3 h-3 ${verifying ? 'animate-spin' : ''}`} />
                      <span>{verifying ? 'Testing...' : 'Test'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearCurrent}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                      title="Clear session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-dashed border-studio-border bg-slate-50/40 dark:bg-studio-950/40 text-[11px] font-mono text-slate-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>No session cookies linked for this profile yet. Paste below to connect credits.</span>
                </div>
              )}

              {/* Paste Session Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
                    Paste Session Cookies or Auth Token
                  </label>
                  <button
                    type="button"
                    onClick={() => setModalTab('guide')}
                    className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Where do I get this?</span>
                  </button>
                </div>

                <textarea
                  value={sessionInput}
                  onChange={(e) => setSessionInput(e.target.value)}
                  placeholder="Paste cookies (e.g. '__Secure-1PSID=...; SAPISID=...'), Cookie-Editor JSON array, or Bearer auth token from Google Flow..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-studio-950 border border-studio-border text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-black dark:focus:border-white font-mono resize-none"
                />

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                  <span>Supports: Raw cookies string, Curl headers, or Cookie-Editor JSON format.</span>
                  {sessionInput.length > 0 && <span>{sessionInput.length} chars</span>}
                </div>
              </div>

              {/* Optional Email & Tier Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Google Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="e.g. hashim@gmail.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-studio-950 border border-studio-border text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Plan Tier Label
                  </label>
                  <input
                    type="text"
                    value={tier}
                    onChange={(e) => setTier(e.target.value)}
                    placeholder="e.g. Google AI Pro / Flow Unlimited"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-studio-950 border border-studio-border text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-black font-mono"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-studio-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-white dark:bg-studio-900 hover:border-black dark:hover:border-white text-slate-800 dark:text-slate-200 border border-studio-border rounded-xl text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition shadow-xs"
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={submitting || !sessionInput.trim()}
                  className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition shadow-sm disabled:opacity-40"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{verifying ? 'Verifying Session...' : 'Connecting...'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Connect & Verify Session</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: BULK IMPORT / EXPORT */}
          {modalTab === 'bulk' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
                    Bulk Import Sessions (JSON Array)
                  </label>
                  <button
                    type="button"
                    onClick={handleExportSessions}
                    className="px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 hover:border-black dark:hover:border-white bg-slate-100 dark:bg-studio-800 rounded-lg border border-studio-border transition flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied JSON' : 'Export Active Sessions'}</span>
                  </button>
                </div>

                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder={`[\n  {\n    "slotNumber": 1,\n    "userEmail": "account1@gmail.com",\n    "cookies": "__Secure-1PSID=...; SAPISID=..."\n  },\n  {\n    "slotNumber": 2,\n    "userEmail": "account2@gmail.com",\n    "cookies": "__Secure-1PSID=...; SAPISID=..."\n  }\n]`}
                  rows={8}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-studio-950 border border-studio-border text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-black dark:focus:border-white font-mono resize-none"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-studio-950/60 rounded-xl border border-studio-border text-xs font-mono text-slate-500 space-y-1">
                <p className="font-bold text-slate-700 dark:text-slate-300">Fast Multi-Account Sync:</p>
                <p>
                  Paste an array of session objects to automatically populate and connect multiple Google Flow accounts in 1 click.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-studio-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-white dark:bg-studio-900 hover:border-black dark:hover:border-white text-slate-800 dark:text-slate-200 border border-studio-border rounded-xl text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition shadow-xs"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={submitting || !bulkInput.trim()}
                  className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition shadow-sm disabled:opacity-40"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import All Sessions</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: STEP-BY-STEP TUTORIAL */}
          {modalTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-studio-border bg-slate-50/50 dark:bg-studio-950/50 space-y-3">
                <h3 className="text-sm font-serif font-extrabold text-slate-900 dark:text-white">
                  How to copy your Flow session in 15 seconds:
                </h3>

                <div className="space-y-3 text-xs font-mono text-slate-600 dark:text-slate-400">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Open Google Flow in your browser:
                      </span>
                      <p className="pt-0.5">
                        Log in to{' '}
                        <a
                          href="https://flow.google.com"
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 underline font-semibold inline-flex items-center gap-0.5"
                        >
                          flow.google.com <ExternalLink className="w-2.5 h-2.5" />
                        </a>{' '}
                        with your Google AI Pro account.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Method A: Developer Tools (F12) — Headers Tab (Recommended)
                      </span>
                      <p className="pt-0.5">
                        In your DevTools <b>Network</b> panel, click the <b>Headers</b> tab (next to Cookies). Scroll down to <b>Request Headers</b>, find <b>cookie:</b>, right-click it, and select <b>Copy value</b>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Method B: Cookies Subtab / Table Copy
                      </span>
                      <p className="pt-0.5">
                        You can also select and copy the text directly from the <b>Cookies</b> subtab (e.g. <i>__Secure-1PSID</i>, <i>__Secure-1PAPISID</i>). VoiceForge will automatically parse the table into session cookies!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Paste and Connect:
                      </span>
                      <p className="pt-0.5">
                        Go to the <b>Single Account</b> tab here, paste the copied text, and click <b>Connect & Verify Session</b>. VoiceForge will instantly link your Google Flow credits!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setModalTab('single')}
                  className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl text-xs font-mono font-bold uppercase tracking-wider cursor-pointer shadow-sm"
                >
                  I'm Ready → Connect Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlowSessionModal;
