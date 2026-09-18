import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SettingsDialog } from "@/components/editor/SettingsDialog";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — DiapoLab" },
      {
        name: "description",
        content: "Customize DiapoLab editor behavior, AI features, panels, motion, and themes.",
      },
      { property: "og:title", content: "Settings — DiapoLab" },
      { property: "og:description", content: "Customize your DiapoLab design editor experience." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://positronstudio.lovable.app/settings" }],
  }),
});

function SettingsPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-ink">
      <h1 className="sr-only">DiapoLab settings</h1>
      <SettingsDialog onClose={() => navigate({ to: "/" })} />
    </main>
  );
}
