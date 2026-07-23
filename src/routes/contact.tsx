import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { submitClientQuery } from "@/lib/admin.functions";
import { Mail, Send, CheckCircle2, Youtube, Twitter, Instagram, Send as TelegramIcon } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Yalla Football Live" },
      { name: "description", content: "Reach out to Yalla Football Live for support, partnerships, feedback or venue licensing." },
      { property: "og:title", content: "Contact Yalla Football Live" },
      { property: "og:description", content: "Get in touch with our team — we'd love to hear from you." },
    ],
  }),
  component: ContactPage,
});

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(150),
  priority: z.enum(["Low", "Medium", "High"]),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
});

type FormState = z.infer<typeof contactSchema>;
type FormErrors = Partial<Record<keyof FormState, string>>;

function ContactPage() {
  const [form, setForm] = useState<FormState>({ name: "", email: "", subject: "", priority: "Medium", message: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const submitFn = useServerFn(submitClientQuery);

  const update =
    <K extends keyof FormState>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value as FormState[K] }));
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
      const { priority, message, ...rest } = result.data;
      await submitFn({ data: { ...rest, message: `[Priority: ${priority}]\n\n${message}` } });
      setSent(true);
      setForm({ name: "", email: "", subject: "", priority: "Medium", message: "" });
    } catch (err) {
      setErrors({ message: err instanceof Error ? err.message : "Failed to send" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* LEFT — Intro + info cards */}
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Contact Us</span>
              <span className="h-px w-24 bg-gradient-to-r from-primary to-transparent" />
            </div>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl leading-[1.05]">
              Reach Out to <span className="text-primary">Yalla Football Live</span>
            </h1>
            <p className="mt-5 text-muted-foreground max-w-lg leading-relaxed">
              Our mission is to connect the global football community. If you have ideas,
              feedback, partnership inquiries, or need help with your subscription — we'd love to hear from you.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
                <div className="text-sm font-semibold text-foreground">Contact us directly at</div>
                <div className="mt-6 flex items-center justify-center gap-2 text-base sm:text-lg font-medium">
                  <Mail className="h-4 w-4 text-primary" />
                  <a href="mailto:support@soccertv.live" className="hover:text-primary transition-colors">
                    support@soccertv.live
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card p-6">
                <div className="text-center text-sm font-semibold text-foreground">Follow on social media</div>
                <div className="mt-6 flex items-center justify-center gap-4">
                  {[
                    { Icon: TelegramIcon, href: "https://t.me/livefootballstreamings", label: "Telegram" },
                    { Icon: Youtube, href: "#", label: "YouTube" },
                    { Icon: Twitter, href: "#", label: "Twitter" },
                    { Icon: Instagram, href: "#", label: "Instagram" },
                  ].map(({ Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      aria-label={label}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-background text-foreground/80 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Form */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
            <h2 className="font-display text-3xl sm:text-4xl">Want to Say Something?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Fill out the form below and we'll get back to you as soon as possible.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              {sent && (
                <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
                  <div>
                    <div className="font-semibold">Message received</div>
                    <div className="text-emerald-200/80">Thanks — our team will get back to you shortly.</div>
                  </div>
                </div>
              )}

              <Field label="Name" error={errors.name}>
                <input type="text" value={form.name} onChange={update("name")} maxLength={100} className="input-base" />
              </Field>

              <Field label="Email" error={errors.email}>
                <input type="email" value={form.email} onChange={update("email")} maxLength={255} className="input-base" />
              </Field>

              <Field label="Subject" error={errors.subject}>
                <input type="text" value={form.subject} onChange={update("subject")} maxLength={150} className="input-base" />
              </Field>

              <Field label="Priority">
                <select value={form.priority} onChange={update("priority")} className="input-base">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </Field>

              <Field label="Message" error={errors.message}>
                <textarea value={form.message} onChange={update("message")} maxLength={2000} rows={5} className="input-base resize-y" />
                <div className="mt-1 text-xs text-muted-foreground text-right">{form.message.length}/2000</div>
              </Field>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-transparent px-6 py-3 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Sending…" : "Send"}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-primary">{error}</span>}
    </label>
  );
}
