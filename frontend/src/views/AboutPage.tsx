"use client";

import { EcosystemSection, FutureSolutionBadge } from "../components/layout/EcosystemSection";
import { TextPage } from "../components/layout/TextPage";

export function AboutPage() {
  return (
    <TextPage title="About Solva">
      <div className="mb-6">
        <FutureSolutionBadge />
      </div>

      <p>
        Solva is a single-purpose, privacy-first tool designed for instant, high-precision
        image background removal. You upload an image, our deep learning segmentation model
        isolates the subject, and you download a crisp transparent PNG in seconds.
      </p>

      <p>
        Unlike complex editing suites, Solva requires no credit cards, subscriptions, or intrusive
        registrations. An account is completely optional; you can upload, edit, preview, and download
        cutouts as a guest. All image processing occurs strictly in memory without persistent file
        storage, keeping your personal photographs private and secure.
      </p>

      <p>
        Whether you are generating e-commerce product photos for Amazon and Shopify, crafting custom
        avatars and biometric passport headshots in our{" "}
        <a href="/portrait" className="font-medium text-brand underline underline-offset-2">
          Portrait Studio
        </a>
        , or assembling YouTube thumbnails, Solva streamlines your creative workflow.
      </p>

      <div className="mt-12 border-t border-line pt-10">
        <EcosystemSection />
      </div>
    </TextPage>
  );
}
