declare namespace YT {
  interface PlayerOptions {
    height?: string | number;
    width?: string | number;
    videoId?: string;
    playerVars?: Record<string, any>;
    events?: {
      onReady?: (event: any) => void;
      onStateChange?: (event: any) => void;
      onError?: (event: any) => void;
    };
  }

  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    setVolume(volume: number): void;
    getVolume(): number;
    getPlayerState(): number;
    destroy(): void;
  }

  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }
}

interface Window {
  YT: typeof YT;
  onYouTubeIframeAPIReady: (() => void) | null;
}
