import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listDesigns from "./tools/list-designs";
import getDesign from "./tools/get-design";
import createDesign from "./tools/create-design";
import deleteDesign from "./tools/delete-design";
import listPublicTemplates from "./tools/list-public-templates";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "positron-studio-mcp",
  title: "DiapoLab",
  version: "0.1.0",
  instructions:
    "Tools for DiapoLab, a neobrutalist deck/design editor. List, read, create and delete the signed-in user's designs, and browse community templates.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listDesigns, getDesign, createDesign, deleteDesign, listPublicTemplates],
});
