import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SettingsDialog } from "@/components/editor/SettingsDialog";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () =>
    buildPageHead({
      title: "Editor Settings – Customize DiapoLab Workspace",
      description:
        "Customize DiapoLab editor themes, toolbar colors, Liquid Glass chrome, workspace backgrounds, grid snapping, and reduced motion.",
      path: "/settings",
      twitterCard: "summary",
    }),
});

function SettingsPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-white">
      <h1 className="sr-only">DiapoLab settings</h1>
      <SettingsDialog onClose={() => navigate({ to: "/" })} />
    </main>
  );
}
