const DEFAULT_SITE_URL = "https://diapolab.vercel.app";

function resolveSiteUrl(): string {
  const candidate =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) ||
    (typeof process !== "undefined" ? process.env?.APP_URL : undefined) ||
    DEFAULT_SITE_URL;
  return String(candidate).trim().replace(/\/+$/, "") || DEFAULT_SITE_URL;
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "DiapoLab";
export const DEFAULT_OG_IMAGE_PATH = "/screenshot.png";
export const DEFAULT_OG_IMAGE_URL = `${SITE_URL}${DEFAULT_OG_IMAGE_PATH}`;
export const DEFAULT_OG_IMAGE_ALT = "DiapoLab open-source presentation editor workspace";
export const DEFAULT_OG_IMAGE_WIDTH = "1576";
export const DEFAULT_OG_IMAGE_HEIGHT = "923";

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return cleanPath === "/" ? `${SITE_URL}/` : `${SITE_URL}${cleanPath}`;
}

export interface PageHeadOptions {
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article" | "profile";
  robots?: string;
  twitterCard?: "summary_large_image" | "summary";
  image?: string;
  imageAlt?: string;
  canonical?: boolean;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function buildPageHead({
  title,
  description,
  path,
  ogType = "website",
  robots = "index, follow",
  twitterCard = "summary_large_image",
  image = DEFAULT_OG_IMAGE_URL,
  imageAlt = DEFAULT_OG_IMAGE_ALT,
  canonical = true,
  jsonLd,
}: PageHeadOptions) {
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);
  const isDefaultImage = imageUrl === DEFAULT_OG_IMAGE_URL;

  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    { name: "robots", content: robots },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "en_US" },
    { property: "og:type", content: ogType },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { name: "twitter:card", content: twitterCard },
    { name: "twitter:site", content: "@diapolab" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];

  if (twitterCard === "summary_large_image" || image !== DEFAULT_OG_IMAGE_URL) {
    meta.push(
      { property: "og:image", content: imageUrl },
      { property: "og:image:alt", content: imageAlt },
      { name: "twitter:image", content: imageUrl },
      { name: "twitter:image:alt", content: imageAlt },
    );
    if (isDefaultImage) {
      meta.push(
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: DEFAULT_OG_IMAGE_WIDTH },
        { property: "og:image:height", content: DEFAULT_OG_IMAGE_HEIGHT },
      );
    }
  }

  const links = canonical ? [{ rel: "canonical", href: url }] : [];

  const scripts = jsonLd
    ? [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            Array.isArray(jsonLd)
              ? { "@context": "https://schema.org", "@graph": jsonLd }
              : { "@context": "https://schema.org", ...jsonLd },
          ),
        },
      ]
    : [];

  return { meta, links, scripts };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
