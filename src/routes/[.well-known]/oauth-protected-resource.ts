import { createFileRoute } from "@tanstack/react-router";

const oauthProtectedResource = ({ request }: { request: Request }) => {
  const origin = new URL(request.url).origin;
  return Response.json({
    resource: `${origin}/.mcp`,
    scopes_supported: [],
    bearer_methods_supported: ["header"],
  });
};

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: { GET: oauthProtectedResource },
  },
});
