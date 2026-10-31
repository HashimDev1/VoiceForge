import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    __voiceforge_pause_all_audio?: () => void;
  }
}

/**
 * Silences all HTML <audio> elements in the DOM to ensure single-speaker playback.
 */
export function stopAllOtherAudios(exceptAudio?: HTMLAudioElement | null) {
  try {
    document.querySelectorAll('audio').forEach((el) => {
      if (el !== exceptAudio && !el.paused) {
        el.pause();
      }
    });
  } catch {}
}

export function useAudioPlayer() {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBottomBarVisible, setIsBottomBarVisible] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Register global stop method
    window.__voiceforge_pause_all_audio = () => {
      try {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
        stopAllOtherAudios(null);
      } catch {}
    };

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      delete window.__voiceforge_pause_all_audio;
    };
  }, []);

  const play = async (url: string, showBottomBar: boolean = true) => {
    if (!audioRef.current || !url) return;

    // Immediately silence any other playing audio in the page
    stopAllOtherAudios(audioRef.current);

    const audio = audioRef.current;
    audio.playbackRate = playbackRate;
    setIsBottomBarVisible(showBottomBar);

    // If already playing the same URL, ensure it is playing
    if (currentUrl === url && audio.src && audio.src.includes(url)) {
      if (audio.paused) {
        try {
          const p = audio.play();
          playPromiseRef.current = p;
          await p;
          setIsPlaying(true);
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error('Audio play error:', err);
          }
        }
      }
      return;
    }

    // Changing track: pause current track first
    if (!audio.paused) {
      audio.pause();
    }

    audio.src = url;
    setCurrentUrl(url);
    audio.playbackRate = playbackRate;

    try {
      const p = audio.play();
      playPromiseRef.current = p;
      await p;
      setIsPlaying(true);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Audio playback failed:', err);
      }
    }
  };

  const playPreview = (url: string) => {
    return play(url, false);
  };

  const closeBottomBar = () => {
    pause();
    setIsBottomBarVisible(false);
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const seek = (timeSec: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timeSec;
      setCurrentTime(timeSec);
    }
  };

  const changeVolume = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  return {
    currentUrl,
    isPlaying,
    isBottomBarVisible,
    currentTime,
    duration,
    volume,
    playbackRate,
    play,
    playPreview,
    closeBottomBar,
    pause,
    seek,
    changeVolume,
    changePlaybackRate
  };
}

