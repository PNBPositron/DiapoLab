import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { ThreeSlideTransition } from "./motion-catalog";
import {
  isLightColor,
  resolveThreeScene,
  type ThreeSceneConfig,
  type ThreeScenePreset,
} from "./three-scene";

export type StageTheme = "studio-dark" | "studio-light";
export type StageCameraPreset = "front" | "hero" | "low";

export type ThreeStageCallbacks = {
  onProgress?: (progress: number) => void;
  onTransitionComplete?: () => void;
};

// Module-scope scratch math objects — zero allocations inside tick().
const _vec3A = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _colorTmp = new THREE.Color();

export function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement("canvas");
    const gl = (probeCanvas.getContext("webgl2") ??
      probeCanvas.getContext("webgl")) as WebGLRenderingContext | null;
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

/**
 * C2-continuous quintic smootherstep blended slightly toward sine ease-in-out
 * for silky velocity ramp-up and feather-soft settle with zero jerk at t=0 or t=1.
 */
function cinemaEase(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  const quintic = x * x * x * (x * (x * 6 - 15) + 10);
  const sine = 0.5 - 0.5 * Math.cos(Math.PI * x);
  return quintic * 0.72 + sine * 0.28;
}

function paintStudioFloorCanvas(
  canvas: HTMLCanvasElement,
  preset: ThreeScenePreset,
  floorHex: string,
  accentHex: string,
  isLightBg: boolean,
) {
  const size = canvas.width;
  const half = size / 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const base = new THREE.Color(floorHex);
  const center = base.clone().offsetHSL(0, 0, isLightBg ? 0.05 : 0.08);
  const mid = base.clone();
  const edge = base.clone().offsetHSL(0, 0, isLightBg ? -0.05 : -0.08);

  const grad = ctx.createRadialGradient(half, half, 16, half, half, size * 0.5);
  grad.addColorStop(0, `#${center.getHexString()}`);
  grad.addColorStop(0.55, `#${mid.getHexString()}`);
  grad.addColorStop(1, `#${edge.getHexString()}`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const accent = new THREE.Color(accentHex);
  const ar = Math.round(accent.r * 255);
  const ag = Math.round(accent.g * 255);
  const ab = Math.round(accent.b * 255);

  if (preset === "grid") {
    const step = 32;
    ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${isLightBg ? 0.24 : 0.28})`;
    ctx.lineWidth = 1.25;
    for (let p = step; p < size; p += step) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, 0.45)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(half, half, 128, 0, Math.PI * 2);
    ctx.stroke();
  } else if (preset === "orbit") {
    ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${isLightBg ? 0.25 : 0.28})`;
    ctx.lineWidth = 1.5;
    for (const r of [84, 134, 186, 228]) {
      ctx.beginPath();
      ctx.arc(half, half, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Azimuth degree ticks
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const r0 = i % 3 === 0 ? 174 : 180;
      const r1 = 192;
      ctx.beginPath();
      ctx.moveTo(half + Math.cos(a) * r0, half + Math.sin(a) * r0);
      ctx.lineTo(half + Math.cos(a) * r1, half + Math.sin(a) * r1);
      ctx.stroke();
    }
  } else if (preset === "nebula" || preset === "aurora") {
    const glow = ctx.createRadialGradient(half, half, 8, half, half, 195);
    glow.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, 0.28)`);
    glow.addColorStop(0.55, `rgba(${ar}, ${ag}, ${ab}, 0.08)`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, 0.22)`;
    ctx.lineWidth = 1.4;
    for (const r of [90, 152, 212]) {
      ctx.beginPath();
      ctx.arc(half, half, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (preset === "monolith") {
    ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${isLightBg ? 0.14 : 0.2})`;
    ctx.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) {
      const x = half + i * 64;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(half, half, 148, 0, Math.PI * 2);
    ctx.stroke();
  } else if (preset === "prism") {
    const glow = ctx.createRadialGradient(half, half, 10, half, half, 210);
    glow.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, 0.16)`);
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, 0.18)`;
    ctx.lineWidth = 1.25;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(half + Math.cos(a) * 60, half + Math.sin(a) * 60);
      ctx.lineTo(half + Math.cos(a) * 240, half + Math.sin(a) * 240);
      ctx.stroke();
    }
  } else {
    // Studio / Minimal / Horizon calibration rings
    ctx.strokeStyle = isLightBg
      ? `rgba(${ar}, ${ag}, ${ab}, 0.16)`
      : `rgba(${ar}, ${ag}, ${ab}, 0.2)`;
    ctx.lineWidth = 1.5;
    for (const r of [96, 158, 218]) {
      ctx.beginPath();
      ctx.arc(half, half, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
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

function createRoundedFrameShape(
  w: number,
  h: number,
  radius: number,
  holeInset: number,
): THREE.Shape {
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
  chassisMaterial: THREE.MeshStandardMaterial;
  bezelMaterial: THREE.MeshStandardMaterial;
  backMaterial: THREE.MeshStandardMaterial;
  bracketMaterial: THREE.MeshStandardMaterial;
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
  config: ThreeSceneConfig,
): SlideAssembly {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const isDark = !isLightColor(config.bgColor);

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
    color: new THREE.Color(config.frameColor),
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
  const bezelColor = new THREE.Color(config.frameColor).multiplyScalar(0.38);
  const bezelMat = new THREE.MeshStandardMaterial({
    color: bezelColor,
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
    emissiveIntensity: isDark ? 0.38 : 0.26,
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
  const backColor = new THREE.Color(config.frameColor).multiplyScalar(0.68);
  const backMat = new THREE.MeshStandardMaterial({
    color: backColor,
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
    color: new THREE.Color(config.accentColor),
    metalness: 0.86,
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
    chassisMaterial: chassisMat,
    bezelMaterial: bezelMat,
    backMaterial: backMat,
    bracketMaterial: bracketMat,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

export class ThreeSlideStage {
  readonly isSoftwareGl: boolean;
  private container: HTMLElement;
  private sceneConfig: ThreeSceneConfig;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envRenderTarget: THREE.WebGLRenderTarget;
  private outgoingTex: THREE.CanvasTexture;
  private incomingTex: THREE.CanvasTexture;
  private floorCanvas: HTMLCanvasElement;
  private floorTex: THREE.CanvasTexture;
  private shadowTex: THREE.CanvasTexture;

  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private backAccentLight: THREE.PointLight;

  private floorMesh: THREE.Mesh;
  private shadowMesh: THREE.Mesh;
  private shadowMat: THREE.MeshBasicMaterial;
  private pedestalGroup: THREE.Group;
  private plinthMat!: THREE.MeshStandardMaterial;
  private ringMat!: THREE.MeshStandardMaterial;

  // Dedicated procedural environment motifs toggled smoothly by preset
  private gyroGroup!: THREE.Group;
  private gyroRings: THREE.Mesh[] = [];
  private gyroMat!: THREE.MeshStandardMaterial;

  private pylonGroup!: THREE.Group;
  private pylonMesh!: THREE.InstancedMesh;
  private pylonCapMesh!: THREE.InstancedMesh;
  private pylonBodyMat!: THREE.MeshStandardMaterial;
  private pylonCapMat!: THREE.MeshStandardMaterial;

  private monolithGroup!: THREE.Group;
  private monolithBodyMat!: THREE.MeshStandardMaterial;
  private monolithStripMat!: THREE.MeshStandardMaterial;

  private dunesGroup!: THREE.Group;
  private dunesMat!: THREE.MeshStandardMaterial;
  private horizonHaloMat!: THREE.MeshStandardMaterial;

  private auroraGroup!: THREE.Group;
  private auroraMeshes: THREE.Mesh[] = [];
  private auroraMat!: THREE.MeshStandardMaterial;

  private crystalsGroup!: THREE.Group;
  private crystalShards: THREE.Mesh[] = [];
  private crystalMat!: THREE.MeshStandardMaterial;

  private stageRig: THREE.Group;
  private outgoingPanel: SlideAssembly;
  private incomingPanel: SlideAssembly;
  private motes: THREE.InstancedMesh;
  private moteMat: THREE.MeshStandardMaterial;
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

  private animDuration = 1.25;
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

  // Smooth damped camera dolly & micro-motion
  private cameraDolly = 0;
  private targetCameraDolly = 0;

  // Frame pacing & coalesced demand rendering
  private disposed = false;
  private rafId = 0;
  private timerId = 0;
  private lastFrameMs = 0;
  private skipNextDt = true;
  private renderQueued = false;
  private idleSpinTime = 0;

  constructor(
    container: HTMLElement,
    outgoingCanvas: HTMLCanvasElement,
    incomingCanvas: HTMLCanvasElement,
    aspectRatio: number,
    theme: StageTheme = "studio-dark",
    callbacks: ThreeStageCallbacks = {},
    initialSceneConfig?: Partial<ThreeSceneConfig> | null,
  ) {
    this.container = container;
    this.sceneConfig = resolveThreeScene(initialSceneConfig, theme === "studio-light");
    this.callbacks = callbacks;
    this.slideAspect = Math.max(0.45, Math.min(2.6, aspectRatio || 16 / 9));
    this.slideH = 2.05;
    this.slideW = this.slideH * this.slideAspect;
    if (this.slideW > 3.85) {
      this.slideW = 3.85;
      this.slideH = this.slideW / this.slideAspect;
    }

    this.isSoftwareGl = detectSoftwareWebGL();
    const isLight = isLightColor(this.sceneConfig.bgColor);

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
    this.scene.background = new THREE.Color(this.sceneConfig.bgColor);
    this.scene.fog = new THREE.FogExp2(this.sceneConfig.bgColor, isLight ? 0.042 : 0.054);

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

    // 3-point PBR studio lighting + subtle rear accent point light
    this.hemiLight = new THREE.HemisphereLight(
      isLight ? 0xffffff : 0xc7d9ff,
      isLight ? 0xcbd5e1 : 0x1e293b,
      0.92,
    );
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
    this.keyLight.position.set(3.6, 5.4, 4.8);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
      this.keyLight.shadow.camera.near = 1;
      this.keyLight.shadow.camera.far = 16;
      this.keyLight.shadow.camera.left = -4;
      this.keyLight.shadow.camera.right = 4;
      this.keyLight.shadow.camera.top = 3;
      this.keyLight.shadow.camera.bottom = -3;
    }
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(new THREE.Color(this.sceneConfig.accentColor), 1.25);
    this.rimLight.position.set(-4.2, 2.4, -3.5);
    this.scene.add(this.rimLight);

    this.backAccentLight = new THREE.PointLight(
      new THREE.Color(this.sceneConfig.accentColor),
      1.8,
      14,
      1.4,
    );
    this.backAccentLight.position.set(0, 1.4, -3.4);
    this.scene.add(this.backAccentLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // Grounded studio floor + contact shadow
    const floorY = -this.slideH * 0.64 - 0.16;
    this.floorCanvas = document.createElement("canvas");
    this.floorCanvas.width = 512;
    this.floorCanvas.height = 512;
    paintStudioFloorCanvas(
      this.floorCanvas,
      this.sceneConfig.scenePreset,
      this.sceneConfig.floorColor,
      this.sceneConfig.accentColor,
      isLight,
    );
    this.floorTex = new THREE.CanvasTexture(this.floorCanvas);
    this.floorTex.colorSpace = THREE.SRGBColorSpace;
    this.floorTex.anisotropy = maxAniso;
    this.floorTex.needsUpdate = true;

    const floorGeo = new THREE.CircleGeometry(10.5, 56);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.floorTex,
      roughness: 0.78,
      metalness: 0.08,
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = floorY;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);
    this.disposables.push(floorGeo, floorMat, this.floorTex);

    this.shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(this.slideW * 1.45, 2.1);
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: this.shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: isLight ? 0.34 : 0.78,
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, this.shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = floorY + 0.005;
    this.scene.add(this.shadowMesh);
    this.disposables.push(shadowGeo, this.shadowMat, this.shadowTex);

    // Lathe-turned studio pedestal ring beneath the floating slides
    this.pedestalGroup = this.buildPedestal(floorY + 0.01, this.sceneConfig);
    this.scene.add(this.pedestalGroup);

    // Build all procedural 3D architectural / atmospheric scene prop groups
    this.buildGyroGroup(this.sceneConfig);
    this.buildCyberPylons(floorY, this.sceneConfig);
    this.buildMonoliths(floorY, this.sceneConfig);
    this.buildSunsetDunes(floorY, this.sceneConfig);
    this.buildAuroraRibbons(this.sceneConfig);
    this.buildPrismCrystals(this.sceneConfig);

    // Slide CanvasTextures
    this.outgoingTex = this.makeSlideTexture(outgoingCanvas, maxAniso);
    this.incomingTex = this.makeSlideTexture(incomingCanvas, maxAniso);

    // Stage Rig & composite 8-part slide assemblies
    this.stageRig = new THREE.Group();
    this.scene.add(this.stageRig);

    this.outgoingPanel = createSlideAssembly(
      this.slideW,
      this.slideH,
      this.outgoingTex,
      this.sceneConfig,
    );
    this.incomingPanel = createSlideAssembly(
      this.slideW,
      this.slideH,
      this.incomingTex,
      this.sceneConfig,
    );
    this.stageRig.add(this.outgoingPanel.group, this.incomingPanel.group);

    // Instanced floating calibration prisms
    const moteGeo = new THREE.OctahedronGeometry(0.038, 0);
    this.moteMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.sceneConfig.accentColor),
      metalness: 0.85,
      roughness: 0.22,
      emissive: new THREE.Color(this.sceneConfig.accentColor),
      emissiveIntensity: 0.35,
    });
    this.motes = new THREE.InstancedMesh(moteGeo, this.moteMat, this.moteCount);
    this.motes.frustumCulled = false;
    this.moteAngles = new Float32Array(this.moteCount);
    this.moteRadii = new Float32Array(this.moteCount);
    this.moteHeights = new Float32Array(this.moteCount);
    this.moteSpeeds = new Float32Array(this.moteCount);
    for (let i = 0; i < this.moteCount; i++) {
      this.moteAngles[i] = (i / this.moteCount) * Math.PI * 2;
      this.moteRadii[i] = 2.55 + (i % 5) * 0.38;
      this.moteHeights[i] = ((i % 7) - 3) * 0.36;
      this.moteSpeeds[i] = 0.22 + (i % 4) * 0.09;
    }
    this.updateMotes(0);
    this.motes.computeBoundingSphere();
    this.scene.add(this.motes);
    this.disposables.push(moteGeo, this.moteMat);

    // Resize handling
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    // Pointer interaction for interactive orbit/inspect
    dom.addEventListener("pointerdown", this.onPointerDown);
    dom.addEventListener("dblclick", this.onDoubleClick);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    dom.addEventListener("wheel", this.onWheel, { passive: false });

    this.applySceneVisibilityAndLighting();
    this.applyTransitionPose(0);

    // Pre-warm shaders on GPU so frame 1 plays without shader compilation hitching
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.requestRender();
  }

  private buildPedestal(yBase: number, config: ThreeSceneConfig): THREE.Group {
    const group = new THREE.Group();
    const isLight = isLightColor(config.bgColor);
    const pts = [
      new THREE.Vector2(0.01, 0),
      new THREE.Vector2(1.42, 0),
      new THREE.Vector2(1.36, 0.045),
      new THREE.Vector2(1.12, 0.06),
      new THREE.Vector2(1.06, 0.09),
      new THREE.Vector2(0.01, 0.09),
    ];
    const plinthGeo = new THREE.LatheGeometry(pts, 48);
    this.plinthMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.floorColor).offsetHSL(0, 0, isLight ? -0.05 : 0.06),
      metalness: 0.42,
      roughness: 0.62,
    });
    const plinth = new THREE.Mesh(plinthGeo, this.plinthMat);
    plinth.position.y = yBase;
    plinth.receiveShadow = true;
    group.add(plinth);

    const ringGeo = new THREE.TorusGeometry(1.18, 0.012, 12, 64);
    this.ringMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.accentColor),
      metalness: 0.88,
      roughness: 0.2,
      emissive: new THREE.Color(config.accentColor),
      emissiveIntensity: isLight ? 0.28 : 0.55,
    });
    const ring = new THREE.Mesh(ringGeo, this.ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = yBase + 0.075;
    group.add(ring);

    this.disposables.push(plinthGeo, this.plinthMat, ringGeo, this.ringMat);
    return group;
  }

  private buildGyroGroup(config: ThreeSceneConfig) {
    this.gyroGroup = new THREE.Group();
    this.gyroGroup.position.set(0, 0.05, -0.6);
    this.gyroMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.accentColor),
      metalness: 0.88,
      roughness: 0.18,
      emissive: new THREE.Color(config.accentColor),
      emissiveIntensity: 0.32,
    });
    this.disposables.push(this.gyroMat);

    const specs = [
      { r: 2.85, tube: 0.015, rx: Math.PI * 0.38, ry: 0.2 },
      { r: 3.35, tube: 0.018, rx: -Math.PI * 0.28, ry: -0.35 },
      { r: 3.9, tube: 0.014, rx: Math.PI * 0.48, ry: 0.55 },
    ];
    for (const s of specs) {
      const geo = new THREE.TorusGeometry(s.r, s.tube, 14, 96);
      const mesh = new THREE.Mesh(geo, this.gyroMat);
      mesh.rotation.set(s.rx, s.ry, 0);
      this.gyroRings.push(mesh);
      this.gyroGroup.add(mesh);
      this.disposables.push(geo);
    }
    this.scene.add(this.gyroGroup);
  }

  private buildCyberPylons(floorY: number, config: ThreeSceneConfig) {
    this.pylonGroup = new THREE.Group();
    const count = 10;
    const bodyGeo = new THREE.CylinderGeometry(0.11, 0.15, 1.5, 6);
    const capGeo = new THREE.CylinderGeometry(0.125, 0.125, 0.07, 6);
    this.pylonBodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.frameColor).multiplyScalar(0.65),
      metalness: 0.68,
      roughness: 0.36,
    });
    this.pylonCapMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.accentColor),
      metalness: 0.85,
      roughness: 0.18,
      emissive: new THREE.Color(config.accentColor),
      emissiveIntensity: 0.72,
    });
    this.pylonMesh = new THREE.InstancedMesh(bodyGeo, this.pylonBodyMat, count);
    this.pylonCapMesh = new THREE.InstancedMesh(capGeo, this.pylonCapMat, count);
    this.pylonMesh.frustumCulled = false;
    this.pylonCapMesh.frustumCulled = false;

    for (let i = 0; i < count; i++) {
      const angle = Math.PI + ((i / (count - 1)) - 0.5) * Math.PI * 1.15;
      const radius = 4.35 + (i % 2) * 0.65;
      const scaleH = 0.65 + (i % 3) * 0.38;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius - 0.5;
      const h = 1.5 * scaleH;

      _dummy.position.set(x, floorY + h / 2, z);
      _dummy.rotation.set(0, angle, 0);
      _dummy.scale.set(1, scaleH, 1);
      _dummy.updateMatrix();
      this.pylonMesh.setMatrixAt(i, _dummy.matrix);

      _dummy.position.set(x, floorY + h + 0.04, z);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      this.pylonCapMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.pylonMesh.instanceMatrix.needsUpdate = true;
    this.pylonCapMesh.instanceMatrix.needsUpdate = true;
    this.pylonGroup.add(this.pylonMesh, this.pylonCapMesh);
    this.scene.add(this.pylonGroup);
    this.disposables.push(bodyGeo, capGeo, this.pylonBodyMat, this.pylonCapMat);
  }

  private buildMonoliths(floorY: number, config: ThreeSceneConfig) {
    this.monolithGroup = new THREE.Group();
    const pillarGeo = new THREE.BoxGeometry(0.36, 3.1, 0.44);
    const stripGeo = new THREE.BoxGeometry(0.032, 2.75, 0.04);
    this.monolithBodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.frameColor).multiplyScalar(0.5),
      metalness: 0.25,
      roughness: 0.72,
    });
    this.monolithStripMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.accentColor),
      metalness: 0.85,
      roughness: 0.16,
      emissive: new THREE.Color(config.accentColor),
      emissiveIntensity: 0.78,
    });

    const placements = [
      { x: -3.15, z: -2.15, ry: 0.28, sy: 0.92 },
      { x: -4.15, z: -3.35, ry: 0.42, sy: 1.12 },
      { x: -5.1, z: -4.6, ry: 0.52, sy: 0.85 },
      { x: 3.15, z: -2.15, ry: -0.28, sy: 0.92 },
      { x: 4.15, z: -3.35, ry: -0.42, sy: 1.12 },
      { x: 5.1, z: -4.6, ry: -0.52, sy: 0.85 },
    ];
    for (const p of placements) {
      const col = new THREE.Group();
      const body = new THREE.Mesh(pillarGeo, this.monolithBodyMat);
      body.castShadow = true;
      body.receiveShadow = true;
      col.add(body);

      const strip = new THREE.Mesh(stripGeo, this.monolithStripMat);
      strip.position.set(p.x < 0 ? 0.175 : -0.175, 0, 0.21);
      col.add(strip);

      const totalH = 3.1 * p.sy;
      col.scale.set(1, p.sy, 1);
      col.position.set(p.x, floorY + totalH / 2, p.z);
      col.rotation.y = p.ry;
      this.monolithGroup.add(col);
    }
    this.scene.add(this.monolithGroup);
    this.disposables.push(pillarGeo, stripGeo, this.monolithBodyMat, this.monolithStripMat);
  }

  private buildSunsetDunes(floorY: number, config: ThreeSceneConfig) {
    this.dunesGroup = new THREE.Group();

    // Sculpted perimeter ridge topography using displaced RingGeometry
    const ridgeGeo = new THREE.RingGeometry(3.4, 9.6, 72, 12);
    ridgeGeo.rotateX(-Math.PI / 2);
    const pos = ridgeGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.hypot(x, z);
      const t = Math.max(0, (dist - 3.4) / 6.2);
      const ridge =
        (Math.sin(x * 0.85 + z * 0.45) * 0.55 + Math.cos(z * 0.95 - x * 0.35) * 0.45 + 0.7) *
        t *
        1.15;
      // Keep the front view corridor lower so camera never gets obstructed
      const frontFade = z > 1.0 ? Math.max(0.1, 1 - (z - 1.0) * 0.3) : 1;
      pos.setY(i, ridge * frontFade);
    }
    ridgeGeo.computeVertexNormals();

    this.dunesMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.floorColor),
      metalness: 0.12,
      roughness: 0.86,
      flatShading: true,
    });
    const ridgeMesh = new THREE.Mesh(ridgeGeo, this.dunesMat);
    ridgeMesh.position.y = floorY + 0.01;
    ridgeMesh.receiveShadow = true;
    this.dunesGroup.add(ridgeMesh);

    // Warm horizon solar halo behind the slide
    const haloGeo = new THREE.TorusGeometry(2.85, 0.032, 14, 72, Math.PI * 1.15);
    this.horizonHaloMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.accentColor),
      metalness: 0.7,
      roughness: 0.25,
      emissive: new THREE.Color(config.accentColor),
      emissiveIntensity: 0.85,
    });
    const haloMesh = new THREE.Mesh(haloGeo, this.horizonHaloMat);
    haloMesh.position.set(0, floorY + 0.15, -3.5);
    haloMesh.rotation.z = -Math.PI * 0.075;
    this.dunesGroup.add(haloMesh);

    this.scene.add(this.dunesGroup);
    this.disposables.push(ridgeGeo, haloGeo, this.dunesMat, this.horizonHaloMat);
  }

  private buildAuroraRibbons(config: ThreeSceneConfig) {
    this.auroraGroup = new THREE.Group();
    this.auroraMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.accentColor),
      emissive: new THREE.Color(config.accentColor),
      emissiveIntensity: 0.82,
      roughness: 0.35,
      metalness: 0.1,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    this.disposables.push(this.auroraMat);

    const curves = [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-5.2, 1.4, -4.6),
        new THREE.Vector3(-2.1, 2.3, -4.1),
        new THREE.Vector3(1.5, 1.85, -3.8),
        new THREE.Vector3(5.0, 2.55, -4.7),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4.6, 2.2, -5.2),
        new THREE.Vector3(-1.0, 1.55, -4.7),
        new THREE.Vector3(2.2, 2.35, -4.4),
        new THREE.Vector3(5.3, 1.7, -5.3),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.8, 0.85, -4.3),
        new THREE.Vector3(0.0, 1.45, -4.8),
        new THREE.Vector3(3.8, 1.0, -4.3),
      ]),
    ];

    for (const c of curves) {
      const geo = new THREE.TubeGeometry(c, 56, 0.11, 10, false);
      const mesh = new THREE.Mesh(geo, this.auroraMat);
      mesh.scale.set(1, 2.1, 0.35);
      this.auroraMeshes.push(mesh);
      this.auroraGroup.add(mesh);
      this.disposables.push(geo);
    }
    this.scene.add(this.auroraGroup);
  }

  private buildPrismCrystals(config: ThreeSceneConfig) {
    this.crystalsGroup = new THREE.Group();
    const crystalGeo = new THREE.OctahedronGeometry(0.28, 0);
    this.crystalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.accentColor),
      metalness: 0.84,
      roughness: 0.14,
      emissive: new THREE.Color(config.accentColor),
      emissiveIntensity: 0.22,
    });
    this.disposables.push(crystalGeo, this.crystalMat);

    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI + ((i / (count - 1)) - 0.5) * Math.PI * 1.1;
      const r = 3.55 + (i % 3) * 0.55;
      const shard = new THREE.Mesh(crystalGeo, this.crystalMat);
      shard.position.set(Math.sin(angle) * r, ((i % 4) - 1.5) * 0.42, Math.cos(angle) * r - 0.7);
      const s = 0.65 + (i % 3) * 0.25;
      shard.scale.set(s * 0.65, s * 1.85, s * 0.65);
      shard.rotation.set((i % 3) * 0.25, angle, ((i % 2) - 0.5) * 0.35);
      this.crystalShards.push(shard);
      this.crystalsGroup.add(shard);
    }
    this.scene.add(this.crystalsGroup);
  }

  private applySceneVisibilityAndLighting() {
    const cfg = this.sceneConfig;
    const preset = cfg.scenePreset;
    const isLight = isLightColor(cfg.bgColor);

    this.floorMesh.visible = cfg.showFloor;
    this.shadowMesh.visible = cfg.showFloor;
    this.pedestalGroup.visible =
      cfg.showFloor &&
      preset !== "void" &&
      preset !== "nebula" &&
      preset !== "aurora" &&
      preset !== "horizon";

    const propsEnabled = preset !== "void" && preset !== "minimal" && preset !== "studio";
    this.gyroGroup.visible = propsEnabled && (preset === "orbit" || preset === "nebula");
    this.pylonGroup.visible = propsEnabled && preset === "grid";
    this.monolithGroup.visible = propsEnabled && preset === "monolith";
    this.dunesGroup.visible = propsEnabled && preset === "horizon";
    this.auroraGroup.visible = propsEnabled && preset === "aurora";
    this.crystalsGroup.visible = propsEnabled && preset === "prism";

    this.motes.visible = cfg.showParticles;

    // Color-temperature tuning per preset
    if (preset === "horizon") {
      this.keyLight.color.set(0xffe1bd);
    } else if (preset === "aurora" || preset === "grid") {
      this.keyLight.color.set(0xe2f6ff);
    } else if (preset === "minimal" || preset === "prism") {
      this.keyLight.color.set(0xffffff);
    } else {
      this.keyLight.color.set(0xfff4e6);
    }

    this.hemiLight.color.set(isLight ? 0xffffff : 0xc7d9ff);
    this.hemiLight.groundColor.set(isLight ? 0xcbd5e1 : 0x1e293b);
    this.rimLight.color.set(cfg.accentColor);
    this.backAccentLight.color.set(cfg.accentColor);
    this.backAccentLight.intensity = isLight ? 1.1 : 1.9;
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

  setSceneConfig(patch?: Partial<ThreeSceneConfig> | null, fallbackLight = false) {
    if (this.disposed) return;
    const next = resolveThreeScene(patch, fallbackLight);
    this.sceneConfig = next;
    const isLight = isLightColor(next.bgColor);

    _colorTmp.set(next.bgColor);
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(_colorTmp);
    } else {
      this.scene.background = _colorTmp.clone();
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(_colorTmp);
      this.scene.fog.density = isLight ? 0.042 : 0.054;
    }

    paintStudioFloorCanvas(
      this.floorCanvas,
      next.scenePreset,
      next.floorColor,
      next.accentColor,
      isLight,
    );
    this.floorTex.needsUpdate = true;
    this.shadowMat.opacity = isLight ? 0.34 : 0.78;

    this.plinthMat.color
      .set(next.floorColor)
      .offsetHSL(0, 0, isLight ? -0.05 : 0.06);
    this.ringMat.color.set(next.accentColor);
    this.ringMat.emissive.set(next.accentColor);
    this.ringMat.emissiveIntensity = isLight ? 0.28 : 0.55;

    // Update procedural environment materials
    this.gyroMat.color.set(next.accentColor);
    this.gyroMat.emissive.set(next.accentColor);

    this.pylonBodyMat.color.set(next.frameColor).multiplyScalar(0.65);
    this.pylonCapMat.color.set(next.accentColor);
    this.pylonCapMat.emissive.set(next.accentColor);

    this.monolithBodyMat.color.set(next.frameColor).multiplyScalar(0.5);
    this.monolithStripMat.color.set(next.accentColor);
    this.monolithStripMat.emissive.set(next.accentColor);

    this.dunesMat.color.set(next.floorColor);
    this.horizonHaloMat.color.set(next.accentColor);
    this.horizonHaloMat.emissive.set(next.accentColor);

    this.auroraMat.color.set(next.accentColor);
    this.auroraMat.emissive.set(next.accentColor);

    this.crystalMat.color.set(next.accentColor);
    this.crystalMat.emissive.set(next.accentColor);

    this.moteMat.color.set(next.accentColor);
    this.moteMat.emissive.set(next.accentColor);

    for (const panel of [this.outgoingPanel, this.incomingPanel]) {
      panel.chassisMaterial.color.set(next.frameColor);
      panel.bezelMaterial.color.set(next.frameColor).multiplyScalar(0.38);
      panel.backMaterial.color.set(next.frameColor).multiplyScalar(0.68);
      panel.bracketMaterial.color.set(next.accentColor);
      panel.faceMaterial.emissiveIntensity = isLight ? 0.26 : 0.38;
    }

    this.applySceneVisibilityAndLighting();
    this.requestRender();
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

  setCameraPreset(preset: StageCameraPreset) {
    if (preset === "front") {
      this.targetYaw = 0;
      this.targetPitch = 0;
      this.targetZoom = 1;
    } else if (preset === "hero") {
      this.targetYaw = -0.34;
      this.targetPitch = 0.14;
      this.targetZoom = 1.08;
    } else {
      this.targetYaw = 0.28;
      this.targetPitch = -0.14;
      this.targetZoom = 1.12;
    }
    this.startLoop();
  }

  resetCamera() {
    this.setCameraPreset("front");
  }

  playTransition(
    kind: ThreeSlideTransition,
    options: { duration?: number; loop?: boolean } = {},
  ) {
    this.transitionKind = kind;
    this.animDuration = Math.max(0.5, options.duration ?? this.sceneConfig.duration ?? 1.25);
    this.loopContinuously = !!options.loop;
    this.animElapsed = 0;
    this.completedNotified = false;
    this.skipNextDt = true;
    this.lastFrameMs = performance.now();
    this.playing = true;
    this.applyTransitionPose(0);
    this.cameraDolly = this.targetCameraDolly;
    this.startLoop();
  }

  private updateEnvironmentProps(timeSec: number) {
    if (this.gyroGroup.visible) {
      this.gyroRings.forEach((ring, idx) => {
        const dir = idx % 2 === 0 ? 1 : -1;
        ring.rotation.z = timeSec * (0.14 + idx * 0.06) * dir;
        ring.rotation.y += 0; // base tilt preserved
      });
    }
    if (this.auroraGroup.visible) {
      this.auroraMeshes.forEach((mesh, idx) => {
        mesh.position.y = Math.sin(timeSec * 0.65 + idx * 1.4) * 0.14;
        mesh.rotation.z = Math.sin(timeSec * 0.4 + idx) * 0.03;
      });
    }
    if (this.crystalsGroup.visible) {
      this.crystalShards.forEach((shard, idx) => {
        shard.rotation.y = timeSec * (0.28 + (idx % 3) * 0.08) * (idx % 2 === 0 ? 1 : -1);
        shard.position.y =
          ((idx % 4) - 1.5) * 0.42 + Math.sin(timeSec * 1.1 + idx * 0.9) * 0.09;
      });
    }
  }

  private updateMotes(timeSec: number) {
    if (!this.motes.visible) return;
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
    const e = cinemaEase(t);
    const bell = Math.sin(e * Math.PI);
    this.targetCameraDolly = bell * 0.44;

    // Reset both panels cleanly
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
      this.outgoingPanel.group.position.set(0, 0, halfW);
      this.outgoingPanel.group.rotation.set(0, 0, 0);

      this.incomingPanel.group.position.set(halfW, 0, 0);
      this.incomingPanel.group.rotation.set(0, Math.PI / 2, 0);

      this.stageRig.position.set(0, bell * 0.04, -halfW - bell * 0.52);
      this.stageRig.rotation.y = -e * (Math.PI / 2);
      this.stageRig.rotation.x = bell * 0.055;
    } else if (this.transitionKind === "3d-carousel") {
      const radius = w * 1.16;
      const span = Math.PI * 0.58;
      const outAngle = -e * span;
      const inAngle = (1 - e) * span;

      this.outgoingPanel.group.position.set(
        Math.sin(outAngle) * radius,
        bell * 0.05,
        Math.cos(outAngle) * radius - radius - bell * 0.14,
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
      const angle = e * Math.PI;
      this.stageRig.position.set(0, bell * 0.05, -bell * 0.44);
      this.stageRig.rotation.y = angle;
      this.stageRig.rotation.x = bell * 0.085;

      this.outgoingPanel.group.position.set(0, 0, 0.048);
      this.outgoingPanel.group.rotation.y = 0;

      this.incomingPanel.group.position.set(0, 0, -0.048);
      this.incomingPanel.group.rotation.y = Math.PI;
    } else if (this.transitionKind === "3d-fold") {
      const outAngle = -e * (Math.PI * 0.76);
      const outPivotX = -halfW - e * 0.78;
      this.outgoingPanel.group.position.set(
        outPivotX + Math.cos(outAngle) * halfW,
        0,
        Math.sin(outAngle) * halfW * 0.35 - e * 1.25,
      );
      this.outgoingPanel.group.rotation.y = outAngle;
      this.outgoingPanel.group.scale.setScalar(1 - e * 0.16);

      const inv = 1 - e;
      const inAngle = inv * 1.05;
      this.incomingPanel.group.position.set(
        halfW - Math.cos(inAngle) * halfW + inv * 0.24,
        0,
        -Math.sin(inAngle) * halfW - inv * 0.45,
      );
      this.incomingPanel.group.rotation.y = -inAngle;
      this.incomingPanel.group.scale.setScalar(0.92 + e * 0.08);
    } else if (this.transitionKind === "3d-helix") {
      const inv = 1 - e;
      this.outgoingPanel.group.position.set(
        -Math.sin(e * Math.PI * 0.68) * 2.85,
        e * 0.62,
        -e * 2.75,
      );
      this.outgoingPanel.group.rotation.set(e * 0.18, -e * 1.32, e * 0.1);
      this.outgoingPanel.group.scale.setScalar(Math.max(0.46, 1 - e * 0.48));

      this.incomingPanel.group.position.set(
        Math.sin(inv * Math.PI * 0.68) * 2.85,
        -inv * 0.62,
        -inv * 2.75,
      );
      this.incomingPanel.group.rotation.set(-inv * 0.2, inv * 1.32, -inv * 0.12);
      this.incomingPanel.group.scale.setScalar(0.52 + e * 0.48);
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

  private onDoubleClick = () => {
    if (!this.interactive) return;
    this.resetCamera();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.targetYaw = Math.max(-1.15, Math.min(1.15, this.targetYaw + dx * 0.006));
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
    const orbitDamp = 1 - Math.exp(-10 * dt);
    const dollyDamp = 1 - Math.exp(-16 * dt);
    this.orbitYaw += (this.targetYaw - this.orbitYaw) * orbitDamp;
    this.orbitPitch += (this.targetPitch - this.orbitPitch) * orbitDamp;
    this.orbitZoom += (this.targetZoom - this.orbitZoom) * orbitDamp;
    this.cameraDolly += (this.targetCameraDolly - this.cameraDolly) * dollyDamp;

    // Fit camera distance to container aspect so slide fills viewport cleanly
    const aspect = Math.max(0.4, this.camera.aspect);
    const vFovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const halfV = this.slideH * 0.56;
    const halfH = (this.slideW * 0.56) / aspect;
    const baseDist =
      Math.max(halfV / Math.tan(vFovRad / 2), halfH / Math.tan(vFovRad / 2)) * 1.12;
    const dist = baseDist * this.orbitZoom + this.cameraDolly;

    const pitchOffset = 0.06 + this.orbitPitch;
    _vec3A.set(
      Math.sin(this.orbitYaw) * Math.cos(pitchOffset) * dist,
      Math.sin(pitchOffset) * dist,
      Math.cos(this.orbitYaw) * Math.cos(pitchOffset) * dist,
    );
    this.camera.position.copy(_vec3A);
    this.camera.lookAt(0, 0, 0);

    this.idleSpinTime += dt;
    this.updateMotes(this.idleSpinTime);
    this.updateEnvironmentProps(this.idleSpinTime);
    this.renderer.render(this.scene, this.camera);
  }

  private tick = () => {
    this.rafId = 0;
    this.timerId = 0;
    if (this.disposed) return;

    const now = performance.now();
    let dt = Math.min(0.04, Math.max(0.001, (now - this.lastFrameMs) / 1000));
    this.lastFrameMs = now;
    if (this.skipNextDt) {
      this.skipNextDt = false;
      dt = 0.006;
    }

    if (this.playing) {
      this.animElapsed += dt;
      let progress = this.animElapsed / this.animDuration;
      if (this.loopContinuously) {
        const cycle = this.animDuration + 0.85;
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
      Math.abs(this.targetZoom - this.orbitZoom) < 0.001 &&
      Math.abs(this.targetCameraDolly - this.cameraDolly) < 0.001;

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
    dom.removeEventListener("dblclick", this.onDoubleClick);
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
