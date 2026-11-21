import { Link } from "../../lib/navigation";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>Solva removes backgrounds from one image at a time.</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
          <Link to="/about" className="hover:text-ink">
            About
          </Link>
          <Link to="/contact" className="hover:text-ink">
            Contact
          </Link>
          <Link to="/privacy" className="hover:text-ink">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-ink">
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
