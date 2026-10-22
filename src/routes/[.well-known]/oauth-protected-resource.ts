import { createFileRoute } from "@tanstack/react-router";

const mcpResourceMetadata = (request: Request) => {
  const origin = new URL(request.url).origin;
  const configuredSupabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const projectRef = configuredSupabaseUrl.match(/^https:\/\/([^.]+)\.supabase\.co/i)?.[1];
  const authorizationServer = projectRef
    ? `https://${projectRef}.supabase.co/auth/v1`
    : `${origin}/auth`;

  return new Response(
    JSON.stringify({
      resource: `${origin}/.mcp`,
      authorization_servers: [authorizationServer],
      bearer_methods_supported: ["header"],
      scopes_supported: ["openid", "email", "profile"],
    }),
    { headers: { "content-type": "application/json", "cache-control": "no-store" } },
  );
};

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: { GET: ({ request }) => mcpResourceMetadata(request), OPTIONS: ({ request }) => mcpResourceMetadata(request) },
  },
});
