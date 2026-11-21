import { BLOG_POSTS } from "../data/blogPosts";

type PageMeta = {
  title: string;
  description: string;
  path: string;
  canonical: string;
  robots: string;
  status: number;
  jsonLd: Record<string, unknown>[];
};

type RouteSeo = {
  pageTitle: string;
  description: string;
  index: boolean;
};

const SITE = "Solva";

const ROUTES: Record<string, RouteSeo> = {
  "/": {
    pageTitle: "Home",
    description: "Solva removes image backgrounds and gives you a transparent PNG to download.",
    index: true,
  },
  "/portrait": {
    pageTitle: "Portrait and passport photos",
    description:
      "Frame a cutout as a profile photo or a document size. Each official size stays attached to its source, and unverified sizes are marked.",
    index: true,
  },
  "/blog": {
    pageTitle: "Blog & Tutorials",
    description:
      "Actionable tutorials and guides on background removal, transparent PNGs, e-commerce product clipping, passport photos, and creator workflows.",
    index: true,
  },
  "/about": {
    pageTitle: "About",
    description:
      "Solva removes the background from one image. You upload a picture, the server runs the configured model, and you download a transparent PNG.",
    index: true,
  },
  "/contact": {
    pageTitle: "Contact",
    description: "How to reach the person running this Solva server. No contact form is shown unless an email is configured.",
    index: true,
  },
  "/privacy": {
    pageTitle: "Privacy",
    description: "How Solva handles uploads, optional accounts, result files, and advertising cookies.",
    index: true,
  },
  "/terms": {
    pageTitle: "Terms of Service",
    description: "Rules for using Solva to remove backgrounds from images you have the right to process.",
    index: true,
  },
  "/sign-in": {
    pageTitle: "Sign in to Solva",
    description: "Sign in to a Solva account. An account is optional. Guests can still remove a background and download it.",
    index: true,
  },
  "/register": {
    pageTitle: "Create a Solva account",
    description: "Create a Solva account. You can remove a background, preview it, and download it without signing in.",
    index: true,
  },
  "/forgot-password": {
    pageTitle: "Forgot password",
    description: "Email a password reset link if an account exists for that address.",
    index: false,
  },
  "/reset-password": {
    pageTitle: "Choose a new password",
    description: "Choose a new password from a one-time reset link.",
    index: false,
  },
  "/profile": {
    pageTitle: "Profile",
    description: "Your Solva profile. An account is optional.",
    index: false,
  },
  "/account": {
    pageTitle: "Account settings",
    description: "Update your name, change your password, or delete your Solva account.",
    index: false,
  },
  "/apps": {
    pageTitle: "Install Solva",
    description: "Install Solva on Android, iPhone, iPad, Windows, and macOS from the browser. No app store file is required.",
    index: true,
  },
};

for (const post of BLOG_POSTS) {
  ROUTES[`/blog/${post.slug}`] = {
    pageTitle: post.title,
    description: post.description,
    index: true,
  };
}

export const SITEMAP_PATHS = Object.entries(ROUTES)
  .filter(([, route]) => route.index)
  .map(([path]) => path);

export function formatDocumentTitle(pageTitle: string): string {
  return pageTitle === "Home" ? "Solva — Remove Image Backgrounds" : `${pageTitle} — Solva`;
}

function normalizePath(pathname: string): string {
  const path = pathname.split("?")[0]?.split("#")[0] || "/";
  if (path.length > 1 && path.endsWith("/")) return path.replace(/\/+$/, "");
  return path || "/";
}

export function resolvePageMeta(pathname: string, origin: string): PageMeta {
  const path = normalizePath(pathname);
  const route = ROUTES[path];
  const pageTitle = route?.pageTitle ?? "Page not found";
  const description = route?.description ?? "That page is not part of Solva.";
  const index = route?.index ?? false;
  const base = origin.replace(/\/$/, "");
  const canonical = `${base}${path}`;
  const title = formatDocumentTitle(pageTitle);
  const pageUrl = canonical;

  const webPage: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: SITE,
      url: `${base}/`,
    },
  };

  const jsonLd: Record<string, unknown>[] = [webPage];

  if (path === "/") {
    jsonLd.unshift(
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE,
        url: `${base}/`,
        description: ROUTES["/"]?.description,
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: SITE,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        url: `${base}/`,
        description: ROUTES["/"]?.description,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    );
  } else if (path.startsWith("/blog/")) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: pageTitle,
      description,
      url: pageUrl,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": pageUrl,
      },
      publisher: {
        "@type": "Organization",
        name: "FutureSolutionAI",
        url: "https://futuresolutionai.com",
      },
    });
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${base}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: `${base}/blog`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: pageTitle,
          item: pageUrl,
        },
      ],
    });
  } else if (route) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${base}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: pageTitle,
          item: pageUrl,
        },
      ],
    });
  }

  return {
    title,
    description,
    path,
    canonical,
    robots: index ? "index,follow" : "noindex,nofollow",
    status: route ? 200 : 404,
    jsonLd,
  };
}
