import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { useAuthInit } from "@/hooks/use-auth";

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
      { title: "DiapoLab-The Next-Generation Open-Source Presentation Editor" },
      { name: "description", content: "DiapoLab is a focused workspace for creating polished multipage presentations." },
      { name: "author", content: "DiapoLab" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#f5f4f1" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { property: "og:title", content: "DiapoLab — Design workspace" },
      { property: "og:description", content: "DiapoLab is a focused workspace for creating polished multipage presentations." },
      { property: "og:site_name", content: "DiapoLab" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://diapolab.vercel.app/screenshot.png" },
      { property: "og:image", content: "https://diapolab.vercel.app/screenshot.png" },
      { name: "twitter:site", content: "@diapolab" },
      { name: "twitter:title", content: "DiapoLab — Design workspace" },
      { name: "twitter:description", content: "DiapoLab is a focused workspace for creating polished multipage presentations." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&family=JetBrains+Mono:wght@400..800&family=Unica+One&display=swap",
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
              name: "DiapoLab",
              url: "https://diapolab.vercel.app",
              logo: "https://diapolab.vercel.app/favicon.ico",
            },
            {
              "@type": "WebSite",
              name: "DiapoLab",
              url: "https://diapolab.vercel.app",
            },
            {
              "@type": "WebApplication",
              name: "DiapoLab",
              url: "https://diapolab.vercel.app",
              applicationCategory: "DesignApplication",
              operatingSystem: "Web",
              description: "Open-source editor for creating, presenting and sharing multipage decks.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
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

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
