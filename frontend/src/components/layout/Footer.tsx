import { Link } from "../../lib/navigation";
import { EcosystemSection } from "./EcosystemSection";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-paper/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-10">
        <EcosystemSection compact />

        <div className="flex flex-col gap-4 border-t border-line/60 pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Solva removes backgrounds from one image at a time. Fast, free, and private.
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
            <Link to="/about" className="transition-colors hover:text-ink">
              About
            </Link>
            <Link to="/blog" className="transition-colors hover:text-ink">
              Blog
            </Link>
            <Link to="/contact" className="transition-colors hover:text-ink">
              Contact
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-ink">
              Privacy Policy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-ink">
              Terms of Service
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
