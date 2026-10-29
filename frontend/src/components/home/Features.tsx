import { Image, MousePointerClick, ShieldCheck, Sparkles, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const features: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Sparkles,
    title: "AI background removal",
    body: "The configured model separates the subject from the background.",
  },
  {
    icon: Image,
    title: "Transparent PNG downloads",
    body: "The result is a PNG with a real alpha channel, not a white fill pretending to be transparent.",
  },
  {
    icon: MousePointerClick,
    title: "Simple drag and drop",
    body: "Drop a PNG, JPG, or WebP on the page, or browse for a file.",
  },
  {
    icon: Timer,
    title: "Clear progress",
    body: "The page tells you when the file is uploading and when the model is working.",
  },
  {
    icon: ShieldCheck,
    title: "Careful image handling",
    body: "An account is optional, and uploads are not saved to it. The original file is not stored, and results are kept only for a short time.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 mx-auto w-full max-w-6xl px-5 pb-16 pt-4">
      <h2 className="text-2xl font-semibold tracking-tight">Features</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.title} className="rounded-3xl border border-line bg-white p-5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-soft text-brand">
              <feature.icon aria-hidden="true" size={18} />
            </span>
            <h3 className="mt-4 font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{feature.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
