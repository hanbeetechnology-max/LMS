import { useEffect, useId, useRef, useState } from "react";

// Loads the YouTube IFrame Player API once per page, however many players
// are mounted.
let apiLoadPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const yt = (window as unknown as { YT?: { Player: unknown } }).YT;
  if (yt?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const previous = (window as unknown as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady;
    (window as unknown as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiLoadPromise;
}

interface YTPlayerInstance {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setPlaybackQuality?(quality: string): void;
  setOption?(module: string, option: string, value: unknown): void;
  destroy(): void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Videos stay hosted on YouTube (no storage infra of our own yet), but play
 * entirely in-page via the IFrame Player API with our own play/pause/seek
 * chrome — never a click-through to youtube.com. `controls=0`, `rel=0`,
 * `modestbranding=1`, `fs=0`, `disablekb=1` and `iv_load_policy=3` strip as
 * much of YouTube's own UI as their embed API allows.
 */
export function YouTubePlayer({ videoId, title }: { videoId: string; title: string }) {
  const containerId = useId().replace(/:/g, "-");
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const rafRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [captions, setCaptions] = useState(false);
  const [quality, setQuality] = useState("default");

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled) return;
      const YT = (window as unknown as { YT: { Player: new (el: string, opts: Record<string, unknown>) => YTPlayerInstance } }).YT;
      playerRef.current = new YT.Player(containerId, {
        videoId,
        playerVars: {
          controls: 0,
          rel: 0,
          modestbranding: 1,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
          playsinline: 1,
          cc_load_policy: 0,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
            setDuration(playerRef.current?.getDuration() ?? 0);
          },
          onStateChange: (e: { data: number }) => {
            // 1 = playing, 2 = paused, 0 = ended
            setPlaying(e.data === 1);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      playerRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    function tick() {
      if (playerRef.current && playing) {
        setCurrent(playerRef.current.getCurrentTime());
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    if (playing) rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  function togglePlay() {
    if (!playerRef.current) return;
    if (playing) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setCurrent(value);
    playerRef.current?.seekTo(value, true);
  }

  function skip(seconds: number) {
    if (!playerRef.current) return;
    const next = Math.min(Math.max(current + seconds, 0), duration);
    setCurrent(next);
    playerRef.current.seekTo(next, true);
  }

  function toggleCaptions() {
    const next = !captions;
    setCaptions(next);
    playerRef.current?.setOption?.("captions", "track", next ? { languageCode: "en" } : {});
  }

  function changeQuality(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    setQuality(next);
    if (next !== "default") playerRef.current?.setPlaybackQuality?.(next);
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-(--color-ink-fixed)" role="group" aria-label={`Video: ${title}`}>
      <div className="relative aspect-video">
        <div id={containerId} className="absolute inset-0 h-full w-full" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-(--color-paper-fixed)/70">Loading video…</div>
        )}
      </div>
      <div className="flex items-center gap-3 bg-(--color-ink-fixed) px-4 py-3">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!ready}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-paper-fixed) text-(--color-ink-fixed) transition-transform hover:scale-105 disabled:opacity-50"
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 4l14 8-14 8V4z" />
            </svg>
          )}
        </button>
        <button type="button" onClick={() => skip(-10)} disabled={!ready} aria-label="Back 10 seconds" className="text-xs font-medium text-(--color-paper-fixed)/80 hover:text-(--color-paper-fixed) disabled:opacity-50">
          -10s
        </button>
        <button type="button" onClick={() => skip(10)} disabled={!ready} aria-label="Forward 10 seconds" className="text-xs font-medium text-(--color-paper-fixed)/80 hover:text-(--color-paper-fixed) disabled:opacity-50">
          +10s
        </button>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={current}
          onChange={seek}
          disabled={!ready}
          aria-label="Seek"
          className="h-1.5 flex-1 accent-(--color-violet)"
        />
        <span className="w-20 shrink-0 text-right font-mono text-xs text-(--color-paper-fixed)/70">
          {formatTime(current)} / {formatTime(duration)}
        </span>
        <select value={quality} onChange={changeQuality} disabled={!ready} aria-label="Video quality" className="rounded bg-transparent text-xs text-(--color-paper-fixed) outline-none disabled:opacity-50">
          <option value="default">Auto</option>
          <option value="small">360p</option>
          <option value="medium">480p</option>
          <option value="hd720">720p</option>
        </select>
        <button type="button" onClick={toggleCaptions} disabled={!ready} aria-pressed={captions} className={`text-xs font-medium ${captions ? "text-(--color-paper-fixed)" : "text-(--color-paper-fixed)/60"} disabled:opacity-50`}>
          CC
        </button>
      </div>
    </div>
  );
}
