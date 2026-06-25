import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { Activity, Loader2, Play, Radio, Tv } from "lucide-react";

type VideoJsPlayer = ReturnType<typeof videojs>;

const LIVE_STARTUP_GRACE_MS = 24_000;
const LIVE_STALL_RECOVER_MS = 18_000;
const LIVE_HARD_RELOAD_MS = 90_000;
const LIVE_MIN_BUFFER_AHEAD_SECONDS = 1.25;

export type StreamSource = {
  id: string;
  label: string;
  stream_type: "hls" | "iframe" | "mp4";
  url: string;
};

type Props = {
  sources: StreamSource[];
  poster?: string;
  isLive?: boolean;
  placeholder?: string;
};

export type StreamDiagnostics = {
  mode: "Video.js VHS" | "Native HLS" | "MP4" | "iframe" | "idle";
  stallState: "ok" | "stalled" | "recovering";
  retryCount: number;
  lastSegmentAt: number | null;
};

const INITIAL_DIAGNOSTICS: StreamDiagnostics = {
  mode: "idle",
  stallState: "ok",
  retryCount: 0,
  lastSegmentAt: null,
};

type QualityInfo = { resolution?: string; bitrate?: string };

async function probeStreamQuality(source: StreamSource): Promise<QualityInfo> {
  if (source.stream_type !== "hls") return {};
  try {
    const res = await fetch(source.url, { method: "GET" });
    if (!res.ok) return {};
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    let bestHeight = 0;
    let bestBandwidth = 0;

    for (const line of lines) {
      if (!line.startsWith("#EXT-X-STREAM-INF")) continue;
      const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
      const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
      const h = resMatch ? parseInt(resMatch[2], 10) : 0;
      const bw = bwMatch ? parseInt(bwMatch[1], 10) : 0;
      if (h > bestHeight) bestHeight = h;
      if (bw > bestBandwidth) bestBandwidth = bw;
    }

    const info: QualityInfo = {};
    if (bestHeight) info.resolution = `${bestHeight}p`;
    if (bestBandwidth) info.bitrate = `${(bestBandwidth / 1_000_000).toFixed(1)} Mbps`;
    return info;
  } catch {
    return {};
  }
}

function tierFromHeight(h: number): string {
  if (h >= 2160) return "4K";
  if (h >= 1080) return "FHD";
  if (h >= 720) return "HD";
  if (h >= 480) return "SD";
  return "LD";
}

function withCacheBust(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set("_r", String(Date.now()));
    return u.origin === window.location.origin ? u.pathname + u.search + u.hash : u.toString();
  } catch {
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}_r=${Date.now()}`;
  }
}

function getBufferedAheadFromRanges(buffered: TimeRanges | undefined, currentTime: number | undefined): number {
  if (!buffered || typeof currentTime !== "number") return 0;
  for (let i = 0; i < buffered.length; i += 1) {
    const start = buffered.start(i);
    const end = buffered.end(i);
    if (currentTime >= start && currentTime <= end) return Math.max(0, end - currentTime);
  }
  return 0;
}

export function StreamPlayer({ sources, poster, isLive, placeholder }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(sources[0]?.id ?? null);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qualities, setQualities] = useState<Record<string, QualityInfo>>({});
  const [diagnostics, setDiagnostics] = useState<StreamDiagnostics>(INITIAL_DIAGNOSTICS);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const selected = sources.find((s) => s.id === selectedId) ?? sources[0];
  const selectedLooksLive = Boolean(isLive || selected?.stream_type === "hls");

  useEffect(() => {
    if (started) setLoading(true);
    setDiagnostics(INITIAL_DIAGNOSTICS);
  }, [selectedId, started]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        sources.map(async (s) => [s.id, await probeStreamQuality(s)] as const),
      );
      if (!cancelled) setQualities(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [sources]);

  if (!selected) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-black">
        <div className="relative aspect-video w-full pitch-gradient">
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-secondary text-muted-foreground">
                <Tv className="h-8 w-8" />
              </div>
              <div className="mt-4 font-display text-2xl tracking-wider text-muted-foreground">
                {placeholder ?? "NO STREAM AVAILABLE"}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">Check back closer to kickoff</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-black">
      <div className="relative aspect-video w-full">
        {!started ? (
          <button
            onClick={() => {
              setLoading(true);
              setStarted(true);
            }}
            className="absolute inset-0 grid place-items-center pitch-gradient group"
          >
            {poster && (
              <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
            )}
            <div className="relative text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_60px_oklch(0.66_0.24_18/0.6)] transition-transform group-hover:scale-105">
                <Play className="h-8 w-8 fill-current" />
              </div>
              <div className="mt-4 font-display text-2xl tracking-wider">
                {selectedLooksLive ? "TAP TO WATCH LIVE" : "PLAY STREAM"}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">HD · Click to start playback</div>
            </div>
          </button>
        ) : selected.stream_type === "iframe" ? (
          <iframe
            key={selected.id}
            src={selected.url}
            onLoad={() => {
              setLoading(false);
              setDiagnostics({ mode: "iframe", stallState: "ok", retryCount: 0, lastSegmentAt: null });
            }}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        ) : (
          <VideoJsLivePlayer
            key={`${selected.id}:${selected.url}`}
            src={selected.url}
            type={selected.stream_type}
            poster={poster}
            isLive={selectedLooksLive}
            onReady={() => setLoading(false)}
            onDiagnostics={setDiagnostics}
          />
        )}

        {started && loading && (
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-white">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-sm font-medium uppercase tracking-wide text-white/80">Loading stream…</div>
            </div>
          </div>
        )}

        {selectedLooksLive && (
          <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md bg-live px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
            <Radio className="h-3 w-3" /> Live
          </div>
        )}
      </div>

      {sources.length > 1 && (
        <div className="border-t border-border/60 bg-card/40 p-4">
          <div className="flex flex-wrap gap-2">
            {sources.map((s, i) => {
              const active = s.id === selected.id;
              const q = qualities[s.id] ?? {};
              const heightNum = q.resolution ? parseInt(q.resolution, 10) : 0;
              const tier = heightNum ? tierFromHeight(heightNum) : "HD";
              const detail = q.resolution
                ? q.bitrate
                  ? `${q.resolution} · ${q.bitrate}`
                  : q.resolution
                : s.label?.toUpperCase() || `SERVER ${i + 1}`;

              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setLoading(true);
                    setSelectedId(s.id);
                    setStarted(true);
                  }}
                  className={
                    "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all " +
                    (active
                      ? "bg-gradient-to-r from-pink-400 via-fuchsia-400 to-orange-400 text-white shadow-lg shadow-fuchsia-500/30"
                      : "bg-secondary/70 text-foreground hover:bg-secondary")
                  }
                >
                  <span className="tracking-wide">{tier}</span>
                  <span className={active ? "text-white/95" : "text-amber-400"}>{detail}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Choose a server and playback will start automatically (tap the thumbnail if it doesn't).
          </p>
        </div>
      )}

      {started && selected.stream_type !== "iframe" && (
        <DiagnosticsPanel
          diagnostics={diagnostics}
          isLive={selectedLooksLive}
          open={showDiagnostics}
          onToggle={() => setShowDiagnostics((v) => !v)}
        />
      )}
    </div>
  );
}

function DiagnosticsPanel({
  diagnostics,
  isLive,
  open,
  onToggle,
}: {
  diagnostics: StreamDiagnostics;
  isLive: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  const stallColor =
    diagnostics.stallState === "ok"
      ? "text-green-500"
      : diagnostics.stallState === "stalled"
        ? "text-destructive"
        : "text-amber-400";

  const lastSegAgo =
    diagnostics.lastSegmentAt != null
      ? `${Math.max(0, Math.round((now - diagnostics.lastSegmentAt) / 1000))}s ago`
      : "—";
  const lastSegAbs =
    diagnostics.lastSegmentAt != null ? new Date(diagnostics.lastSegmentAt).toLocaleTimeString() : null;

  return (
    <div className="border-t border-border/60 bg-card/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5" />
          Stream Diagnostics
        </span>
        <span className="flex items-center gap-3 font-mono text-[11px] normal-case tracking-normal">
          <span className="text-foreground">{diagnostics.mode}</span>
          <span className={stallColor}>{diagnostics.stallState}</span>
          <span className="text-muted-foreground">{open ? "Hide" : "Show"}</span>
        </span>
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-3 border-t border-border/60 p-4 font-mono text-xs sm:grid-cols-4">
          <Stat label="Mode" value={diagnostics.mode} />
          <Stat label="Stall State" value={diagnostics.stallState} valueClass={stallColor} />
          <Stat label="Retries" value={String(diagnostics.retryCount)} />
          <Stat label="Last Segment" value={lastSegAgo} subValue={lastSegAbs ?? (isLive ? "waiting…" : "n/a")} />
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  subValue,
  valueClass,
}: {
  label: string;
  value: string;
  subValue?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={"text-sm text-foreground " + (valueClass ?? "")}>{value}</span>
      {subValue && <span className="text-[10px] text-muted-foreground">{subValue}</span>}
    </div>
  );
}

function VideoJsLivePlayer({
  src,
  type,
  poster,
  isLive,
  onReady,
  onDiagnostics,
}: {
  src: string;
  type: "hls" | "mp4";
  poster?: string;
  isLive?: boolean;
  onReady?: () => void;
  onDiagnostics?: (d: StreamDiagnostics) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<VideoJsPlayer | null>(null);
  const diagRef = useRef<StreamDiagnostics>({ ...INITIAL_DIAGNOSTICS });
  const onDiagnosticsRef = useRef(onDiagnostics);
  const onReadyRef = useRef(onReady);
  const userPausedRef = useRef(false);
  const lastUserActionAtRef = useRef(0);
  const lastProgressRef = useRef({ time: 0, at: 0 });

  onDiagnosticsRef.current = onDiagnostics;
  onReadyRef.current = onReady;

  const emitDiag = (patch: Partial<StreamDiagnostics>) => {
    diagRef.current = { ...diagRef.current, ...patch };
    onDiagnosticsRef.current?.(diagRef.current);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const mountedAt = Date.now();
    let watchdog: number | null = null;
    let waitingTimer: number | null = null;
    let destroyed = false;

    const mimeType = type === "hls" ? "application/x-mpegURL" : "video/mp4";

    const playSafely = () => {
      if (document.visibilityState !== "visible") return;
      const player = playerRef.current;
      if (!player || player.isDisposed()) return;
      const playPromise = player.play();
      if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => {});
    };

    const bumpRetry = (stallState: StreamDiagnostics["stallState"] = "recovering") => {
      emitDiag({ retryCount: diagRef.current.retryCount + 1, stallState });
    };

    const seekToLiveEdge = () => {
      if (!isLive) return;
      const player = playerRef.current;
      if (!player || player.isDisposed()) return;
      const liveTracker = (player as unknown as { liveTracker?: { seekToLiveEdge?: () => void; liveCurrentTime?: () => number } }).liveTracker;
      try {
        if (liveTracker?.seekToLiveEdge) liveTracker.seekToLiveEdge();
        else if (liveTracker?.liveCurrentTime) player.currentTime(liveTracker.liveCurrentTime());
      } catch {}
    };

    const hardReload = () => {
      if (destroyed) return;
      const player = playerRef.current;
      if (!player || player.isDisposed()) return;
      bumpRetry();
      player.src({ src: withCacheBust(src), type: mimeType });
      player.load();
      if (isLive) window.setTimeout(seekToLiveEdge, 900);
      window.setTimeout(playSafely, 1200);
    };

    const recover = () => {
      if (!isLive || userPausedRef.current) return;
      const player = playerRef.current;
      if (!player || player.isDisposed()) return;

      emitDiag({ stallState: "recovering" });
      seekToLiveEdge();
      playSafely();

      const bufferedAhead = getBufferedAheadFromRanges(player.buffered(), player.currentTime());
      const stalledFor = Date.now() - lastProgressRef.current.at;
      const noBuffer = bufferedAhead < LIVE_MIN_BUFFER_AHEAD_SECONDS;
      const neverStarted = Date.now() - mountedAt > LIVE_STARTUP_GRACE_MS && player.readyState() < 2;

      if ((neverStarted || stalledFor > LIVE_HARD_RELOAD_MS) && noBuffer) {
        hardReload();
      }
    };

    const markUserAction = (event: PointerEvent | KeyboardEvent) => {
      if (typeof PointerEvent !== "undefined" && event instanceof PointerEvent) {
        const rect = video.getBoundingClientRect();
        const insidePlayer =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;
        if (!insidePlayer) return;
      }
      lastUserActionAtRef.current = Date.now();
    };

    const onPlaying = () => {
      userPausedRef.current = false;
      const player = playerRef.current;
      lastProgressRef.current = { time: player?.currentTime() ?? 0, at: Date.now() };
      emitDiag({ stallState: "ok" });
      onReadyRef.current?.();
    };

    const onCanPlay = () => {
      onReadyRef.current?.();
    };

    const onPause = () => {
      const player = playerRef.current;
      if (!isLive || !player || player.ended()) return;
      if (Date.now() - lastUserActionAtRef.current < 1500) userPausedRef.current = true;
    };

    const onTimeUpdate = () => {
      const player = playerRef.current;
      if (!player || player.isDisposed()) return;
      const previous = lastProgressRef.current;
      const currentTime = player.currentTime() ?? 0;
      if (Math.abs(currentTime - previous.time) > 0.25) {
        lastProgressRef.current = { time: currentTime, at: Date.now() };
        if (diagRef.current.stallState !== "ok") emitDiag({ stallState: "ok" });
      }
    };

    const onWaiting = () => {
      if (!isLive) return;
      emitDiag({ stallState: "stalled" });
      if (waitingTimer) window.clearTimeout(waitingTimer);
      waitingTimer = window.setTimeout(recover, LIVE_STALL_RECOVER_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && isLive && !userPausedRef.current) recover();
    };

    diagRef.current = { ...INITIAL_DIAGNOSTICS };
    lastProgressRef.current = { time: 0, at: Date.now() };

    const player = videojs(video, {
      controls: true,
      autoplay: "play",
      preload: "auto",
      poster,
      fill: true,
      fluid: false,
      responsive: true,
      liveui: Boolean(isLive),
      inactivityTimeout: 1800,
      html5: {
        vhs: {
          overrideNative: false,
          useDevicePixelRatio: true,
          limitRenditionByPlayerDimensions: false,
          smoothQualityChange: true,
          handleManifestRedirects: true,
          maxPlaylistRetries: Infinity,
          bandwidth: 8_000_000,
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
      sources: [{ src, type: mimeType }],
    });

    playerRef.current = player;
    emitDiag({ mode: type === "mp4" ? "MP4" : video.canPlayType("application/vnd.apple.mpegurl") ? "Native HLS" : "Video.js VHS" });

    document.addEventListener("pointerdown", markUserAction, true);
    document.addEventListener("keydown", markUserAction, true);
    document.addEventListener("visibilitychange", onVisibility);
    player.on("playing", onPlaying);
    player.on("canplay", onCanPlay);
    player.on("loadeddata", onCanPlay);
    player.on("pause", onPause);
    player.on("timeupdate", onTimeUpdate);
    player.on("progress", () => emitDiag({ lastSegmentAt: Date.now() }));
    player.on("waiting", onWaiting);
    player.on("stalled", onWaiting);
    player.on("seeking", () => emitDiag({ stallState: "recovering" }));
    player.on("seeked", () => emitDiag({ stallState: "ok" }));
    player.on("ended", recover);
    player.on("error", hardReload);

    player.ready(() => {
      if (isLive) window.setTimeout(seekToLiveEdge, 700);
      playSafely();
    });

    watchdog = window.setInterval(() => {
      if (!isLive || userPausedRef.current || document.visibilityState !== "visible") return;
      const currentPlayer = playerRef.current;
      if (!currentPlayer || currentPlayer.isDisposed()) return;

      const previous = lastProgressRef.current;
      const currentTime = currentPlayer.currentTime() ?? 0;
      const bufferedAhead = getBufferedAheadFromRanges(currentPlayer.buffered(), currentTime);
      const noBuffer = bufferedAhead < LIVE_MIN_BUFFER_AHEAD_SECONDS;
      const playbackStuck =
        !currentPlayer.paused() &&
        Math.abs(currentTime - previous.time) <= 0.25 &&
        Date.now() - previous.at > LIVE_STALL_RECOVER_MS;
      const noDataAfterStartup = Date.now() - mountedAt > LIVE_STARTUP_GRACE_MS && currentPlayer.readyState() < 2;

      if ((playbackStuck || noDataAfterStartup || currentPlayer.ended()) && noBuffer) {
        emitDiag({ stallState: "stalled" });
        recover();
        return;
      }
    }, 8_000);

    return () => {
      destroyed = true;
      if (watchdog) window.clearInterval(watchdog);
      if (waitingTimer) window.clearTimeout(waitingTimer);
      document.removeEventListener("pointerdown", markUserAction, true);
      document.removeEventListener("keydown", markUserAction, true);
      document.removeEventListener("visibilitychange", onVisibility);

      try {
        playerRef.current?.dispose();
        playerRef.current = null;
      } catch {}
    };
  }, [src, type, poster, isLive]);

  return (
    <div data-vjs-player className="absolute inset-0 h-full w-full bg-black [&_.video-js]:h-full [&_.video-js]:w-full [&_.vjs-control-bar]:bg-black/80 [&_.vjs-live-control]:font-bold [&_.vjs-live-control]:text-primary [&_.vjs-play-progress]:bg-primary [&_.vjs-volume-level]:bg-primary">
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered"
        poster={poster}
        playsInline
        controls
        autoPlay
        preload="auto"
      />
    </div>
  );
}