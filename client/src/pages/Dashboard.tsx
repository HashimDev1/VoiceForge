import React from 'react';
import { Project } from '../../../shared/src/types';
import { 
  FolderKanban, 
  FileAudio, 
  Hash, 
  Clock, 
  Plus, 
  FileText, 
  ArrowRight, 
  Sparkles,
  Volume2,
  Download
} from 'lucide-react';
import { formatDuration } from '../../../shared/src/textAnalysis';

interface DashboardProps {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onNewVoiceover: () => void;
  onOpenScriptStudio: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  onOpenProject,
  onNewVoiceover,
  onOpenScriptStudio
}) => {
  const totalProjects = projects.length;
  const totalChars = projects.reduce((sum, p) => sum + (p.script?.length || 0), 0);
  const totalClips = projects.reduce(
    (sum, p) => sum + p.chunks.filter((c) => c.status === 'success').length,
    0
  );
  const totalDurationSec = projects.reduce((sum, p) => {
    return (
      sum +
      p.chunks
        .filter((c) => c.status === 'success')
        .reduce((cSum, c) => cSum + (c.estimatedDurationSec || 0), 0)
    );
  }, 0);

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16 pt-4">
      {/* Platform Version Header Bar matching Screenshot #1 */}
      <div className="flex items-center justify-between glass-card px-4 py-2.5 rounded-2xl border border-studio-border text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
        <span>Windows (ARM64)</span>
        <div className="flex items-center gap-2">
          <span className="bg-black text-white px-2 py-0.5 rounded font-mono text-[10px] uppercase">
            exe
          </span>
          <span className="text-slate-500 font-mono text-[11px]">
            v1.3.0
          </span>
        </div>
      </div>

      {/* Main Studio Hero Section matching Screenshot #1 & #2 */}
      <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-sm border border-studio-border">
        {/* Monospace Subtitle Label */}
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500">
          STUDIO ENGINE • V1.3.0
        </p>

        {/* Brand Display Logo & Title */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-extrabold text-sm font-mono shadow-sm">
            ◆
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
            VoiceForge.
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-sans max-w-md mx-auto leading-relaxed">
          Create long-form YouTube voiceovers with Fish Audio TTS. Split scripts into chunks, preview clips, and export final audio.
        </p>

        {/* Big Action Button matching Screenshot #2 (Solid Black Pill DOWNLOAD / START) */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onNewVoiceover}
            className="px-8 py-3.5 bg-black text-white dark:bg-white dark:text-black rounded-xl font-mono font-bold text-xs uppercase tracking-widest hover:opacity-90 shadow-md transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE VOICEOVER</span>
          </button>

          <button
            onClick={onOpenScriptStudio}
            className="px-8 py-3.5 bg-studio-850 hover:bg-studio-800 text-slate-900 dark:text-slate-100 rounded-xl font-mono font-bold text-xs uppercase tracking-widest border border-studio-border transition flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>SCRIPT STUDIO</span>
          </button>
        </div>
      </div>

      {/* PRODUCTS Section matching Screenshot #1 */}
      

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
        <div className="glass-card rounded-2xl p-4 border border-studio-border space-y-1">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">Projects</p>
          <p className="text-2xl font-serif font-bold text-slate-900 dark:text-white">{totalProjects}</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-studio-border space-y-1">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">Clips</p>
          <p className="text-2xl font-serif font-bold text-slate-900 dark:text-white">{totalClips}</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-studio-border space-y-1">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">Characters</p>
          <p className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100">{totalChars.toLocaleString()}</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-studio-border space-y-1">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">Duration</p>
          <p className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100">{formatDuration(totalDurationSec)}</p>
        </div>
      </div>

      {/* Recent Projects Section */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-studio-border pb-3">
          <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white">
            All Voiceovers.
          </h3>

          <button
            onClick={onNewVoiceover}
            className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white hover:underline flex items-center gap-1 transition"
          >
            <span>+ Create</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center space-y-3">
            <Volume2 className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-base font-serif font-bold text-slate-800 dark:text-slate-200">No Projects Yet</h4>
            <p className="text-xs font-sans text-slate-500 max-w-sm mx-auto">
              Paste your complete YouTube script in the studio to split into clips and generate voiceovers.
            </p>
            <button
              onClick={onNewVoiceover}
              className="px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-mono font-bold uppercase tracking-widest shadow-sm transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Voiceover</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.slice(0, 6).map((proj) => {
              const completed = proj.chunks.filter((c) => c.status === 'success').length;
              const total = proj.chunks.length;

              return (
                <div
                  key={proj.id}
                  onClick={() => onOpenProject(proj)}
                  className="glass-card rounded-2xl p-4 border border-studio-border hover:border-black dark:hover:border-white transition cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-base font-serif font-bold text-slate-900 dark:text-white truncate" title={proj.name}>
                        {proj.name || 'Untitled Project'}
                      </h4>

                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          proj.status === 'completed'
                            ? 'bg-black text-white dark:bg-white dark:text-black'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {proj.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {proj.script || 'No script text entered yet.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-studio-border/60 flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>{completed}/{total} CLIPS</span>
                    <span className="text-[10px]">
                      {new Date(proj.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Social / Contact Section matching Screenshot #1 */}
      <div className="space-y-3 pt-6 border-t border-studio-border text-center">
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500">
          SOCIAL
        </p>
        <p className="text-sm font-sans font-medium text-slate-800 dark:text-slate-200">
          WhatsApp
        </p>
      </div>

      {/* Footer */}
      <div className="text-center pt-6 space-y-1">
        <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
          © 2026 VOICEFORGE STUDIO
        </p>
        <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          PROFESSIONAL YOUTUBE AI VOICEOVER STUDIO
        </p>
      </div>
    </div>
  );
};
