import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { ThreeSlideTransition } from "./motion-catalog";

export type StageTheme = "studio-dark" | "studio-light";

export type ThreeStageCallbacks = {
  onProgress?: (progress: number) => void;
  onTransitionComplete?: () => void;
};

// Module-scope scratch math objects — zero allocations inside tick().
const _vec3A = new THREE.Vector3();
const _dummy = new THREE.Object3D();

export function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement("canvas");
    const gl = (probeCanvas.getContext("webgl2") ?? probeCanvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return true;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const rawRenderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? "") : "";
    const isSoftware = /SwiftShader|llvmpipe|Software Rasterizer|WARP/i.test(rawRenderer);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return isSoftware;
  } catch {
    return true;
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function createStudioFloorTexture(theme: StageTheme, maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const isDark = theme === "studio-dark";
    const grad = ctx.createRadialGradient(size / 2, size / 2, 16, size / 2, size / 2, size * 0.5);
    grad.addColorStop(0, isDark ? "#1a2438" : "#f8fafc");
    grad.addColorStop(0.55, isDark ? "#101726" : "#eef2f8");
    grad.addColorStop(1, isDark ? "#080c14" : "#e5ebf3");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle concentric technical calibration rings
    ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.1)" : "rgba(100, 116, 139, 0.12)";
    ctx.lineWidth = 1.5;
    for (const r of [96, 158, 218]) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 12, size / 2, size / 2, size * 0.48);
    grad.addColorStop(0, "rgba(2, 6, 23, 0.62)");
    grad.addColorStop(0.45, "rgba(2, 6, 23, 0.28)");
    grad.addColorStop(1, "rgba(2, 6, 23, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createRoundedFrameShape(w: number, h: number, radius: number, holeInset: number): THREE.Shape {
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(radius, hw * 0.4, hh * 0.4);
  const outer = new THREE.Shape();
  outer.moveTo(-hw + r, -hh);
  outer.lineTo(hw - r, -hh);
  outer.quadraticCurveTo(hw, -hh, hw, -hh + r);
  outer.lineTo(hw, hh - r);
  outer.quadraticCurveTo(hw, hh, hw - r, hh);
  outer.lineTo(-hw + r, hh);
  outer.quadraticCurveTo(-hw, hh, -hw, hh - r);
  outer.lineTo(-hw, -hh + r);
  outer.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  const iw = Math.max(0.2, hw - holeInset);
  const ih = Math.max(0.2, hh - holeInset);
  const ir = Math.max(0.02, r - holeInset * 0.5);
  const hole = new THREE.Path();
  hole.moveTo(-iw + ir, -ih);
  hole.lineTo(iw - ir, -ih);
  hole.quadraticCurveTo(iw, -ih, iw, -ih + ir);
  hole.lineTo(iw, ih - ir);
  hole.quadraticCurveTo(iw, ih, iw - ir, ih);
  hole.lineTo(-iw + ir, ih);
  hole.quadraticCurveTo(-iw, ih, -iw, ih - ir);
  hole.lineTo(-iw, -ih + ir);
  hole.quadraticCurveTo(-iw, -ih, -iw + ir, -ih);
  outer.holes.push(hole);
  return outer;
}

function createCornerBracketShape(arm: number, thickness: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(arm, 0);
  s.lineTo(arm, thickness);
  s.lineTo(thickness, thickness);
  s.lineTo(thickness, arm);
  s.lineTo(0, arm);
  s.closePath();
  return s;
}

type SlideAssembly = {
  group: THREE.Group;
  faceMaterial: THREE.MeshStandardMaterial;
  dispose: () => void;
};

/**
 * Builds an 8-part procedural 3D slide assembly:
 *  1. Beveled metallic outer chassis (ExtrudeGeometry)
 *  2. Matte inner bezel trim (distinct roughness delta >= 0.45)
 *  3. Recessed slide display face (CanvasTexture PBR + subtle self-illumination)
 *  4. Machined rear backing plate (so 3D flips reveal finished back hardware)
 *  5-8. Four chamfered corner accent brackets
 */
function createSlideAssembly(
  slideW: number,
  slideH: number,
  texture: THREE.CanvasTexture,
  isDarkTheme: boolean,
): SlideAssembly {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const frameBorder = 0.085;
  const outerW = slideW + frameBorder * 2;
  const outerH = slideH + frameBorder * 2;

  // 1. Beveled anodized outer chassis
  const outerShape = createRoundedFrameShape(outerW, outerH, 0.09, frameBorder * 0.62);
  const chassisGeo = new THREE.ExtrudeGeometry(outerShape, {
    depth: 0.075,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.016,
    bevelSegments: 3,
    curveSegments: 8,
  });
  chassisGeo.translate(0, 0, -0.0375);
  const chassisMat = new THREE.MeshStandardMaterial({
    color: isDarkTheme ? 0x3b475d : 0xd5dce6,
    metalness: 0.84,
    roughness: 0.24,
  });
  const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  group.add(chassisMesh);
  disposables.push(chassisGeo, chassisMat);

  // 2. Matte recessed inner bezel
  const bezelShape = createRoundedFrameShape(
    outerW - frameBorder * 0.9,
    outerH - frameBorder * 0.9,
    0.055,
    frameBorder * 0.52,
  );
  const bezelGeo = new THREE.ExtrudeGeometry(bezelShape, {
    depth: 0.04,
    bevelEnabled: false,
    curveSegments: 6,
  });
  bezelGeo.translate(0, 0, -0.012);
  const bezelMat = new THREE.MeshStandardMaterial({
    color: isDarkTheme ? 0x111827 : 0x334155,
    metalness: 0.12,
    roughness: 0.76,
  });
  const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
  group.add(bezelMesh);
  disposables.push(bezelGeo, bezelMat);

  // 3. Recessed slide display face
  const faceGeo = new THREE.PlaneGeometry(slideW, slideH);
  const faceMat = new THREE.MeshStandardMaterial({
    map: texture,
    emissive: 0xffffff,
    emissiveMap: texture,
    emissiveIntensity: isDarkTheme ? 0.36 : 0.24,
    roughness: 0.42,
    metalness: 0.03,
  });
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.position.z = 0.022;
  faceMesh.receiveShadow = true;
  group.add(faceMesh);
  disposables.push(faceGeo, faceMat);

  // 4. Precision rear backing slate
  const backGeo = new THREE.BoxGeometry(slideW + 0.05, slideH + 0.05, 0.03);
  const backMat = new THREE.MeshStandardMaterial({
    color: isDarkTheme ? 0x1e293b : 0x94a3b8,
    metalness: 0.48,
    roughness: 0.56,
  });
  const backMesh = new THREE.Mesh(backGeo, backMat);
  backMesh.position.z = -0.022;
  backMesh.castShadow = true;
  group.add(backMesh);
  disposables.push(backGeo, backMat);

  // 5-8. Four machined corner brackets
  const bracketGeo = new THREE.ExtrudeGeometry(createCornerBracketShape(0.24, 0.042), {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.006,
    bevelSegments: 2,
  });
  const bracketMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    metalness: 0.88,
    roughness: 0.2,
  });
  disposables.push(bracketGeo, bracketMat);

  const bx = outerW / 2 + 0.012;
  const by = outerH / 2 + 0.012;
  const corners: Array<{ x: number; y: number; rz: number }> = [
    { x: -bx, y: -by, rz: 0 },
    { x: bx, y: -by, rz: Math.PI / 2 },
    { x: bx, y: by, rz: Math.PI },
    { x: -bx, y: by, rz: -Math.PI / 2 },
  ];
  for (const c of corners) {
    const m = new THREE.Mesh(bracketGeo, bracketMat);
    m.position.set(c.x, c.y, 0.036);
    m.rotation.z = c.rz;
    group.add(m);
  }

  return {
    group,
    faceMaterial: faceMat,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

export class ThreeSlideStage {
  readonly isSoftwareGl: boolean;
  private container: HTMLElement;
  private theme: StageTheme;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envRenderTarget: THREE.WebGLRenderTarget;
  private outgoingTex: THREE.CanvasTexture;
  private incomingTex: THREE.CanvasTexture;
  private floorTex: THREE.CanvasTexture;
  private shadowTex: THREE.CanvasTexture;

  private stageRig: THREE.Group;
  private outgoingPanel: SlideAssembly;
  private incomingPanel: SlideAssembly;
  private pedestalGroup: THREE.Group;
  private motes: THREE.InstancedMesh;
  private moteCount = 32;
  private moteAngles: Float32Array;
  private moteRadii: Float32Array;
  private moteHeights: Float32Array;
  private moteSpeeds: Float32Array;

  private disposables: Array<{ dispose: () => void }> = [];
  private resizeObserver: ResizeObserver;

  private transitionKind: ThreeSlideTransition = "3d-cube";
  private slideAspect = 16 / 9;
  private slideW = 3.55;
  private slideH = 2.0;

  private animDuration = 1.05;
  private animElapsed = 0;
  private playing = false;
  private loopContinuously = false;
  private completedNotified = false;
  private callbacks: ThreeStageCallbacks;

  // Interactive camera orbit state (damped towards target)
  private orbitYaw = 0;
  private orbitPitch = 0;
  private targetYaw = 0;
  private targetPitch = 0;
  private orbitZoom = 1;
  private targetZoom = 1;
  private dragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private interactive = false;

  // Frame pacing & coalesced demand rendering
  private disposed = false;
  private rafId = 0;
  private timerId = 0;
  private lastFrameMs = 0;
  private renderQueued = false;
  private idleSpinTime = 0;

  constructor(
    container: HTMLElement,
    outgoingCanvas: HTMLCanvasElement,
    incomingCanvas: HTMLCanvasElement,
    aspectRatio: number,
    theme: StageTheme = "studio-dark",
    callbacks: ThreeStageCallbacks = {},
  ) {
    this.container = container;
    this.theme = theme;
    this.callbacks = callbacks;
    this.slideAspect = Math.max(0.45, Math.min(2.6, aspectRatio || 16 / 9));
    this.slideH = 2.05;
    this.slideW = this.slideH * this.slideAspect;
    if (this.slideW > 3.85) {
      this.slideW = 3.85;
      this.slideH = this.slideW / this.slideAspect;
    }

    this.isSoftwareGl = detectSoftwareWebGL();
    const isDark = theme === "studio-dark";

    const width = Math.max(2, container.clientWidth);
    const height = Math.max(2, container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const dom = this.renderer.domElement;
    dom.style.width = "100%";
    dom.style.height = "100%";
    dom.style.display = "block";
    dom.style.touchAction = "none";
    container.appendChild(dom);

    this.scene = new THREE.Scene();
    const bgHex = isDark ? 0x090d16 : 0xedf2f8;
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.FogExp2(bgHex, isDark ? 0.058 : 0.048);

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 60);
    this.camera.position.set(0, 0.18, 4.45);
    this.camera.lookAt(0, 0, 0);

    // Studio IBL environment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 3-point PBR studio lighting (same intensities across all devices)
    const hemi = new THREE.HemisphereLight(isDark ? 0xc7d9ff : 0xffffff, isDark ? 0x1e293b : 0xcbd5e1, 0.9);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
    keyLight.position.set(3.6, 5.4, 4.8);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 16;
      keyLight.shadow.camera.left = -4;
      keyLight.shadow.camera.right = 4;
      keyLight.shadow.camera.top = 3;
      keyLight.shadow.camera.bottom = -3;
    }
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.05);
    rimLight.position.set(-4.2, 2.4, -3.5);
    this.scene.add(rimLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // Grounded studio floor + contact shadow
    this.floorTex = createStudioFloorTexture(theme, maxAniso);
    const floorGeo = new THREE.CircleGeometry(10, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.floorTex,
      roughness: 0.78,
      metalness: 0.08,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -this.slideH * 0.64 - 0.16;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);
    this.disposables.push(floorGeo, floorMat, this.floorTex);

    this.shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(this.slideW * 1.45, 2.1);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: isDark ? 0.8 : 0.36,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = floorMesh.position.y + 0.005;
    this.scene.add(shadowMesh);
    this.disposables.push(shadowGeo, shadowMat, this.shadowTex);

    // Lathe-turned studio pedestal ring beneath the floating slides
    this.pedestalGroup = this.buildPedestal(floorMesh.position.y + 0.01, isDark);
    this.scene.add(this.pedestalGroup);

    // Slide CanvasTextures
    this.outgoingTex = this.makeSlideTexture(outgoingCanvas, maxAniso);
    this.incomingTex = this.makeSlideTexture(incomingCanvas, maxAniso);

    // Stage Rig & composite 8-part slide assemblies
    this.stageRig = new THREE.Group();
    this.scene.add(this.stageRig);

    this.outgoingPanel = createSlideAssembly(this.slideW, this.slideH, this.outgoingTex, isDark);
    this.incomingPanel = createSlideAssembly(this.slideW, this.slideH, this.incomingTex, isDark);
    this.stageRig.add(this.outgoingPanel.group, this.incomingPanel.group);

    // Instanced floating calibration prisms
    const moteGeo = new THREE.OctahedronGeometry(0.038, 0);
    const moteMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x60a5fa : 0x2563eb,
      metalness: 0.85,
      roughness: 0.22,
      emissive: isDark ? 0x1d4ed8 : 0x3b82f6,
      emissiveIntensity: 0.35,
    });
    this.motes = new THREE.InstancedMesh(moteGeo, moteMat, this.moteCount);
    this.moteAngles = new Float32Array(this.moteCount);
    this.moteRadii = new Float32Array(this.moteCount);
    this.moteHeights = new Float32Array(this.moteCount);
    this.moteSpeeds = new Float32Array(this.moteCount);
    for (let i = 0; i < this.moteCount; i++) {
      this.moteAngles[i] = (i / this.moteCount) * Math.PI * 2;
      this.moteRadii[i] = 2.5 + (i % 5) * 0.38;
      this.moteHeights[i] = ((i % 7) - 3) * 0.36;
      this.moteSpeeds[i] = 0.22 + (i % 4) * 0.09;
    }
    this.updateMotes(0);
    this.motes.computeBoundingSphere();
    this.scene.add(this.motes);
    this.disposables.push(moteGeo, moteMat);

    // Resize handling
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    // Pointer interaction for interactive orbit/inspect
    dom.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    dom.addEventListener("wheel", this.onWheel, { passive: false });

    this.applyTransitionPose(0);
    this.requestRender();
  }

  private buildPedestal(yBase: number, isDark: boolean): THREE.Group {
    const group = new THREE.Group();
    const pts = [
      new THREE.Vector2(0.01, 0),
      new THREE.Vector2(1.42, 0),
      new THREE.Vector2(1.36, 0.045),
      new THREE.Vector2(1.12, 0.06),
      new THREE.Vector2(1.06, 0.09),
      new THREE.Vector2(0.01, 0.09),
    ];
    const plinthGeo = new THREE.LatheGeometry(pts, 48);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x1e293b : 0xdbe2ec,
      metalness: 0.42,
      roughness: 0.62,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = yBase;
    plinth.receiveShadow = true;
    group.add(plinth);

    const ringGeo = new THREE.TorusGeometry(1.18, 0.012, 12, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.88,
      roughness: 0.2,
      emissive: 0x2563eb,
      emissiveIntensity: isDark ? 0.55 : 0.25,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = yBase + 0.075;
    group.add(ring);

    this.disposables.push(plinthGeo, plinthMat, ringGeo, ringMat);
    return group;
  }

  private makeSlideTexture(canvas: HTMLCanvasElement, maxAniso: number): THREE.CanvasTexture {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  updateTextures(outgoingCanvas?: HTMLCanvasElement, incomingCanvas?: HTMLCanvasElement) {
    if (this.disposed) return;
    if (outgoingCanvas) {
      this.outgoingTex.image = outgoingCanvas;
      this.outgoingTex.needsUpdate = true;
    }
    if (incomingCanvas) {
      this.incomingTex.image = incomingCanvas;
      this.incomingTex.needsUpdate = true;
    }
    this.requestRender();
  }

  setInteractive(enabled: boolean) {
    this.interactive = enabled;
    if (enabled) {
      this.startLoop();
    } else {
      this.targetYaw = 0;
      this.targetPitch = 0;
      this.targetZoom = 1;
      this.requestRender();
    }
  }

  resetCamera() {
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.targetZoom = 1;
    this.requestRender();
  }

  playTransition(
    kind: ThreeSlideTransition,
    options: { duration?: number; loop?: boolean } = {},
  ) {
    this.transitionKind = kind;
    this.animDuration = Math.max(0.4, options.duration ?? 1.05);
    this.loopContinuously = !!options.loop;
    this.animElapsed = 0;
    this.completedNotified = false;
    this.playing = true;
    this.applyTransitionPose(0);
    this.startLoop();
  }

  private updateMotes(timeSec: number) {
    for (let i = 0; i < this.moteCount; i++) {
      const angle = this.moteAngles[i] + timeSec * this.moteSpeeds[i];
      const r = this.moteRadii[i];
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r * 0.72 - 0.8;
      const y = this.moteHeights[i] + Math.sin(timeSec * 1.4 + i) * 0.08;
      _dummy.position.set(x, y, z);
      _dummy.rotation.set(timeSec * 0.7 + i, timeSec * 0.5 + i * 0.3, 0);
      const s = 0.75 + 0.35 * Math.sin(timeSec * 1.8 + i * 1.1);
      _dummy.scale.setScalar(s);
      _dummy.updateMatrix();
      this.motes.setMatrixAt(i, _dummy.matrix);
    }
    this.motes.instanceMatrix.needsUpdate = true;
  }

  private applyTransitionPose(rawProgress: number) {
    const t = Math.max(0, Math.min(1, rawProgress));
    const e = easeInOutCubic(t);
    const eOut = easeOutCubic(t);

    // Reset both panels
    this.stageRig.position.set(0, 0, 0);
    this.stageRig.rotation.set(0, 0, 0);
    this.stageRig.scale.set(1, 1, 1);

    this.outgoingPanel.group.visible = true;
    this.incomingPanel.group.visible = true;
    this.outgoingPanel.group.position.set(0, 0, 0);
    this.outgoingPanel.group.rotation.set(0, 0, 0);
    this.outgoingPanel.group.scale.set(1, 1, 1);
    this.incomingPanel.group.position.set(0, 0, 0);
    this.incomingPanel.group.rotation.set(0, 0, 0);
    this.incomingPanel.group.scale.set(1, 1, 1);

    const w = this.slideW;
    const halfW = w / 2;

    if (this.transitionKind === "3d-cube") {
      // Two panels form a 90-degree precision prism corner rotated around center
      this.outgoingPanel.group.position.set(0, 0, halfW);
      this.outgoingPanel.group.rotation.set(0, 0, 0);

      this.incomingPanel.group.position.set(halfW, 0, 0);
      this.incomingPanel.group.rotation.set(0, Math.PI / 2, 0);

      // Pivot rig back slightly during mid-swing so corner never clips camera
      const swingZ = -Math.sin(e * Math.PI) * 0.75;
      this.stageRig.position.set(0, 0, -halfW + swingZ);
      this.stageRig.rotation.y = -e * (Math.PI / 2);
      this.stageRig.rotation.x = Math.sin(e * Math.PI) * 0.08;
    } else if (this.transitionKind === "3d-carousel") {
      const radius = w * 0.92;
      const outAngle = -e * (Math.PI * 0.65);
      const inAngle = (1 - e) * (Math.PI * 0.65);

      this.outgoingPanel.group.position.set(
        Math.sin(outAngle) * radius,
        Math.sin(e * Math.PI) * 0.08,
        Math.cos(outAngle) * radius - radius,
      );
      this.outgoingPanel.group.rotation.y = outAngle * 0.88;
      this.outgoingPanel.group.scale.setScalar(1 - e * 0.16);

      this.incomingPanel.group.position.set(
        Math.sin(inAngle) * radius,
        0,
        Math.cos(inAngle) * radius - radius,
      );
      this.incomingPanel.group.rotation.y = inAngle * 0.88;
      this.incomingPanel.group.scale.setScalar(0.84 + e * 0.16);
    } else if (this.transitionKind === "3d-flip") {
      // Double-sided turntable flip: outgoing on front (+Y rot 0..PI), incoming on back
      const angle = e * Math.PI;
      const pull = Math.sin(e * Math.PI) * 0.65;
      this.stageRig.position.set(0, 0, -pull);
      this.stageRig.rotation.y = angle;
      this.stageRig.rotation.x = Math.sin(e * Math.PI) * 0.12;

      this.outgoingPanel.group.position.set(0, 0, 0.045);
      this.outgoingPanel.group.rotation.y = 0;
      this.outgoingPanel.group.visible = angle < Math.PI * 0.52;

      this.incomingPanel.group.position.set(0, 0, -0.045);
      this.incomingPanel.group.rotation.y = Math.PI;
      this.incomingPanel.group.visible = angle >= Math.PI * 0.48;
    } else if (this.transitionKind === "3d-fold") {
      // Outgoing swings open like a hinged slate to the left; incoming unfolds from right depth
      const outPivotX = -halfW;
      const outAngle = -e * 1.95;
      this.outgoingPanel.group.position.set(
        outPivotX + Math.cos(outAngle) * halfW,
        0,
        -Math.sin(outAngle) * halfW - e * 0.6,
      );
      this.outgoingPanel.group.rotation.y = outAngle;
      this.outgoingPanel.group.visible = t < 0.94;

      const inAngle = (1 - eOut) * 1.38;
      this.incomingPanel.group.position.set(
        halfW - Math.cos(inAngle) * halfW,
        0,
        -Math.sin(inAngle) * halfW - (1 - eOut) * 0.35,
      );
      this.incomingPanel.group.rotation.y = -inAngle;
    } else if (this.transitionKind === "3d-helix") {
      // Helical orbital fly-by with staggered depth & tilt
      const outRot = -e * 1.45;
      this.outgoingPanel.group.position.set(-e * 3.1, e * 0.9, -e * 2.4);
      this.outgoingPanel.group.rotation.set(e * 0.25, outRot, e * 0.18);
      this.outgoingPanel.group.scale.setScalar(Math.max(0.45, 1 - e * 0.52));
      this.outgoingPanel.group.visible = t < 0.92;

      const inv = 1 - eOut;
      this.incomingPanel.group.position.set(inv * 2.9, -inv * 0.85, -inv * 2.8);
      this.incomingPanel.group.rotation.set(-inv * 0.32, inv * 1.65, -inv * 0.22);
      this.incomingPanel.group.scale.setScalar(0.55 + eOut * 0.45);
    }
  }

  private handleResize() {
    if (this.disposed) return;
    const width = Math.max(2, this.container.clientWidth);
    const height = Math.max(2, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.requestRender();
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!this.interactive && !this.loopContinuously) return;
    this.dragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.startLoop();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.targetYaw = Math.max(-1.1, Math.min(1.1, this.targetYaw + dx * 0.006));
    this.targetPitch = Math.max(-0.55, Math.min(0.65, this.targetPitch + dy * 0.005));
    this.requestRender();
  };

  private onPointerUp = () => {
    this.dragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.interactive) return;
    e.preventDefault();
    this.targetZoom = Math.max(0.68, Math.min(1.65, this.targetZoom * Math.exp(e.deltaY * 0.001)));
    this.startLoop();
  };

  private scheduleNextStep() {
    if (this.disposed) return;
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (this.isSoftwareGl && typeof gl.fenceSync === "function") {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        this.timerId = window.setTimeout(this.tick, 16);
        return;
      }
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          gl.deleteSync(sync);
          return;
        }
        const status = gl.clientWaitSync(sync, 0, 0);
        if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
          gl.deleteSync(sync);
          this.timerId = window.setTimeout(this.tick, 0);
        } else {
          this.timerId = window.setTimeout(poll, 4);
        }
      };
      this.timerId = window.setTimeout(poll, 0);
    } else {
      this.rafId = window.requestAnimationFrame(this.tick);
    }
  }

  private startLoop() {
    if (this.disposed) return;
    if (this.rafId || this.timerId) return;
    this.lastFrameMs = performance.now();
    this.scheduleNextStep();
  }

  requestRender() {
    if (this.disposed || this.renderQueued) return;
    if (this.rafId || this.timerId) return;
    this.renderQueued = true;
    window.requestAnimationFrame(() => {
      this.renderQueued = false;
      if (this.disposed) return;
      this.renderOnce(0.016);
    });
  }

  private renderOnce(dt: number) {
    const damp = 1 - Math.exp(-10 * dt);
    this.orbitYaw += (this.targetYaw - this.orbitYaw) * damp;
    this.orbitPitch += (this.targetPitch - this.orbitPitch) * damp;
    this.orbitZoom += (this.targetZoom - this.orbitZoom) * damp;

    // Fit camera distance to container aspect so slide fills viewport cleanly
    const aspect = Math.max(0.4, this.camera.aspect);
    const vFovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const halfV = this.slideH * 0.56;
    const halfH = (this.slideW * 0.56) / aspect;
    const baseDist = Math.max(halfV / Math.tan(vFovRad / 2), halfH / Math.tan(vFovRad / 2)) * 1.18;
    const dist = baseDist * this.orbitZoom;

    const pitchOffset = 0.08 + this.orbitPitch;
    _vec3A.set(
      Math.sin(this.orbitYaw) * Math.cos(pitchOffset) * dist,
      Math.sin(pitchOffset) * dist,
      Math.cos(this.orbitYaw) * Math.cos(pitchOffset) * dist,
    );
    this.camera.position.copy(_vec3A);
    this.camera.lookAt(0, 0, 0);

    this.idleSpinTime += dt;
    this.updateMotes(this.idleSpinTime);
    this.renderer.render(this.scene, this.camera);
  }

  private tick = () => {
    this.rafId = 0;
    this.timerId = 0;
    if (this.disposed) return;

    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameMs) / 1000));
    this.lastFrameMs = now;

    if (this.playing) {
      this.animElapsed += dt;
      let progress = this.animElapsed / this.animDuration;
      if (this.loopContinuously) {
        const cycle = this.animDuration + 0.75; // brief hold between preview loops
        const mod = this.animElapsed % cycle;
        progress = Math.min(1, mod / this.animDuration);
      } else if (progress >= 1) {
        progress = 1;
        this.playing = false;
        this.applyTransitionPose(1);
        this.callbacks.onProgress?.(1);
        if (!this.completedNotified) {
          this.completedNotified = true;
          this.callbacks.onTransitionComplete?.();
        }
      }
      if (this.playing) {
        this.applyTransitionPose(progress);
        this.callbacks.onProgress?.(progress);
      }
    }

    this.renderOnce(dt);

    const orbitSettled =
      !this.dragging &&
      Math.abs(this.targetYaw - this.orbitYaw) < 0.001 &&
      Math.abs(this.targetPitch - this.orbitPitch) < 0.001 &&
      Math.abs(this.targetZoom - this.orbitZoom) < 0.001;

    if (this.playing || this.interactive || !orbitSettled) {
      this.scheduleNextStep();
    }
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.timerId) clearTimeout(this.timerId);
    this.resizeObserver.disconnect();
    const dom = this.renderer.domElement;
    dom.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    dom.removeEventListener("wheel", this.onWheel);

    this.outgoingPanel.dispose();
    this.incomingPanel.dispose();
    this.outgoingTex.dispose();
    this.incomingTex.dispose();
    this.envRenderTarget.dispose();
    for (const d of this.disposables) d.dispose();
    this.renderer.dispose();
    if (dom.parentNode === this.container) {
      this.container.removeChild(dom);
    }
  }
}
