import { useEffect, useRef, useState } from "react";
import { Activity, Loader2, Play, Radio, Tv, AlertTriangle } from "lucide-react";

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
  mode: "Shaka" | "hls.js" | "Native HLS" | "MP4" | "iframe" | "idle";
  stallState: "ok" | "stalled" | "recovering" | "offline";
  retryCount: number;
  lastSegmentAt: number | null;
  bitrate?: number;
  resolution?: string;
};

const INITIAL_DIAGNOSTICS: StreamDiagnostics = {
  mode: "idle",
  stallState: "ok",
  retryCount: 0,
  lastSegmentAt: null,
};

const RETRY_INTERVAL_MS = 3_000;
const STALL_RECOVER_MS = 8_000;

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
      const r = line.match(/RESOLUTION=(\d+)x(\d+)/i);
      const bw = line.match(/BANDWIDTH=(\d+)/i);
      const h = r ? parseInt(r[2], 10) : 0;
      const b = bw ? parseInt(bw[1], 10) : 0;
      if (h > bestHeight) bestHeight = h;
      if (b > bestBandwidth) bestBandwidth = b;
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
    const j = url.includes("?") ? "&" : "?";
    return `${url}${j}_r=${Date.now()}`;
  }
}

export function StreamPlayer({ sources, poster, isLive, placeholder }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(sources[0]?.id ?? null);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qualities, setQualities] = useState<Record<string, QualityInfo>>({});
  const [diagnostics, setDiagnostics] = useState<StreamDiagnostics>(INITIAL_DIAGNOSTICS);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const failedSourceIdsRef = useRef<Set<string>>(new Set());
  const sourcesKey = sources.map((s) => s.id).join("|");
  const selected = sources.find((s) => s.id === selectedId) ?? sources[0];
  const selectedLooksLive = Boolean(isLive || selected?.stream_type === "hls");

  useEffect(() => {
    failedSourceIdsRef.current = new Set();
    if (!sources.some((s) => s.id === selectedId)) {
      setSelectedId(sources[0]?.id ?? null);
    }
  }, [sourcesKey, selectedId, sources]);

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

  useEffect(() => {
    if (!started || !selected || sources.length < 2) return;
    const shouldSwitch = diagnostics.stallState === "offline" || diagnostics.retryCount >= 2;
    if (!shouldSwitch) return;

    failedSourceIdsRef.current.add(selected.id);
    const next =
      sources.find((s) => s.id !== selected.id && !failedSourceIdsRef.current.has(s.id)) ??
      sources.find((s) => s.id !== selected.id);
    if (!next) return;

    const timer = window.setTimeout(() => {
      setSelectedId(next.id);
      setLoading(true);
      setDiagnostics(INITIAL_DIAGNOSTICS);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [diagnostics.retryCount, diagnostics.stallState, selected, sources, started]);

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
          <ShakaLivePlayer
            key={`${selected.id}:${selected.url}`}
            src={selected.url}
            type={selected.stream_type}
            poster={poster}
            isLive={selectedLooksLive}
            onReady={() => setLoading(false)}
            onDiagnostics={setDiagnostics}
          />
        )}

        {started && loading && diagnostics.stallState !== "offline" && (
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-white">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-sm font-medium uppercase tracking-wide text-white/80">
                {diagnostics.stallState === "recovering" ? "Reconnecting…" : "Loading stream…"}
              </div>
            </div>
          </div>
        )}

        {started && diagnostics.stallState === "offline" && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/85 text-center">
            <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-white">
              <AlertTriangle className="h-10 w-10 text-amber-400" />
              <div className="font-display text-xl tracking-wide">Channel Temporarily Unavailable</div>
              <div className="text-sm text-white/70">
                We're retrying automatically. You can also pick another server below.
              </div>
            </div>
          </div>
        )}

        {selectedLooksLive && (
          <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md bg-live px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
            <Radio className="h-3 w-3" /> Live
          </div>
        )}

        {started && diagnostics.bitrate && (
          <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-md bg-black/60 px-2.5 py-1 font-mono text-[11px] text-white/90">
            {diagnostics.resolution ? `${diagnostics.resolution} · ` : ""}
            {(diagnostics.bitrate / 1_000_000).toFixed(1)} Mbps
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
      : diagnostics.stallState === "stalled" || diagnostics.stallState === "offline"
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
          <Stat label="State" value={diagnostics.stallState} valueClass={stallColor} />
          <Stat label="Retries" value={String(diagnostics.retryCount)} />
          <Stat
            label="Bitrate"
            value={diagnostics.bitrate ? `${(diagnostics.bitrate / 1_000_000).toFixed(2)} Mbps` : "—"}
            subValue={diagnostics.resolution}
          />
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

// ===========================================================================
// Shaka Player + hls.js + native <video> live engine with auto-recovery
// ===========================================================================

type EngineKind = "shaka" | "hlsjs" | "native";

function ShakaLivePlayer({
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
  const diagRef = useRef<StreamDiagnostics>({ ...INITIAL_DIAGNOSTICS });
  const onDiagnosticsRef = useRef(onDiagnostics);
  const onReadyRef = useRef(onReady);
  onDiagnosticsRef.current = onDiagnostics;
  onReadyRef.current = onReady;

  const emitDiag = (patch: Partial<StreamDiagnostics>) => {
    diagRef.current = { ...diagRef.current, ...patch };
    onDiagnosticsRef.current?.(diagRef.current);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (typeof window === "undefined") return;

    let destroyed = false;
    let shakaPlayer: any = null;
    let hlsInstance: any = null;
    let retryTimer: number | null = null;
    let watchdog: number | null = null;
    let lastProgress = { t: 0, at: Date.now() };
    let bufferingStartedAt: number | null = null;
    let watchStartAt = Date.now();
    let bufferingEvents = 0;
    let totalWatchMs = 0;
    let engine: EngineKind = "shaka";

    diagRef.current = { ...INITIAL_DIAGNOSTICS };

    const track = (event: string, payload?: Record<string, unknown>) => {
      try {
        const w = window as any;
        if (typeof w.gtag === "function") w.gtag("event", event, payload ?? {});
        if (w.dataLayer && typeof w.dataLayer.push === "function")
          w.dataLayer.push({ event, ...(payload ?? {}) });
      } catch {}
    };

    const bumpRetry = () => emitDiag({ retryCount: diagRef.current.retryCount + 1, stallState: "recovering" });

    const cleanupEngines = async () => {
      try {
        if (shakaPlayer) {
          await shakaPlayer.destroy();
          shakaPlayer = null;
        }
      } catch {}
      try {
        if (hlsInstance) {
          hlsInstance.destroy();
          hlsInstance = null;
        }
      } catch {}
      try {
        video.removeAttribute("src");
        video.load();
      } catch {}
    };

    const scheduleRetry = (reason: string) => {
      if (destroyed) return;
      if (retryTimer) window.clearTimeout(retryTimer);
      emitDiag({ stallState: "offline" });
      track("stream_failure", { reason, engine });
      retryTimer = window.setTimeout(() => {
        bumpRetry();
        emitDiag({ stallState: "recovering" });
        boot(engine).catch(() => scheduleRetry("retry_failed"));
      }, RETRY_INTERVAL_MS);
    };

    let bootCount = 0;
    const urlFor = () => (bootCount === 0 ? src : withCacheBust(src));

    const startNative = async () => {
      engine = "native";
      emitDiag({ mode: "Native HLS" });
      video.src = urlFor();
      try {
        await video.play();
      } catch {}
    };

    const startHlsJs = async () => {
      const mod = await import("hls.js");
      const Hls = mod.default;
      if (!Hls.isSupported()) {
        await startNative();
        return;
      }
      engine = "hlsjs";
      emitDiag({ mode: "hls.js" });
      hlsInstance = new Hls({
        liveDurationInfinity: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        manifestLoadingMaxRetry: Infinity,
        levelLoadingMaxRetry: Infinity,
        fragLoadingMaxRetry: Infinity,
      });
      hlsInstance.loadSource(urlFor());
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.ERROR, (_e: unknown, data: any) => {
        if (data?.fatal) {
          try {
            hlsInstance.destroy();
          } catch {}
          hlsInstance = null;
          scheduleRetry(`hlsjs_${data.type ?? "fatal"}`);
        }
      });
      hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (_e: unknown, data: any) => {
        const lvl = hlsInstance.levels?.[data.level];
        if (lvl)
          emitDiag({
            bitrate: lvl.bitrate,
            resolution: lvl.height ? `${lvl.height}p` : undefined,
          });
      });
      hlsInstance.on(Hls.Events.FRAG_LOADED, () => emitDiag({ lastSegmentAt: Date.now() }));
      try {
        await video.play();
      } catch {}
    };

    const startShaka = async () => {
      try {
        const shaka = (await import("shaka-player/dist/shaka-player.compiled.js")).default;
        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) {
          await startHlsJs();
          return;
        }
        engine = "shaka";
        emitDiag({ mode: "Shaka" });
        shakaPlayer = new shaka.Player();
        await shakaPlayer.attach(video);

        shakaPlayer.configure({
          streaming: {
            bufferingGoal: 30,
            rebufferingGoal: 15,
            bufferBehind: 30,
            lowLatencyMode: true,
            retryParameters: {
              maxAttempts: Infinity,
              baseDelay: 1000,
              backoffFactor: 1.5,
              timeout: 20000,
              stallTimeout: 5000,
              connectionTimeout: 10000,
              fuzzFactor: 0.5,
            },
          },
          manifest: {
            retryParameters: {
              maxAttempts: Infinity,
              baseDelay: 1000,
              backoffFactor: 1.5,
              timeout: 20000,
              fuzzFactor: 0.5,
            },
          },
        });

        shakaPlayer.addEventListener("error", (event: any) => {
          const code = event?.detail?.code ?? event?.code;
          const recoverable = code && code >= 1000 && code < 5000;
          if (recoverable) {
            bumpRetry();
            shakaPlayer
              .load(withCacheBust(src))
              .catch(() => scheduleRetry(`shaka_${code}`));
          } else {
            // Fall back chain
            (async () => {
              await cleanupEngines();
              try {
                await startHlsJs();
              } catch {
                scheduleRetry(`shaka_fatal_${code ?? "?"}`);
              }
            })();
          }
        });

        shakaPlayer.addEventListener("buffering", (e: any) => {
          if (e.buffering) {
            bufferingStartedAt = Date.now();
            bufferingEvents += 1;
            emitDiag({ stallState: "stalled" });
            track("stream_buffering", { engine });
          } else {
            bufferingStartedAt = null;
            emitDiag({ stallState: "ok" });
          }
        });

        shakaPlayer.addEventListener("adaptation", () => {
          const stats = shakaPlayer.getStats?.();
          if (stats) {
            emitDiag({
              bitrate: stats.streamBandwidth,
              resolution: stats.height ? `${stats.height}p` : undefined,
            });
          }
        });

        await shakaPlayer.load(urlFor());
        try {
          await video.play();
        } catch {}
      } catch (err) {
        await cleanupEngines();
        try {
          await startHlsJs();
        } catch {
          scheduleRetry("shaka_init_failed");
        }
      }
    };

    const boot = async (preferred: EngineKind = "shaka") => {
      if (destroyed) return;
      await cleanupEngines();
      if (type === "mp4") {
        engine = "native";
        emitDiag({ mode: "MP4" });
        video.src = urlFor();
        try {
          await video.play();
        } catch {}
        bootCount += 1;
        return;
      }
      try {
        if (preferred === "shaka") await startShaka();
        else if (preferred === "hlsjs") await startHlsJs();
        else await startNative();
      } finally {
        bootCount += 1;
      }
    };

    // Video element listeners
    const clearLoading = () => onReadyRef.current?.();
    const onPlaying = () => {
      emitDiag({ stallState: "ok" });
      clearLoading();
      lastProgress = { t: video.currentTime, at: Date.now() };
      watchStartAt = Date.now();
    };
    const onLoadedData = () => clearLoading();
    const onCanPlay = () => clearLoading();
    const onTimeUpdate = () => {
      if (Math.abs(video.currentTime - lastProgress.t) > 0.25) {
        lastProgress = { t: video.currentTime, at: Date.now() };
        if (diagRef.current.stallState !== "ok") emitDiag({ stallState: "ok" });
      }
    };
    const onWaiting = () => {
      emitDiag({ stallState: "stalled" });
      bufferingEvents += 1;
      track("stream_buffering", { engine });
    };
    const onPause = () => {
      if (!video.ended) totalWatchMs += Date.now() - watchStartAt;
    };
    const onError = () => scheduleRetry("video_error");
    const onPiP = () => {};

    video.addEventListener("playing", onPlaying);
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onWaiting);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);
    video.addEventListener("enterpictureinpicture", onPiP);

    const onOnline = () => {
      if (destroyed) return;
      bumpRetry();
      boot(engine).catch(() => scheduleRetry("network_online_retry"));
    };
    const onOffline = () => emitDiag({ stallState: "offline" });
    const onNetChange = () => {
      if (destroyed) return;
      bumpRetry();
      boot(engine).catch(() => scheduleRetry("network_change_retry"));
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && isLive && video.paused) {
        video.play().catch(() => {});
      }
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const conn = (navigator as any).connection;
    if (conn && typeof conn.addEventListener === "function")
      conn.addEventListener("change", onNetChange);
    document.addEventListener("visibilitychange", onVisibility);

    // Watchdog: detect frozen playback and trigger recovery
    watchdog = window.setInterval(() => {
      if (destroyed || video.paused || document.visibilityState !== "visible") return;
      const stuckFor = Date.now() - lastProgress.at;
      if (stuckFor > STALL_RECOVER_MS && video.readyState < 3) {
        bumpRetry();
        if (engine === "shaka" && shakaPlayer) {
          shakaPlayer
            .load(withCacheBust(src))
            .then(() => video.play().catch(() => {}))
            .catch(() => scheduleRetry("watchdog_shaka"));
        } else if (engine === "hlsjs" && hlsInstance) {
          try {
            hlsInstance.recoverMediaError();
          } catch {
            scheduleRetry("watchdog_hlsjs");
          }
        } else {
          video.src = withCacheBust(src);
          video.play().catch(() => {});
        }
        if (bufferingStartedAt) {
          bufferingEvents += 1;
          bufferingStartedAt = null;
        }
      }
    }, 4_000);

    boot("shaka").catch(() => scheduleRetry("boot_failed"));

    // Fallback escalation: if Shaka doesn't deliver data quickly, try hls.js then native
    const escalateIfStuck = window.setTimeout(() => {
      if (destroyed) return;
      if (video.readyState >= 2) return;
      if (engine === "shaka") {
        cleanupEngines().then(() => startHlsJs().catch(() => startNative()));
      } else if (engine === "hlsjs") {
        cleanupEngines().then(() => startNative());
      }
    }, 6_000);

    return () => {
      destroyed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      window.clearTimeout(escalateIfStuck);
      if (watchdog) window.clearInterval(watchdog);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("stalled", onWaiting);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
      video.removeEventListener("enterpictureinpicture", onPiP);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (conn && typeof conn.removeEventListener === "function")
        conn.removeEventListener("change", onNetChange);
      document.removeEventListener("visibilitychange", onVisibility);
      if (!video.paused) totalWatchMs += Date.now() - watchStartAt;
      track("stream_session_end", {
        engine,
        buffering_events: bufferingEvents,
        watch_ms: totalWatchMs,
      });
      cleanupEngines();
    };
  }, [src, type, isLive]);

  return (
    <div className="absolute inset-0 h-full w-full bg-black">
      <video
        ref={videoRef}
        className="h-full w-full bg-black"
        poster={poster}
        playsInline
        controls
        autoPlay
        preload="auto"
        controlsList="nodownload"
      />
    </div>
  );
}
