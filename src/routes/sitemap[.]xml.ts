import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/seo";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/marketplace", changefreq: "daily", priority: "0.9" },
          { path: "/wiki", changefreq: "weekly", priority: "0.8" },
          { path: "/mcp-guide", changefreq: "monthly", priority: "0.6" },
          { path: "/license", changefreq: "yearly", priority: "0.4" },
          { path: "/privacypolicy", changefreq: "yearly", priority: "0.4" },
          { path: "/settings", changefreq: "monthly", priority: "0.3" },
          { path: "/auth", changefreq: "monthly", priority: "0.3" },
        ];

        try {
          const { data } = await supabase
            .from("public_templates")
            .select("id, created_at")
            .order("created_at", { ascending: false })
            .limit(200);
          for (const row of (data ?? []) as Array<{ id: string; created_at?: string | null }>) {
            if (!row?.id) continue;
            const lastmod = row.created_at ? row.created_at.slice(0, 10) : undefined;
            entries.push({
              path: `/t/${encodeURIComponent(row.id)}`,
              lastmod,
              changefreq: "weekly",
              priority: "0.7",
            });
          }
        } catch {
          // Serve static sitemap entries cleanly if public_templates is unreachable.
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${escapeXml(`${SITE_URL}${e.path}`)}</loc>`,
            e.lastmod ? `    <lastmod>${escapeXml(e.lastmod)}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
