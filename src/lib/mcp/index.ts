import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listDesigns from "./tools/list-designs";
import getDesign from "./tools/get-design";
import createDesign from "./tools/create-design";
import deleteDesign from "./tools/delete-design";
import listPublicTemplates from "./tools/list-public-templates";
import getPublicTemplate from "./tools/get-public-template";

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env ?? {};
const projectRef =
  env.VITE_SUPABASE_PROJECT_ID ||
  (env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? "").match(/^https:\/\/([^.]+)\.supabase\.co/i)?.[1] ||
  "project-ref-unset";

export default defineMcp({
  name: "positron-studio-mcp",
  title: "DiapoLab",
  version: "0.2.0",
  instructions:
    "Tools for DiapoLab, a deck/design editor. List, read, create and delete the signed-in user's designs, and browse or read community templates.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listDesigns, getDesign, createDesign, deleteDesign, listPublicTemplates, getPublicTemplate],
});
