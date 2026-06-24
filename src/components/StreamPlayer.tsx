import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import * as PlyrNS from "plyr";
const Plyr = (PlyrNS as any).default ?? (PlyrNS as any);
type Plyr = InstanceType<typeof Plyr>;
import "plyr/dist/plyr.css";
import { Activity, Loader2, Play, Radio, Tv } from "lucide-react";

const LIVE_HARD_RESET_COOLDOWN_MS = 8_000;
const LIVE_STARTUP_GRACE_MS = 18_000;
const LIVE_STALL_RESET_MS = 14_000;
const LIVE_SEGMENT_GRACE_MS = 28_000;

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
  mode: "HLS.js" | "Native HLS" | "MP4" | "iframe" | "idle";
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
    return u.pathname + u.search + u.hash;
  } catch {
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}_r=${Date.now()}`;
  }
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
    return () => { cancelled = true; };
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
            onClick={() => { setLoading(true); setStarted(true); }}
            className="absolute inset-0 grid place-items-center pitch-gradient group"
          >
            {poster && (
              <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
            )}
            <div className="relative text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_60px_oklch(0.66_0.24_18/0.6)] group-hover:scale-105 transition-transform">
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
          <PlyrVideo
            key={selected.id}
            src={selected.url}
            type={selected.stream_type}
            poster={poster}
            isLive={selectedLooksLive}
            onPlaying={() => setLoading(false)}
            onDiagnostics={setDiagnostics}
          />
        )}

        {started && loading && (
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-white">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-sm font-medium tracking-wide uppercase text-white/80">Loading stream…</div>
            </div>
          </div>
        )}

        {selectedLooksLive && (
          <div className="pointer-events-none absolute top-4 left-4 z-10 flex items-center gap-2 rounded-md bg-live px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
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
                ? (q.bitrate ? `${q.resolution} · ${q.bitrate}` : q.resolution)
                : (s.label?.toUpperCase() || `SERVER ${i + 1}`);
              return (
                <button
                  key={s.id}
                  onClick={() => { setSelectedId(s.id); setStarted(true); }}
                  className={
                    "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all " +
                    (active
                      ? "bg-gradient-to-r from-pink-400 via-fuchsia-400 to-orange-400 text-white shadow-lg shadow-fuchsia-500/30"
                      : "bg-secondary/70 text-foreground hover:bg-secondary")
                  }
                >
                  <span className="tracking-wide">{tier}</span>
                  <span className={active ? "text-white/95" : "text-amber-400"}>
                    {detail}
                  </span>
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
    diagnostics.lastSegmentAt != null
      ? new Date(diagnostics.lastSegmentAt).toLocaleTimeString()
      : null;

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
        <span className="flex items-center gap-3 text-[11px] font-mono normal-case tracking-normal">
          <span className="text-foreground">{diagnostics.mode}</span>
          <span className={stallColor}>{diagnostics.stallState}</span>
          <span className="text-muted-foreground">{open ? "Hide" : "Show"}</span>
        </span>
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-3 border-t border-border/60 p-4 text-xs font-mono sm:grid-cols-4">
          <Stat label="Mode" value={diagnostics.mode} />
          <Stat
            label="Stall State"
            value={diagnostics.stallState}
            valueClass={stallColor}
          />
          <Stat label="Retries" value={String(diagnostics.retryCount)} />
          <Stat
            label="Last Segment"
            value={lastSegAgo}
            subValue={lastSegAbs ?? (isLive ? "waiting…" : "n/a")}
          />
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


function StreamDebug({ source }: { source: StreamSource }) {
  const [info, setInfo] = useState<{
    status?: number;
    contentType?: string | null;
    bytes?: number;
    snippet?: string;
    error?: string;
    loading: boolean;
  }>({ loading: true });

  useEffect(() => {
    let cancelled = false;
    setInfo({ loading: true });

    if (source.stream_type === "iframe") {
      setInfo({ loading: false });
      return;
    }

    (async () => {
      try {
        const res = await fetch(source.url, { method: "GET", headers: { range: "bytes=0-2047" } });
        const ct = res.headers.get("content-type");
        const buf = await res.arrayBuffer();
        let snippet = "";
        try {
          snippet = new TextDecoder().decode(buf.slice(0, 512));
        } catch {}
        if (!cancelled) {
          setInfo({
            loading: false,
            status: res.status,
            contentType: ct,
            bytes: buf.byteLength,
            snippet: /[\x00-\x08\x0E-\x1F]/.test(snippet) ? "<binary data>" : snippet,
          });
        }
      } catch (e: any) {
        if (!cancelled) setInfo({ loading: false, error: String(e?.message || e) });
      }
    })();

    return () => { cancelled = true; };
  }, [source.url, source.stream_type]);

  const ok = info.status && info.status >= 200 && info.status < 400;

  return (
    <div className="border-t border-border/60 bg-card/40 p-3 text-xs font-mono">
      <div className="mb-1 flex items-center gap-2">
        <span className="uppercase tracking-wider text-muted-foreground">Stream Debug</span>
        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">{source.stream_type}</span>
        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">{source.label}</span>
        {info.loading ? (
          <span className="text-muted-foreground">resolving…</span>
        ) : info.error ? (
          <span className="text-destructive">ERROR</span>
        ) : info.status ? (
          <span className={ok ? "text-green-500" : "text-destructive"}>
            HTTP {info.status}
          </span>
        ) : null}
      </div>
      <div className="break-all text-muted-foreground">
        <span className="text-foreground">URL:</span> {source.url}
      </div>
      {info.contentType && (
        <div className="text-muted-foreground">
          <span className="text-foreground">content-type:</span> {info.contentType}
          {typeof info.bytes === "number" && <> · {info.bytes} bytes sampled</>}
        </div>
      )}
      {info.error && <div className="mt-1 text-destructive">{info.error}</div>}
      {info.snippet && (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-2 text-[11px] leading-snug text-foreground/80">
{info.snippet}
        </pre>
      )}
    </div>
  );
}

function PlyrVideo({
  src,
  type,
  poster,
  isLive,
  onPlaying,
  onDiagnostics,
}: {
  src: string;
  type: "hls" | "mp4";
  poster?: string;
  isLive?: boolean;
  onPlaying?: () => void;
  onDiagnostics?: (d: StreamDiagnostics) => void;
}) {
  const diagRef = useRef<StreamDiagnostics>({ ...INITIAL_DIAGNOSTICS });
  const onDiagnosticsRef = useRef(onDiagnostics);
  onDiagnosticsRef.current = onDiagnostics;
  const emitDiag = (patch: Partial<StreamDiagnostics>) => {
    diagRef.current = { ...diagRef.current, ...patch };
    onDiagnosticsRef.current?.(diagRef.current);
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const plyrRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const userPausedRef = useRef(false);
  const lastUserActionAtRef = useRef(0);
  const lastPlaybackRef = useRef({ time: 0, checkedAt: 0 });
  const [useNativeControls, setUseNativeControls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setUseNativeControls(false);

    const controls = [
      "play-large",
      "play",
      "rewind",
      "fast-forward",
      "progress",
      "current-time",
      "duration",
      "mute",
      "volume",
      "settings",
      "pip",
      "airplay",
      "fullscreen",
    ];

    // For live streams, hide seek-related controls
    const liveControls = ["play-large", "play", "mute", "volume", "settings", "pip", "airplay", "fullscreen"];

    const initPlyr = (qualities?: number[]) => {
      const qualityOptions = qualities?.filter(Boolean);
      const config: Record<string, any> = {
        controls: isLive ? liveControls : controls,
        settings: qualityOptions?.length ? ["captions", "quality", "speed"] : ["captions", "speed"],
        ratio: "16:9",
        keyboard: { focused: true, global: true },
        tooltips: { controls: true, seek: true },
      };

      // Important: do not pass `quality: undefined`. Plyr 3.8 can overwrite
      // its default quality config with undefined, then crash while reading
      // `this.config.quality.forced`.
      if (qualityOptions?.length) {
        config.quality = {
              default: qualityOptions[0],
              options: qualityOptions,
              forced: true,
              onChange: (newQuality: number) => {
                if (!hlsRef.current) return;
                hlsRef.current.levels.forEach((level, i) => {
                  if (level.height === newQuality) hlsRef.current!.currentLevel = i;
                });
              },
            };
      }

      try {
        plyrRef.current = new Plyr(video, config);
      } catch (error) {
        console.error("Player controls failed, falling back to native video", error);
        setUseNativeControls(true);
      }
    };

    const playSafely = () => {
      if (document.visibilityState !== "visible") return;
      video.play().catch(() => {});
    };

    let hardResetHls: (() => void) | null = null;
    let hardResetPlayback: (() => void) | null = null;
    let lastAnyHardResetAt = 0;
    const mountedAt = Date.now();

    const resetDirectSource = () => {
      if (!isLive || userPausedRef.current) return;
      const now = Date.now();
      if (now - lastAnyHardResetAt < LIVE_HARD_RESET_COOLDOWN_MS) {
        playSafely();
        return;
      }
      lastAnyHardResetAt = now;
      emitDiag({ retryCount: diagRef.current.retryCount + 1, stallState: "recovering" });
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch {}
      video.src = withCacheBust(src);
      video.load();
      playSafely();
    };

    const restartLiveLoad = () => {
      try { hlsRef.current?.startLoad(-1); } catch {}
    };

    const recoverLivePlayback = () => {
      if (!isLive || userPausedRef.current) return;
      emitDiag({ stallState: "recovering" });
      restartLiveLoad();
      const liveSyncPosition = hlsRef.current?.liveSyncPosition;
      if (typeof liveSyncPosition === "number" && liveSyncPosition > 0 && liveSyncPosition - video.currentTime > 20) {
        video.currentTime = liveSyncPosition;
      }
      const stalledTooLong = Date.now() - lastPlaybackRef.current.checkedAt > LIVE_STALL_RESET_MS;
      const noRecentSegments =
        diagRef.current.lastSegmentAt !== null && Date.now() - diagRef.current.lastSegmentAt > LIVE_SEGMENT_GRACE_MS;
      const neverLoaded = video.readyState < 2 && Date.now() - mountedAt > LIVE_STARTUP_GRACE_MS;
      if ((stalledTooLong || noRecentSegments || neverLoaded) && hardResetPlayback) {
        hardResetPlayback();
        return;
      }
      playSafely();
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

    const onPlay = () => {
      userPausedRef.current = false;
      lastPlaybackRef.current = { time: video.currentTime, checkedAt: Date.now() };
      emitDiag({ stallState: "ok" });
    };

    const onPause = () => {
      if (!isLive || video.ended) return;
      const recentUserAction = Date.now() - lastUserActionAtRef.current < 1500;
      if (recentUserAction) {
        userPausedRef.current = true;
        return;
      }
      window.setTimeout(recoverLivePlayback, 750);
    };

    const onProgressTick = () => {
      const previous = lastPlaybackRef.current;
      if (Math.abs(video.currentTime - previous.time) > 0.25) {
        lastPlaybackRef.current = { time: video.currentTime, checkedAt: Date.now() };
        if (diagRef.current.stallState !== "ok") emitDiag({ stallState: "ok" });
      }
    };

    document.addEventListener("pointerdown", markUserAction, true);
    document.addEventListener("keydown", markUserAction, true);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onProgressTick);

    const watchdog = window.setInterval(() => {
      if (!isLive || userPausedRef.current || document.visibilityState !== "visible") return;
      const previous = lastPlaybackRef.current;
      const noDataAfterStartup = video.readyState < 2 && Date.now() - mountedAt > LIVE_STARTUP_GRACE_MS;
      const noRecentSegments =
        diagRef.current.lastSegmentAt !== null && Date.now() - diagRef.current.lastSegmentAt > LIVE_SEGMENT_GRACE_MS;
      const playbackStuck =
        !video.paused &&
        Math.abs(video.currentTime - previous.time) <= 0.25 &&
        Date.now() - previous.checkedAt > LIVE_STALL_RESET_MS;

      if (video.paused || video.ended || playbackStuck || noDataAfterStartup || noRecentSegments) {
        if ((playbackStuck || noDataAfterStartup || noRecentSegments) && diagRef.current.stallState === "ok") {
          emitDiag({ stallState: "stalled" });
        }
        recoverLivePlayback();
      } else {
        restartLiveLoad();
      }
    }, 8_000);

    if (type === "mp4") {
      emitDiag({ mode: "MP4" });
      video.src = src;
      hardResetPlayback = resetDirectSource;
      initPlyr();
      playSafely();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari/iOS)
      emitDiag({ mode: "Native HLS" });
      video.src = src;
      hardResetPlayback = resetDirectSource;
      initPlyr();
      playSafely();
    } else if (Hls.isSupported()) {
      emitDiag({ mode: "HLS.js" });
      const buildHls = () =>
        new Hls({
          enableWorker: false,
          lowLatencyMode: true,
          initialLiveManifestSize: 3,
          maxBufferLength: 45,
          maxMaxBufferLength: 90,
          backBufferLength: 60,
          liveBackBufferLength: 90,
          liveDurationInfinity: true,
          liveSyncMode: "edge",
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 12,
          liveSyncOnStallIncrease: 1,
          maxLiveSyncPlaybackRate: 1.2,
          maxBufferHole: 0.25,
          detectStallWithCurrentTimeMs: 800,
          nudgeOffset: 0.2,
          nudgeMaxRetry: 8,
          startFragPrefetch: true,
          manifestLoadingMaxRetry: Number.MAX_SAFE_INTEGER,
          levelLoadingMaxRetry: Number.MAX_SAFE_INTEGER,
          fragLoadingMaxRetry: Number.MAX_SAFE_INTEGER,
          manifestLoadingRetryDelay: 1_000,
          levelLoadingRetryDelay: 1_000,
          fragLoadingRetryDelay: 1_000,
          manifestLoadingMaxRetryTimeout: 6_000,
          levelLoadingMaxRetryTimeout: 6_000,
          fragLoadingMaxRetryTimeout: 6_000,
          manifestLoadPolicy: {
            default: {
              maxTimeToFirstByteMs: 6_000,
              maxLoadTimeMs: 12_000,
              timeoutRetry: { maxNumRetry: 4, retryDelayMs: 500, maxRetryDelayMs: 3_000, backoff: "linear" },
              errorRetry: { maxNumRetry: 8, retryDelayMs: 1_000, maxRetryDelayMs: 5_000, backoff: "linear" },
            },
          },
          playlistLoadPolicy: {
            default: {
              maxTimeToFirstByteMs: 6_000,
              maxLoadTimeMs: 12_000,
              timeoutRetry: { maxNumRetry: 4, retryDelayMs: 500, maxRetryDelayMs: 3_000, backoff: "linear" },
              errorRetry: { maxNumRetry: 10, retryDelayMs: 1_000, maxRetryDelayMs: 5_000, backoff: "linear" },
            },
          },
          fragLoadPolicy: {
            default: {
              maxTimeToFirstByteMs: 7_000,
              maxLoadTimeMs: 18_000,
              timeoutRetry: { maxNumRetry: 4, retryDelayMs: 0, maxRetryDelayMs: 2_000, backoff: "linear" },
              errorRetry: { maxNumRetry: 10, retryDelayMs: 750, maxRetryDelayMs: 4_000, backoff: "linear" },
            },
          },
        });

      let recoverCount = 0;
      let lastHardResetAt = 0;
      const attachHls = (hls: Hls, sourceUrl = src) => {
        hlsRef.current = hls;
        hls.loadSource(sourceUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.startLoad(-1);
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!plyrRef.current) {
            const qualities = hls.levels
              .map((l) => l.height)
              .filter((h, i, a) => h && a.indexOf(h) === i);
            initPlyr(qualities.length ? qualities : undefined);
          }
          playSafely();
        });
        hls.on(Hls.Events.FRAG_LOADED, () => {
          emitDiag({ lastSegmentAt: Date.now(), stallState: "ok" });
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          const isNetwork = data.type === Hls.ErrorTypes.NETWORK_ERROR;
          const isMedia = data.type === Hls.ErrorTypes.MEDIA_ERROR;
          const details = String(data.details ?? "").toLowerCase();
          if (!data.fatal) {
            if (isNetwork || details.includes("stall") || details.includes("timeout")) {
              emitDiag({ retryCount: diagRef.current.retryCount + 1, stallState: "recovering" });
              recoverCount += 1;
              if (recoverCount > 3) {
                recoverCount = 0;
                hardResetPlayback?.();
              } else {
                hls.startLoad(-1);
                playSafely();
              }
            } else if (isMedia) {
              recoverLivePlayback();
            }
            return;
          }
          emitDiag({
            retryCount: diagRef.current.retryCount + 1,
            stallState: "recovering",
          });
          if (isNetwork) {
            recoverCount += 1;
            if (recoverCount > 4) {
              recoverCount = 0;
              hardResetHls?.();
            } else {
              hls.startLoad(-1);
              playSafely();
            }
          } else if (isMedia) {
            recoverCount += 1;
            if (recoverCount > 2) {
              recoverCount = 0;
              hardResetHls?.();
            } else {
              hls.recoverMediaError();
            }
          } else {
            hardResetHls?.();
          }
        });
      };
      hardResetHls = () => {
        const now = Date.now();
        if (now - lastHardResetAt < LIVE_HARD_RESET_COOLDOWN_MS) {
          restartLiveLoad();
          playSafely();
          return;
        }
        lastHardResetAt = now;
        lastAnyHardResetAt = now;
        emitDiag({ retryCount: diagRef.current.retryCount + 1, stallState: "recovering" });
        try {
          hlsRef.current?.destroy();
          video.pause();
          video.removeAttribute("src");
          video.load();
        } catch {}
        attachHls(buildHls(), withCacheBust(src));
      };
      hardResetPlayback = hardResetHls;
      attachHls(buildHls());
    } else {
      video.src = src;
      hardResetPlayback = resetDirectSource;
      initPlyr();
    }

    // Auto-resume on stalls, live "ended", and tab visibility changes for
    // HLS.js, native HLS, and direct progressive streams.
    let waitingResetTimer: number | null = null;
    const onStalled = () => {
      if (!isLive) return;
      emitDiag({ stallState: "stalled" });
      recoverLivePlayback();
      if (waitingResetTimer) window.clearTimeout(waitingResetTimer);
      waitingResetTimer = window.setTimeout(() => hardResetPlayback?.(), 5_000);
    };
    const onCanPlayOrPlaying = () => {
      if (waitingResetTimer) {
        window.clearTimeout(waitingResetTimer);
        waitingResetTimer = null;
      }
      emitDiag({ stallState: "ok" });
    };
    const onEnded = () => {
      if (isLive) hardResetPlayback?.();
    };
    const onVideoError = () => {
      if (isLive) hardResetPlayback?.();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && isLive) {
        if (video.paused || video.readyState < 2) recoverLivePlayback();
        else restartLiveLoad();
      }
    };
    video.addEventListener("stalled", onStalled);
    video.addEventListener("waiting", onStalled);
    video.addEventListener("emptied", onStalled);
    video.addEventListener("suspend", onStalled);
    video.addEventListener("canplay", onCanPlayOrPlaying);
    video.addEventListener("playing", onCanPlayOrPlaying);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onVideoError);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(watchdog);
      if (waitingResetTimer) window.clearTimeout(waitingResetTimer);
      document.removeEventListener("pointerdown", markUserAction, true);
      document.removeEventListener("keydown", markUserAction, true);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onProgressTick);
      video.removeEventListener("stalled", onStalled);
      video.removeEventListener("waiting", onStalled);
      video.removeEventListener("emptied", onStalled);
      video.removeEventListener("suspend", onStalled);
      video.removeEventListener("canplay", onCanPlayOrPlaying);
      video.removeEventListener("playing", onCanPlayOrPlaying);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onVideoError);
      document.removeEventListener("visibilitychange", onVisibility);
      plyrRef.current?.destroy();
      plyrRef.current = null;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, type, isLive]);

  return (
    <div className="absolute inset-0 h-full w-full bg-black [&_.plyr]:h-full [&_.plyr]:w-full">
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        controls={useNativeControls}
        onPlaying={() => onPlaying?.()}
        onCanPlay={() => onPlaying?.()}
        className="h-full w-full"
      />
    </div>
  );
}
