import React, { useState, useEffect } from 'react';
import { Sidebar, TabType } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { AudioPlayer } from './components/AudioPlayer';
import { Dashboard } from './pages/Dashboard';
import { ScriptStudio } from './pages/ScriptStudio';
import { VoiceGenerator } from './pages/VoiceGenerator';
import { OpenSourceStudio } from './pages/OpenSourceStudio';
import { VoiceTranslator } from './pages/VoiceTranslator';
import { Projects } from './pages/Projects';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { CloneVoiceStudio } from './pages/CloneVoiceStudio';
import { GoogleFlowStudio } from './pages/GoogleFlowStudio';
import { CaptionsStudio } from './pages/CaptionsStudio';
import { VideoEditorStudio } from './pages/VideoEditorStudio';
import { DocumentaryStudio } from './pages/DocumentaryStudio';
import { VoiceCloneModal } from './components/VoiceCloneModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useProjectStore } from './hooks/useProjectStore';
import { useAudioPlayer } from './hooks/useAudioPlayer';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [handedOffEditorProject, setHandedOffEditorProject] = useState<any>(null);

  // Theme state: default to dark (VoiceForge professional dark studio theme)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('voiceforge_theme_v3');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('voiceforge_theme_v3', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const {
    voices,
    saveCustomVoice,
    deleteCustomVoice,
    apiHealth,
    projects,
    activeProject,
    isGeneratingBatch,
    refreshBackendStatus,
    setActiveProject,
    setScriptText,
    setChunkSettings,
    setWpm,
    setSpeechSpeed,
    setAudioFormat,
    setVoice,
    setPauseBetweenClips,
    setMultiTakeEnabled,
    selectTake,
    generateNewTake,
    updateChunkText,
    reorderChunks,
    addNewChunk,
    deleteChunk,
    regenerateSingleChunk,
    generateAllChunks,
    createNewProject,
    deleteProject
  } = useProjectStore();

  const {
    currentUrl,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    play,
    playPreview,
    closeBottomBar,
    isBottomBarVisible,
    pause,
    seek,
    changeVolume,
    changePlaybackRate
  } = useAudioPlayer();

  const handleNewProject = () => {
    createNewProject();
    setActiveTab('script-studio');
  };

  const handleOpenProject = (project: any) => {
    setActiveProject(project);
    setActiveTab('script-studio');
  };

  return (
    <div className="min-h-screen bg-studio-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      {/* Sidebar Navigation (Desktop + Mobile Drawer) - Hidden on Dashboard */}
      {activeTab !== 'dashboard' && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          apiHealth={apiHealth}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          onNewProject={handleNewProject}
          onOpenCloneVoice={() => setIsCloneModalOpen(true)}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {/* Main Viewport Container */}
      <div
        className={`transition-all duration-300 flex-1 flex flex-col ${
          activeTab === 'dashboard'
            ? 'pl-0'
            : sidebarCollapsed
            ? 'md:pl-20'
            : 'md:pl-64'
        }`}
      >
        {/* Top Navbar Header - Only displayed on the Script Studio page */}
        {activeTab === 'script-studio' && (
          <Navbar
            activeProject={activeProject}
            onUpdateProjectName={(name) =>
              setActiveProject((prev) => ({ ...prev, name }))
            }
            onGenerateAll={() => generateAllChunks(false)}
            isGenerating={isGeneratingBatch}
            onOpenMobileMenu={() => setMobileOpen(true)}
          />
        )}

        {/* Main Tab Viewport */}
        <main
          className={`flex-1 overflow-y-auto ${
            activeTab === 'dashboard'
              ? 'p-4 sm:p-8 flex items-center justify-center'
              : 'p-4 sm:p-6 pb-28 md:pb-28'
          }`}
        >
          {activeTab === 'dashboard' && (
            <Dashboard
              projects={projects}
              onOpenProject={handleOpenProject}
              onNewVoiceover={handleNewProject}
              onOpenScriptStudio={() => setActiveTab('script-studio')}
              onNavigateTab={(tab) => setActiveTab(tab)}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          )}

          {activeTab === 'documentary-studio' && (
            <ErrorBoundary>
              <DocumentaryStudio
                onOpenVideoEditor={(editorProject) => {
                  setHandedOffEditorProject(editorProject);
                  setActiveTab('video-editor');
                }}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'video-editor' && (
            <ErrorBoundary>
              <VideoEditorStudio
                initialProject={handedOffEditorProject}
                onOpenCaptionStudio={() => setActiveTab('captions')}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'captions' && (
            <ErrorBoundary><CaptionsStudio /></ErrorBoundary>
          )}

          {activeTab === 'google-flow' && (
            <ErrorBoundary>
              <GoogleFlowStudio />
            </ErrorBoundary>
          )}

          {activeTab === 'clone-voice' && (
            <ErrorBoundary>
              <CloneVoiceStudio
                voices={voices}
                selectedVoice={activeProject.selectedVoice}
                onSelectVoice={setVoice}
                onSaveCustomVoice={saveCustomVoice}
                onDeleteCustomVoice={deleteCustomVoice}
                onOpenCloneModal={() => setIsCloneModalOpen(true)}
                onAudioPlay={playPreview}
                onAudioPause={pause}
                onSendToScriptStudio={(textVal, voice) => {
                  setScriptText(textVal);
                  setVoice(voice);
                  setActiveTab('script-studio');
                }}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'script-studio' && (
            <ScriptStudio
              project={activeProject}
              voices={voices}
              onUpdateScript={setScriptText}
              onUpdateChunkSettings={setChunkSettings}
              onUpdateWpm={setWpm}
              onUpdateSpeechSpeed={setSpeechSpeed}
              onUpdateAudioFormat={setAudioFormat}
              onToggleMultiTake={setMultiTakeEnabled}
              onSelectTake={selectTake}
              onGenerateNewTake={generateNewTake}
              onSelectVoice={setVoice}
              onSaveCustomVoice={saveCustomVoice}
              onDeleteCustomVoice={deleteCustomVoice}
              onUpdatePause={setPauseBetweenClips}
              onUpdateChunkText={updateChunkText}
              onReorderChunks={reorderChunks}
              onAddNewChunk={addNewChunk}
              onDeleteChunk={deleteChunk}
              onRegenerateChunk={regenerateSingleChunk}
              onGenerateAll={generateAllChunks}
              isGenerating={isGeneratingBatch}
              currentAudioUrl={currentUrl}
              isPlaying={isPlaying}
              onAudioPlay={play}
              onAudioPause={pause}
            />
          )}

          {activeTab === 'open-source-tts' && (
            <OpenSourceStudio
              onAudioPlay={play}
              onAudioPause={pause}
              onSendToScriptStudio={(textVal, voiceId) => {
                setScriptText(textVal);
                const matched = voices.find((v) => v.id === voiceId);
                if (matched) {
                  setVoice(matched);
                }
                setActiveTab('script-studio');
              }}
            />
          )}

          {activeTab === 'voice-generator' && (
            <VoiceGenerator
              voices={voices}
              selectedVoice={activeProject.selectedVoice}
              onSelectVoice={setVoice}
              onAudioPlay={playPreview}
              onAudioPause={pause}
              currentAudioUrl={currentUrl}
              isPlaying={isPlaying}
              onSaveCustomVoice={saveCustomVoice}
              onDeleteCustomVoice={deleteCustomVoice}
            />
          )}

          {activeTab === 'voice-translator' && (
            <VoiceTranslator
              voices={voices}
              onAudioPlay={playPreview}
              onAudioPause={pause}
              currentAudioUrl={currentUrl}
              isPlaying={isPlaying}
            />
          )}

          {activeTab === 'projects' && (
            <Projects
              projects={projects}
              onOpenProject={handleOpenProject}
              onNewProject={handleNewProject}
              onDeleteProject={deleteProject}
            />
          )}

          {activeTab === 'history' && (
            <History
              projects={projects}
              onOpenProject={handleOpenProject}
              onDeleteProject={deleteProject}
            />
          )}

          {activeTab === 'settings' && (
            <Settings
              apiHealth={apiHealth}
              onRefreshHealth={refreshBackendStatus}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          )}
        </main>

        {/* Mobile Navigation Bottom Bar */}
        {activeTab !== 'dashboard' && (
          <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
        )}

        {/* Persistent Bottom Audio Player Bar - Never shows on Dashboard or for voice previews */}
        {currentUrl && isBottomBarVisible && activeTab !== 'dashboard' && (
          <div
            className={`fixed bottom-14 md:bottom-0 right-0 z-40 p-3 sm:p-4 transition-all duration-300 ${
              sidebarCollapsed
                ? 'md:left-20'
                : 'md:left-64'
            } left-0`}
          >
            <AudioPlayer
              audioUrl={currentUrl}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              playbackRate={playbackRate}
              onPlay={play}
              onPause={pause}
              onSeek={seek}
              onVolumeChange={changeVolume}
              onPlaybackRateChange={changePlaybackRate}
              onClose={closeBottomBar}
              title="Studio Audio Playback"
            />
          </div>
        )}

        {/* Global Character Voice Clone Modal */}
        <ErrorBoundary>
          <VoiceCloneModal
            isOpen={isCloneModalOpen}
            onClose={() => setIsCloneModalOpen(false)}
            onVoiceCreated={(newVoice) => {
              saveCustomVoice(newVoice);
              setVoice(newVoice);
              setIsCloneModalOpen(false);
            }}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
export default App;
