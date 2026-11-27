import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import { useEffect } from "react";
import appCss from "../styles.css?url";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { useAuthInit } from "@/hooks/use-auth";
import { useSettings } from "@/store/settings";
import { usePlugins } from "@/lib/plugins";
import { loadCustomUiTheme } from "@/store/editor";
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_OG_IMAGE_URL,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_WIDTH,
  DEFAULT_OG_IMAGE_HEIGHT,
  absoluteUrl,
} from "@/lib/seo";

const ROOT_TITLE = "DiapoLab – Open-Source Presentation & Slide Editor";
const ROOT_DESCRIPTION =
  "Design, animate, and present multipage slide decks right in your browser with DiapoLab. Import PowerPoint files and export to PDF, PPTX, HTML, or MP4.";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: import("@tanstack/react-router").ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-content gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: ROOT_TITLE },
      { name: "description", content: ROOT_DESCRIPTION },
      { name: "author", content: SITE_NAME },
      { name: "application-name", content: SITE_NAME },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#f5f4f1" },
      { property: "og:locale", content: "en_US" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:type", content: "website" },
      { property: "og:title", content: ROOT_TITLE },
      { property: "og:description", content: ROOT_DESCRIPTION },
      { property: "og:image", content: DEFAULT_OG_IMAGE_URL },
      { property: "og:image:alt", content: DEFAULT_OG_IMAGE_ALT },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: DEFAULT_OG_IMAGE_WIDTH },
      { property: "og:image:height", content: DEFAULT_OG_IMAGE_HEIGHT },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@diapolab" },
      { name: "twitter:title", content: ROOT_TITLE },
      { name: "twitter:description", content: ROOT_DESCRIPTION },
      { name: "twitter:image", content: DEFAULT_OG_IMAGE_URL },
      { name: "twitter:image:alt", content: DEFAULT_OG_IMAGE_ALT },
    ],
    links: [
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400..700&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Anton&family=Archivo+Black&family=Bebas+Neue&family=Bungee&family=Caveat:wght@500;700&family=Cinzel:wght@600;800&family=Cormorant+Garamond:wght@500;700&family=DM+Serif+Display&family=Fira+Code:wght@500;700&family=Fraunces:wght@500;700;900&family=Inter:wght@400;500;700;800;900&family=JetBrains+Mono:wght@500;700&family=Lobster&family=Major+Mono+Display&family=Montserrat:wght@500;700;900&family=Orbitron:wght@500;700;900&family=Pacifico&family=Permanent+Marker&family=Quicksand:wght@500;700&family=Roboto:wght@400;500;700&family=Playfair+Display:wght@600;800&family=Press+Start+2P&family=Rampart+One&family=Righteous&family=Russo+One&family=Shrikhand&family=Space+Grotesk:wght@500;700&family=Space+Mono:wght@400;700&family=Syne:wght@600;800&family=Tilt+Prism&family=Unbounded:wght@600;800&family=VT323&family=Zen+Dots&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
              logo: absoluteUrl("/favicon.svg"),
              sameAs: ["https://github.com/PNBPositron/DiapoLab"],
            },
            {
              "@type": "WebSite",
              name: SITE_NAME,
              url: SITE_URL,
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${SITE_URL}/marketplace?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useAuthInit();

  useEffect(() => {
    loadCustomUiTheme();
    void useSettings.persist.rehydrate();
    void usePlugins.persist.rehydrate();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Theme theme={neutralTheme} mode="system">
        <Outlet />
      </Theme>
    </QueryClientProvider>
  );
}
