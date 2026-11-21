"use client";

import { TextPage } from "../components/layout/TextPage";

export function AboutPage() {
  return (
    <TextPage title="About">
      <p>
        Solva is a single-purpose tool for removing the background from one image. You upload a picture, the server
        runs the configured AI model, and you download a transparent PNG.
      </p>
      <p>
        There are no galleries or payment plans. An account is optional and is not required to upload, preview, or
        download a cutout. The person running the server chooses the model, the upload limit, and how long results
        are kept.
      </p>
      <p>Cutouts can miss fine edges. Hair, glass, and motion blur are the usual hard cases.</p>
    </TextPage>
  );
}
