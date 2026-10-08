import { createServerFn } from "@tanstack/react-start";

const GROQ_TEXT_MODEL = "openai/gpt-oss-120b";
const GEMINI_MODEL = GROQ_TEXT_MODEL;
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const pickModel = (hasImage = false) => (hasImage ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL);

type CohereMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

async function chatComplete(
  model: string,
  messages: CohereMessage[],
  extra: Record<string, unknown> = {},
): Promise<string> {
  const apiKey = process.env.GROQ_KEY?.trim().replace(/^['"]|['"]$/g, "");
  if (!apiKey) throw new Error("AI is not configured. Set GROQ_KEY.");

  const hasImage = messages.some(
    (m) =>
      Array.isArray(m.content) &&
      m.content.some(
        (p) => p.type === "image_url" && typeof (p as { url?: string }).url === "string",
      ),
  );
  const resolvedModel = hasImage ? GROQ_VISION_MODEL : model || GROQ_TEXT_MODEL;

  const openaiMessages = messages.map((entry) => ({
    role: entry.role,
    content: Array.isArray(entry.content)
      ? entry.content
          .map((part): Record<string, unknown> | null => {
            if (part.type === "text" && typeof part.text === "string")
              return { type: "text", text: part.text };
            if (part.type === "image_url" && typeof part.image_url === "object")
              return { type: "image_url", image_url: part.image_url };
            return null;
          })
          .filter((p): p is Record<string, unknown> => p !== null)
      : entry.content,
  }));

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: resolvedModel,
      temperature: extra.temperature ?? 0.4,
      max_completion_tokens: Math.min(16384, Math.max(256, Number(extra.max_tokens ?? 16384))),
      ...(extra.response_format ? { response_format: { type: "json_object" } } : {}),
      messages: openaiMessages,
    }),
  });
  if (res.status === 429) throw new Error("AI rate limit hit. Try again in a moment.");
  if (res.status === 401 || res.status === 403)
    throw new Error("AI authentication failed. Check GROQ_KEY.");
  if (!res.ok) throw new Error(`AI error ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("AI returned an empty response");
  return content;
}

function parseLooseJson<T>(raw: string): T {
  let s = (raw ?? "").trim();
  s = s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(s) as T;
  } catch {
    /* fall through */
  }
  const start = s.indexOf("{");
  if (start === -1) throw new Error("AI returned invalid JSON");
  let depth = 0,
    inStr = false,
    esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else {
      if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) return JSON.parse(s.slice(start, i + 1)) as T;
      }
    }
  }
  throw new Error("AI returned invalid JSON");
}

export type AiShadow = { x: number; y: number; blur: number; color: string };

export type AiElementInput =
  | {
      type: "text";
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fontSize: number;
      color: string;
      fontFamily?: string;
      fontWeight?: number;
      align?: "left" | "center" | "right";
      italic?: boolean;
      underline?: boolean;
      bullet?: boolean;
      href?: string;
    }
  | {
      type: "shape";
      shape:
        | "rect"
        | "circle"
        | "holographic_grid"
        | "glitch"
        | "honeycomb"
        | "circuit"
        | "cyber_frame"
        | "data_shard"
        | "tech_chevron"
        | "scanner"
        | "ring"
        | "hex_ring"
        | "angular_frame"
        | "corner_bracket"
        | "triangle"
        | "star"
        | "arrow"
        | "heart"
        | "diamond"
        | "hexagon"
        | "pentagon"
        | "parallelogram"
        | "trapezoid"
        | "cross"
        | "lightning"
        | "cloud"
        | "speech";
      x: number;
      y: number;
      width: number;
      height: number;
      fill: string;
      stroke: string;
      strokeWidth: number;
      effect?:
        | "none"
        | "liquid_glass"
        | "neon"
        | "soft_shadow"
        | "inner_glow"
        | "holographic"
        | "glitch"
        | "honeycomb";
      shadow?: AiShadow;
    }
  | {
      type: "icon";
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      strokeWidth?: number;
    }
  | {
      type: "model3d";
      shape: "sphere";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      spinSpeed?: number;
      tiltX?: number;
      tiltY?: number;
    };

export type AiTemplate = {
  bg: string;
  elements: AiElementInput[];
};

export type AiPage = { bg: string; elements: AiElementInput[] };
export type AiDeck = { pages: AiPage[] };

export type AiStyle =
  | "auto"
  | "cyberpunk"
  | "liquid_glass"
  | "minimal"
  | "editorial"
  | "brutalist"
  | "retro_80s"
  | "organic"
  | "art_deco"
  | "memphis"
  | "y2k";

const STYLE_GUIDES: Record<AiStyle, string> = {
  auto: "AUTO-DETECT STYLE. Read the user's prompt carefully, then pick the most appropriate visual style.",
  cyberpunk:
    "CYBERPUNK / NEOBRUTALIST. Palette: ink #0a0f1f, neon teal #7df9ff, electric blue #4d7cff.",
  liquid_glass:
    "LIQUID GLASS. Deep gradient backgrounds (indigo→violet→cyan), translucent surfaces.",
  minimal: "SWISS MINIMALIST. Paper #f5f3ee, ink #0d0d0d, single accent. Massive negative space.",
  editorial: "EDITORIAL / MAGAZINE. Warm off-white #f8f4ec, deep ink #1a1a1a, gold #c9a84c.",
  brutalist: "RAW BRUTALIST. Stark white #ffffff, pure black #000000, saturated accent.",
  retro_80s: "RETRO 80s. Deep purple #1a0033, hot pink #ff006e, cyan #00f0ff.",
  organic: "ORGANIC / NATURAL. Cream #f5f0e8, sage #87a878, terracotta #c4654a.",
  art_deco: "ART DECO. Black #0a0a0a, gold #d4a017, ivory #f5e6c8.",
  memphis: "MEMPHIS. Hot pink #ff5d8f, electric blue #1e88e5, lemon #ffeb3b.",
  y2k: "Y2K FUTURISM. Chrome silver, holographic pastels, glossy feel.",
};

const buildSystem = (
  W: number,
  H: number,
  style: AiStyle,
  hasImage: boolean,
) => `You are an elite graphic designer generating a MULTI-SLIDE deck for a ${W}×${H}px canvas.
Aspect ratio: ${(W / H).toFixed(3)} (${W >= H ? "landscape/wide" : "portrait/tall"}).

STYLE BRIEF: ${STYLE_GUIDES[style]}

Return ONLY valid JSON:
{
  "pages": Array<{ "bg": "#hex", "elements": Array<element> }>
}

Use these element types: text (with x,y,width,height,fontSize,color), shape (with fill,stroke), icon, model3d (sphere only).
Keep all elements inside bounds (0 ≤ x, x+width ≤ ${W}; 0 ≤ y, y+height ≤ ${H}).
`;

export const generateAiTemplate = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      prompt: string;
      width?: number;
      height?: number;
      style?: AiStyle;
      imageDataUrl?: string;
      slideCount?: number;
      model?: string;
      template?: unknown;
    }) => {
      if (!data || typeof data.prompt !== "string") throw new Error("Prompt is required");
      if (!data.prompt.trim() && !data.imageDataUrl)
        throw new Error("Provide a prompt or an image");
      const clamp = (n: unknown, def: number) => {
        const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : def;
        return Math.max(320, Math.min(4096, v));
      };
      const validStyles: AiStyle[] = [
        "auto",
        "cyberpunk",
        "liquid_glass",
        "minimal",
        "editorial",
        "brutalist",
        "retro_80s",
        "organic",
        "art_deco",
        "memphis",
        "y2k",
      ];
      const style: AiStyle = data.style && validStyles.includes(data.style) ? data.style : "auto";
      const img =
        typeof data.imageDataUrl === "string" && data.imageDataUrl.startsWith("data:image/")
          ? data.imageDataUrl.slice(0, 8_000_000)
          : undefined;
      const slideCount = Math.max(
        1,
        Math.min(
          10,
          typeof data.slideCount === "number" && Number.isFinite(data.slideCount)
            ? Math.round(data.slideCount)
            : 5,
        ),
      );
      return {
        prompt: data.prompt.slice(0, 1000),
        width: clamp(data.width, 1920),
        height: clamp(data.height, 1080),
        style,
        imageDataUrl: img,
        slideCount,
        model: pickModel(),
        template: data.template,
      };
    },
  )
  .handler(async ({ data }): Promise<AiDeck> => {
    const userContent: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Create a ${data.slideCount}-slide presentation deck. Topic: ${data.prompt}`,
      },
    ];
    if (data.imageDataUrl) {
      userContent.push({ type: "image_url", image_url: { url: data.imageDataUrl } });
    }

    const content = await chatComplete(
      data.model,
      [
        {
          role: "system",
          content: buildSystem(data.width, data.height, data.style, !!data.imageDataUrl),
        },
        { role: "user", content: userContent },
      ],
      { response_format: { type: "json_object" } },
    );

    let parsed: AiDeck | AiTemplate;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI returned invalid JSON");
      parsed = JSON.parse(match[0]);
    }
    let pages: AiPage[];
    if ("pages" in parsed && Array.isArray(parsed.pages)) {
      pages = parsed.pages.filter((p) => p && Array.isArray(p.elements));
    } else if ("elements" in parsed && Array.isArray(parsed.elements)) {
      pages = [{ bg: parsed.bg ?? "#0a0f1f", elements: parsed.elements }];
    } else {
      throw new Error("AI response missing pages/elements");
    }
    if (pages.length === 0) throw new Error("AI returned an empty deck");
    return { pages };
  });
