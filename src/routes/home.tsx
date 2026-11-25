import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/home")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "DiapoLab — The visual workspace for expressive decks" },
      { name: "description", content: "Design, search, version, and publish expressive presentations with DiapoLab." },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
});

function HomePage() {
  return <Navigate to="/" />;
}

