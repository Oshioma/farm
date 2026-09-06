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
import { crops } from "./sw/crops";
import { seedlings } from "./sw/seedlings";
import { customers } from "./sw/customers";
import { goals } from "./sw/goals";
import { harvest } from "./sw/harvest";
import { soil } from "./sw/soil";
import { systems } from "./sw/systems";

export const sw: Record<string, string> = {
  ...common,
  ...dashboard,
  ...forms,
  ...planner,
  ...map,
  ...settings,
  ...shop,
  ...crops,
  ...seedlings,
  ...customers,
  ...goals,
  ...harvest,
  ...soil,
  ...systems,
};
