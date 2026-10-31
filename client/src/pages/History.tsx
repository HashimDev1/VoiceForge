import React from 'react';
import { Project } from '../../../shared/src/types';
import { History as HistoryIcon, ExternalLink, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { formatDuration } from '../../../shared/src/textAnalysis';

interface HistoryProps {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}

export const History: React.FC<HistoryProps> = ({ projects, onOpenProject, onDeleteProject }) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-studio-border pb-5 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm shrink-0">
              <HistoryIcon className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900 dark:text-white tracking-tight">
              Generation History<span className="text-indigo-600 dark:text-indigo-400">.</span>
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300 border border-studio-border uppercase tracking-wider">
              {projects.length} Entries
            </span>
          </div>
          <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest pl-11">
            RECENTLY GENERATED VOICEOVERS & AUDIO CLIPS
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-studio-border overflow-hidden shadow-sm bg-white dark:bg-studio-900">
        {projects.length === 0 ? (
          <div className="p-8 text-center text-xs font-sans text-slate-500">
            No voiceover history recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-studio-850 border-b border-studio-border text-slate-700 dark:text-slate-300 font-mono font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Project Name</th>
                  <th className="px-4 py-3">Voice</th>
                  <th className="px-4 py-3">Clips</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Last Modified</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-studio-border/60 text-slate-900 dark:text-slate-200">
                {projects.map((proj) => {
                  const completed = proj.chunks.filter((c) => c.status === 'success').length;
                  const total = proj.chunks.length;
                  const durationSec = proj.chunks.reduce((acc, c) => acc + (c.estimatedDurationSec || 0), 0);

                  return (
                    <tr key={proj.id} className="hover:bg-slate-50 dark:hover:bg-studio-850/50 transition">
                      <td className="px-4 py-3 font-serif font-bold text-slate-900 dark:text-white max-w-[200px] truncate">
                        {proj.name}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {proj.selectedVoice.name}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {completed}/{total}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatDuration(durationSec)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {new Date(proj.updatedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            proj.status === 'completed'
                              ? 'bg-black text-white dark:bg-white dark:text-black'
                              : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {proj.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => onOpenProject(proj)}
                          className="px-2.5 py-1 bg-black text-white dark:bg-white dark:text-black rounded-lg font-mono font-bold text-xs uppercase shadow-sm transition"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => onDeleteProject(proj.id)}
                          className="p-1 text-slate-500 hover:text-rose-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
