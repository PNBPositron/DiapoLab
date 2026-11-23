import { useEffect, useRef } from "react";
import type { Page } from "@/store/editor";
import type { ThreeSlideTransition } from "@/lib/motion-catalog";
import { renderMiniPreviewSlide, renderSlideToCanvas } from "@/lib/slide-texture";
import { ThreeSlideStage, type StageTheme } from "@/lib/three-stage";

export function ThreeTransitionStage({
  mode,
  transition,
  outgoingPage,
  incomingPage,
  canvasW,
  canvasH,
  playTrigger,
  interactive = false,
  resetSignal = 0,
  onTransitionComplete,
  className = "",
}: {
  mode: "present" | "mini";
  transition: ThreeSlideTransition;
  outgoingPage?: Page;
  incomingPage?: Page;
  canvasW: number;
  canvasH: number;
  playTrigger: number;
  interactive?: boolean;
  resetSignal?: number;
  onTransitionComplete?: () => void;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<ThreeSlideStage | null>(null);
  const mountedRef = useRef(false);
  const onCompleteRef = useRef(onTransitionComplete);
  onCompleteRef.current = onTransitionComplete;

  const initialPropsRef = useRef({
    mode,
    transition,
    outgoingPage,
    incomingPage,
    canvasW,
    canvasH,
    interactive,
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const init = initialPropsRef.current;
    const theme: StageTheme = init.mode === "mini" ? "studio-light" : "studio-dark";
    const aspect = Math.max(0.5, init.canvasW / Math.max(1, init.canvasH));
    const texW = init.mode === "mini" ? 512 : 1024;
    const texH = Math.max(256, Math.round(texW / aspect));

    let disposed = false;
    const buildCanvases = (onAsset?: () => void) => {
      const useMiniDemo = init.mode === "mini" && !init.incomingPage;
      const outCanvas = useMiniDemo
        ? renderMiniPreviewSlide("outgoing", texW, texH)
        : renderSlideToCanvas(init.outgoingPage ?? init.incomingPage, init.canvasW, init.canvasH, texW, texH, onAsset);
      const inCanvas = useMiniDemo
        ? renderMiniPreviewSlide("incoming", texW, texH)
        : renderSlideToCanvas(init.incomingPage, init.canvasW, init.canvasH, texW, texH, onAsset);
      return { outCanvas, inCanvas };
    };

    const refreshOnAsset = () => {
      if (disposed || !stageRef.current) return;
      const { outCanvas, inCanvas } = buildCanvases();
      stageRef.current.updateTextures(outCanvas, inCanvas);
    };

    const { outCanvas, inCanvas } = buildCanvases(refreshOnAsset);
    const stage = new ThreeSlideStage(host, outCanvas, inCanvas, aspect, theme, {
      onTransitionComplete: () => onCompleteRef.current?.(),
    });
    stageRef.current = stage;
    mountedRef.current = true;
    stage.setInteractive(init.interactive || init.mode === "mini");
    stage.playTransition(init.transition, {
      duration: init.mode === "mini" ? 1.45 : 1.28,
      loop: init.mode === "mini",
    });

    return () => {
      disposed = true;
      mountedRef.current = false;
      stageRef.current = null;
      stage.dispose();
    };
  }, []);

  // Re-rasterize slide textures and trigger transition whenever pages or playTrigger change
  useEffect(() => {
    if (!mountedRef.current) return;
    const stage = stageRef.current;
    if (!stage) return;
    const aspect = Math.max(0.5, canvasW / Math.max(1, canvasH));
    const texW = mode === "mini" ? 512 : 1024;
    const texH = Math.max(256, Math.round(texW / aspect));

    let cancelled = false;
    const refreshTextures = () => {
      if (cancelled || !stageRef.current) return;
      const useMiniDemo = mode === "mini" && !incomingPage;
      const outCanvas = useMiniDemo
        ? renderMiniPreviewSlide("outgoing", texW, texH)
        : renderSlideToCanvas(outgoingPage ?? incomingPage, canvasW, canvasH, texW, texH, refreshTextures);
      const inCanvas = useMiniDemo
        ? renderMiniPreviewSlide("incoming", texW, texH)
        : renderSlideToCanvas(incomingPage, canvasW, canvasH, texW, texH, refreshTextures);
      stageRef.current.updateTextures(outCanvas, inCanvas);
    };

    refreshTextures();
    stage.playTransition(transition, {
      duration: mode === "mini" ? 1.45 : 1.28,
      loop: mode === "mini",
    });

    return () => {
      cancelled = true;
    };
  }, [mode, transition, outgoingPage, incomingPage, canvasW, canvasH, playTrigger]);

  useEffect(() => {
    stageRef.current?.setInteractive(interactive || mode === "mini");
  }, [interactive, mode]);

  useEffect(() => {
    if (resetSignal > 0) {
      stageRef.current?.resetCamera();
    }
  }, [resetSignal]);

  return (
    <div
      ref={hostRef}
      className={className}
      aria-label={`Three.js ${transition.replace("3d-", "3D ")} stage`}
    />
  );
}
