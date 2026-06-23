import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { submitClientQuery } from "@/lib/admin.functions";
import { Mail, MessageSquare, MapPin, Send, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Football Streaming" },
      { name: "description", content: "Get in touch with the Football Streaming team for support, partnerships or licensing." },
      { property: "og:title", content: "Contact Football Streaming" },
      { property: "og:description", content: "Reach our team for support, partnerships, or venue licensing." },
    ],
  }),
  component: ContactPage,
});

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(150),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
});

type FormErrors = Partial<Record<keyof z.infer<typeof contactSchema>, string>>;

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const submitFn = useServerFn(submitClientQuery);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormErrors;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setSubmitting(true);
    try {
      await submitFn({ data: result.data });
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setErrors({ message: err instanceof Error ? err.message : "Failed to send" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Contact</div>
          <h1 className="mt-2 font-display text-4xl sm:text-6xl leading-[0.95]">
            GET IN <span className="text-primary">TOUCH.</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Support, partnerships, venue licensing — drop us a line and we'll get back within 24 hours.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_320px]">
          <form onSubmit={onSubmit} className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 space-y-5">
            {sent && (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
                <div>
                  <div className="font-semibold">Message received</div>
                  <div className="text-emerald-200/80">Thanks — our team will get back to you shortly.</div>
                </div>
              </div>
            )}

            <Field label="Your name" error={errors.name}>
              <input
                type="text"
                value={form.name}
                onChange={update("name")}
                maxLength={100}
                placeholder="Jane Doe"
                className="input-base"
              />
            </Field>

            <Field label="Email" error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                maxLength={255}
                placeholder="you@example.com"
                className="input-base"
              />
            </Field>

            <Field label="Subject" error={errors.subject}>
              <input
                type="text"
                value={form.subject}
                onChange={update("subject")}
                maxLength={150}
                placeholder="What's it about?"
                className="input-base"
              />
            </Field>

            <Field label="Message" error={errors.message}>
              <textarea
                value={form.message}
                onChange={update("message")}
                maxLength={2000}
                rows={6}
                placeholder="Tell us what you need…"
                className="input-base resize-y"
              />
              <div className="mt-1 text-xs text-muted-foreground text-right">{form.message.length}/2000</div>
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Sending…" : "Send message"}
            </button>
          </form>

          <aside className="space-y-4">
            <InfoTile
              icon={<Mail className="h-5 w-5" />}
              title="Email"
              value="hello@footystream.app"
            />
            <InfoTile
              icon={<MessageSquare className="h-5 w-5" />}
              title="Live chat"
              value="Mon–Fri, 9–18 UTC"
            />
            <InfoTile
              icon={<MapPin className="h-5 w-5" />}
              title="Office"
              value="Lisbon, Portugal"
            />
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-primary">{error}</span>}
    </label>
  );
}

function InfoTile({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/15 text-primary">{icon}</div>
      <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="font-display text-lg">{value}</div>
    </div>
  );
}
