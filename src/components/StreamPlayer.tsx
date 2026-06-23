import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import * as PlyrNS from "plyr";
const Plyr = (PlyrNS as any).default ?? (PlyrNS as any);
type Plyr = InstanceType<typeof Plyr>;
import "plyr/dist/plyr.css";
import { Play, Radio, Tv } from "lucide-react";

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

export function StreamPlayer({ sources, poster, isLive, placeholder }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(sources[0]?.id ?? null);
  const [started, setStarted] = useState(false);
  const selected = sources.find((s) => s.id === selectedId) ?? sources[0];

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
            onClick={() => setStarted(true)}
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
                {isLive ? "TAP TO WATCH LIVE" : "PLAY STREAM"}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">HD · Click to start playback</div>
            </div>
          </button>
        ) : selected.stream_type === "iframe" ? (
          <iframe
            src={selected.url}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        ) : (
          <PlyrVideo src={selected.url} type={selected.stream_type} poster={poster} isLive={isLive} />
        )}

        {isLive && (
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
                  <span className="tracking-wide">HD</span>
                  <span className={active ? "text-white/95" : "text-amber-400"}>
                    {s.label?.toUpperCase() || `SERVER ${i + 1}`}
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
}: {
  src: string;
  type: "hls" | "mp4";
  poster?: string;
  isLive?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const plyrRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);
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

    if (type === "mp4") {
      video.src = src;
      initPlyr();
      video.play().catch(() => {});
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari/iOS)
      video.src = src;
      initPlyr();
      video.play().catch(() => {});
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const qualities = hls.levels.map((l) => l.height).filter((h, i, a) => h && a.indexOf(h) === i);
        initPlyr(qualities.length ? qualities : undefined);
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      });
    } else {
      video.src = src;
      initPlyr();
    }

    return () => {
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
        crossOrigin="anonymous"
        className="h-full w-full"
      />
    </div>
  );
}
