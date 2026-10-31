import { useState } from "react";
import { Camera, Sparkles, Shapes } from "lucide-react";
import { PanelHeader, SegmentedControl } from "../ui/selectors";
import { UnsplashPanel } from "./UnsplashPanel";
import { IllustrationsPanel } from "./IllustrationsPanel";
import { IconsPanel } from "./IconsPanel";

type LibTab = "photos" | "illus" | "icons";

/**
 * LibraryPanel — Unsplash photos and illustrations merged into one tool.
 * Same structure as the other panels: PanelHeader, shared SegmentedControl
 * tabs, then the active content below.
 */
export function LibraryPanel() {
  const [tab, setTab] = useState<LibTab>("photos");

  return (
    <div className="space-y-4">
      <PanelHeader
        kicker="Library"
        title="Photos & illustrations"
        description="Free Unsplash photos, illustrations, and recolorable vector icons."
        icon={Camera}
      />

      <div className="px-4">
        <SegmentedControl
          label="Library content"
          value={tab}
          onChange={setTab}
          options={[
            { value: "photos", label: "Photos", icon: Camera, title: "Unsplash photos" },
            { value: "illus", label: "Illus.", icon: Sparkles, title: "Highlights, characters & 3D icons" },
            { value: "icons", label: "Icons", icon: Shapes, title: "Recolorable vector icons" },
          ]}
        />
      </div>

      {tab === "photos" ? (
        <UnsplashPanel embedded />
      ) : tab === "illus" ? (
        <IllustrationsPanel embedded />
      ) : (
        <IconsPanel embedded />
      )}
    </div>
  );
}

export default LibraryPanel;
