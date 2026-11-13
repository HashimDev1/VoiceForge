/**
 * Global Web Audio unlocker for browser autoplay policies.
 * Unlocks HTMLAudioElement and AudioContext on user interaction gestures.
 */
let sharedAudioCtx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
        sharedAudioCtx = new AudioCtx();
      }
      if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume().catch(() => {});
      }
    }
  } catch {}
}

export function getSharedAudioContext(): AudioContext | null {
  return sharedAudioCtx;
}

