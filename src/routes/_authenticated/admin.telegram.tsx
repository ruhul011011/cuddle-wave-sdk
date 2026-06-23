import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/telegram")({
  component: AdminTelegramPage,
});

const KEY = "telegram_join_url";

function AdminTelegramPage() {
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["site_settings", KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value, updated_at")
        .eq("key", KEY)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data?.value != null) setValue(data.value);
  }, [data?.value]);

  async function save() {
    const trimmed = value.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      toast.error("Link must start with http:// or https://");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: KEY, value: trimmed }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Telegram link saved");
    qc.invalidateQueries({ queryKey: ["site_settings", KEY] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Telegram</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set the Telegram invite link shown to users across the site.
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Join link</div>
            <div className="text-xs text-muted-foreground">e.g. https://t.me/yourchannel</div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Telegram URL
            </label>
            <input
              type="url"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://t.me/your_channel"
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {data?.updated_at && (
                  <>Last updated {new Date(data.updated_at).toLocaleString()}</>
                )}
              </div>
              <div className="flex items-center gap-2">
                {value && (
                  <a
                    href={value}
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
