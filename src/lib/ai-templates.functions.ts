import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GROQ_TEXT_MODEL = "openai/gpt-oss-120b";
const GEMINI_MODEL = GROQ_TEXT_MODEL;
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
// Groq has no multimodal on gpt-oss; use the vision model when an image is attached.
const pickModel = (hasImage = false) => (hasImage ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL);

const DIAPOLAB_APP_CONTEXT = `
You are generating or editing content inside DiapoLab, a slide editor product.

APP CAPABILITIES
- Full-deck generation from a text prompt or image reference.
- Single-slide editing and redesign with safe, in-bounds modifications.
- Theme/style presets: auto, cyberpunk, liquid_glass, minimal, editorial, brutalist, retro_80s, organic, art_deco, memphis, y2k.
- Shape library: rect, circle, triangle, star, arrow, heart, diamond, hexagon, pentagon, parallelogram, trapezoid, cross, lightning, cloud, speech, holographic_grid, glitch, honeycomb, circuit, cyber_frame, data_shard, tech_chevron, scanner, ring, hex_ring, angular_frame, corner_bracket, capsule, semicircle, quarter_circle, chevron, starburst, flower, gear, shield, drop, pin, flag, ticket, bookmark, blob, moon, wave, leaf, ribbon.
- Supported object types: text, shape, icon, model3d.
- Icon names must be real lucide-react PascalCase names, for example: Sparkles, Zap, Rocket, Heart, Star, Sun, Moon, Layers, Check, ArrowRight, TrendingUp.
- 3D object support is limited to sphere only.
- Supported effects: none, liquid_glass, neon, soft_shadow, inner_glow, holographic, glitch, honeycomb.
- Supported fonts: Orbitron, JetBrains Mono, Archivo Black, Inter, Georgia.
- Canvas is a real presentation slide; preserve usable content, hierarchy, readability, and brand intent.
- When editing, do not rewrite or remove unrelated content unless the user explicitly requests it.
- All output must remain inside the current canvas bounds and use valid app-safe values.
- Return ONLY valid JSON with the exact schema the app expects. No markdown, no prose, no commentary.
`;

type CohereMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};
