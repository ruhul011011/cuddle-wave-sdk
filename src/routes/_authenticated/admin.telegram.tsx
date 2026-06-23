import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Loader2, ExternalLink, AtSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/telegram")({
  component: AdminTelegramPage,
});

const URL_KEY = "telegram_join_url";
const USERNAME_KEY = "telegram_username";

function normalizeUsername(raw: string) {
  let u = raw.trim();
  if (!u) return "";
  // Strip URL prefixes
  u = u.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "");
  u = u.replace(/^@/, "");
  // Strip trailing slash / query
  u = u.split(/[/?#]/)[0];
  return u;
}

function AdminTelegramPage() {
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["site_settings", "telegram"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value, updated_at")
        .in("key", [URL_KEY, USERNAME_KEY]);
      if (error) throw error;
      const map = new Map(data?.map((r) => [r.key, r]) ?? []);
      return {
        url: map.get(URL_KEY) ?? null,
        username: map.get(USERNAME_KEY) ?? null,
      };
    },
  });

  useEffect(() => {
    if (data?.url?.value != null) setUrl(data.url.value);
    if (data?.username?.value != null) setUsername(data.username.value);
  }, [data]);

  // Auto-fill URL from username when URL is empty or matches the previous t.me pattern
  const derivedUrl = username ? `https://t.me/${normalizeUsername(username)}` : "";
  const effectiveUrl = url.trim() || derivedUrl;

  async function save() {
    const cleanUsername = normalizeUsername(username);
    const finalUrl = url.trim() || (cleanUsername ? `https://t.me/${cleanUsername}` : "");

    if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
      toast.error("Link must start with http:// or https://");
      return;
    }

    setSaving(true);
    const rows = [
      { key: USERNAME_KEY, value: cleanUsername },
      { key: URL_KEY, value: finalUrl },
    ];
    const { error } = await supabase
      .from("site_settings")
      .upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Telegram settings saved");
    setUrl(finalUrl);
    setUsername(cleanUsername);
    qc.invalidateQueries({ queryKey: ["site_settings", "telegram"] });
    qc.invalidateQueries({ queryKey: ["site_settings", URL_KEY] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Telegram</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set the Telegram channel shown to users across the site.
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6 max-w-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Channel</div>
            <div className="text-xs text-muted-foreground">
              Enter the channel username — the link is built automatically.
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Channel username
              </label>
              <div className="flex items-center rounded-lg border border-border/60 bg-background focus-within:ring-2 focus-within:ring-primary/30">
                <span className="grid h-10 w-10 place-items-center text-muted-foreground">
                  <AtSign className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_channel"
                  className="w-full bg-transparent px-1 py-2.5 text-sm focus:outline-none"
                />
              </div>
              {username && (
                <div className="mt-1.5 text-xs text-muted-foreground">
                  Preview: <span className="text-foreground">@{normalizeUsername(username)}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Custom invite URL <span className="text-muted-foreground/70">(optional, overrides username link)</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={derivedUrl || "https://t.me/+private_invite_hash"}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-xs text-muted-foreground">
                {data?.url?.updated_at && (
                  <>Last updated {new Date(data.url.updated_at).toLocaleString()}</>
                )}
              </div>
              <div className="flex items-center gap-2">
                {effectiveUrl && (
                  <a
                    href={effectiveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Preview
                  </a>
                )}
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
