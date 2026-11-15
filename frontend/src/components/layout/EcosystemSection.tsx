import { cn } from "../../utils/cn";

export interface EcosystemTool {
  name: string;
  tagline: string;
  description: string;
  url: string;
}

export const ECOSYSTEM_TOOLS: EcosystemTool[] = [
  {
    name: "BestDownloader",
    tagline: "BestDownloader — Free Social & Stock Video Downloader",
    description: "Download video clips, stock footage, and creator media in HD/4K resolution for your video and thumbnail workflows.",
    url: "https://bestdownloader.site",
  },
  {
    name: "BestConvert",
    tagline: "BestConvert — Free Online File & PDF Converter",
    description: "Convert PNG cutouts, WebP images, PDFs, and media formats instantly with maximum quality and zero file limits.",
    url: "https://bestconvert.site",
  },
  {
    name: "ImageCustomize",
    tagline: "ImageCustomize — Free Image Resizer & Compressor",
    description: "Resize dimensions, crop to custom aspect ratios, and optimize image payload weight for fast Core Web Vitals.",
    url: "https://imagecustomize.site",
  },
  {
    name: "FutureSolutionAI",
    tagline: "FutureSolutionAI — Custom Software, Web App & AI Studio",
    description: "Full-service digital studio developing bespoke AI microservices, cloud applications, and automated workflow pipelines.",
    url: "https://futuresolutionai.com",
  },
];

export function FutureSolutionBadge({ className }: { className?: string }) {
  return (
    <a
      href="https://futuresolutionai.com"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-3.5 py-1.5 text-xs font-semibold text-brand transition-all hover:border-brand hover:bg-brand/10 hover:shadow-sm",
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-brand animate-pulse" aria-hidden="true" />
      <span>
        A Product of{" "}
        <span className="font-bold underline decoration-brand/40 decoration-1 underline-offset-2">
          FutureSolutionAI
        </span>
      </span>
    </a>
  );
}

export function EcosystemSection({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <section className={cn("w-full", className)} aria-label="Our Free Ecosystem Tools">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-ink">
            Our Free Ecosystem Tools
          </h2>
          <p className="text-xs text-muted">
            Free, privacy-first web utilities created by FutureSolutionAI.
          </p>
        </div>
        <FutureSolutionBadge />
      </div>
      <div
        className={cn(
          "grid gap-3",
          compact
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            : "grid-cols-1 sm:grid-cols-2",
        )}
      >
        {ECOSYSTEM_TOOLS.map((tool) => (
          <a
            key={tool.name}
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col justify-between rounded-xl border border-line bg-white p-3.5 shadow-sm transition hover:border-brand/40 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink transition-colors group-hover:text-brand">
                  {tool.name}
                </span>
                <span
                  className="text-xs text-muted/60 transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                  aria-hidden="true"
                >
                  ↗
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-brand">
                {tool.tagline}
              </p>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
                {tool.description}
              </p>
            </div>
            <span className="mt-3 text-[11px] font-mono text-muted/70 group-hover:text-brand">
              {tool.url.replace("https://", "")}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

