/* Kiswahili dictionary keyed by the English UI string. Each area of the app
   keeps its own file so they can be edited independently; later entries win
   when the same English text appears in more than one. */
import { dashboard } from "./sw/dashboard";
import { forms } from "./sw/forms";
import { planner } from "./sw/planner";
import { map } from "./sw/map";
import { settings } from "./sw/settings";
import { shop } from "./sw/shop";
import { common } from "./sw/common";

export const sw: Record<string, string> = {
  ...common,
  ...dashboard,
  ...forms,
  ...planner,
  ...map,
  ...settings,
  ...shop,
};
