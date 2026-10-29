const steps = [
  {
    title: "Upload an image",
    body: "Choose a PNG, JPG, or WebP. Solva checks the file type, size, and that it is a real image.",
  },
  {
    title: "Let the AI remove the background",
    body: "The server runs the configured model. If that model is unavailable, the request fails instead of returning the original picture.",
  },
  {
    title: "Preview and download the result",
    body: "Compare the cutout, edit the background, then download a transparent PNG or a flattened JPG.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 mx-auto w-full max-w-6xl px-5 pt-4">
      <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-3xl border border-line bg-white p-5">
            <span className="text-sm font-semibold text-brand">0{index + 1}</span>
            <h3 className="mt-3 font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
