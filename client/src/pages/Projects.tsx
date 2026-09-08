import React from 'react';
import { Project } from '../../../shared/src/types';
import { FolderKanban, Plus, Trash2, ExternalLink, Calendar, Disc } from 'lucide-react';
import { formatDuration } from '../../../shared/src/textAnalysis';

interface ProjectsProps {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
}

export const Projects: React.FC<ProjectsProps> = ({
  projects,
  onOpenProject,
  onNewProject,
  onDeleteProject
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between border-b border-studio-border pb-4">
        <div>
          <h1 className="text-2xl font-serif font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-black dark:text-white" />
            <span>Voiceover Projects.</span>
          </h1>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mt-0.5">
            MANAGE DRAFTS & VOICEOVER PROJECTS
          </p>
        </div>

        <button
          onClick={onNewProject}
          className="px-4 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
          <FolderKanban className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-serif font-bold text-slate-900 dark:text-white">No Projects Created Yet</h3>
          <p className="text-xs font-sans text-slate-500 max-w-md mx-auto">
            Click "New Project" to start building your first YouTube narration project with VoiceForge.
          </p>
          <button
            onClick={onNewProject}
            className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const completed = proj.chunks.filter((c) => c.status === 'success').length;
            const total = proj.chunks.length;
            const totalSec = proj.chunks.reduce(
              (acc, c) => acc + (c.estimatedDurationSec || 0),
              0
            );

            return (
              <div
                key={proj.id}
                className="glass-card rounded-2xl p-5 border border-studio-border hover:border-black dark:hover:border-white transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-serif font-bold text-slate-900 dark:text-white truncate" title={proj.name}>
                      {proj.name || 'Untitled Project'}
                    </h3>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete project "${proj.name}"?`)) onDeleteProject(proj.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-600 transition"
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {proj.script || 'No script entered.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-studio-border/60 space-y-3 font-mono">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Disc className="w-3.5 h-3.5 text-black dark:text-white" />
                      {completed}/{total} clips ({formatDuration(totalSec)})
                    </span>

                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(proj.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    onClick={() => onOpenProject(proj)}
                    className="w-full py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-mono font-bold uppercase flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition"
                  >
                    <span>Open Studio Workspace</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
