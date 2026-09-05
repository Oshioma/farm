/* English UI string -> Kiswahili. Lunar / task planner (app/farm/components/LunarPlanner.tsx).
   Keys are the exact English strings passed to t(); values are natural Tanzanian
   Kiswahili. Constants in app/lunar-planner/lunar-data.ts stay English and are
   looked up here at render time. */
export const planner: Record<string, string> = {
  /* Tabs and header */
  "Planner": "Mpangaji",
  "Lunar Farming Planner": "Mpangaji wa Kilimo kwa Mwezi",
  "Plan farm goals by the rhythm of the moon.": "Panga malengo ya shamba kwa mdundo wa mwezi.",
  "Plan farm tasks by the rhythm of the moon.": "Panga kazi za shamba kwa mdundo wa mwezi.",
  "Farm": "Shamba",
  "Sign out": "Toka",

  /* View switch and navigation */
  "1 Day": "Siku 1",
  "7 Day": "Siku 7",
  "Month": "Mwezi mzima",
  "Previous period": "Kipindi kilichopita",
  "Next period": "Kipindi kijacho",
  "Today": "Leo",
  "Loading…": "Inapakia…",

  /* Errors and validation */
  "Failed to load session": "Imeshindwa kupakia kipindi cha kuingia",
  "Failed to load planner": "Imeshindwa kupakia mpangaji",
  "Failed to refresh": "Imeshindwa kuonyesha upya",
  "Failed to update moon phase": "Imeshindwa kubadilisha awamu ya mwezi",
  "Failed to save notes": "Imeshindwa kuhifadhi maelezo",
  "Task title is required.": "Jina la kazi linahitajika.",
  "Task date is required.": "Tarehe ya kazi inahitajika.",
  "Failed to save task": "Imeshindwa kuhifadhi kazi",
  "Failed to update task": "Imeshindwa kubadilisha kazi",
  "Failed to log hours": "Imeshindwa kurekodi saa za kazi",
  "Failed to delete task": "Imeshindwa kufuta kazi",
  "Failed to update reminder": "Imeshindwa kubadilisha kikumbusho",

  /* Lunar Farming Guide */
  "Lunar Farming Guide": "Mwongozo wa Kilimo kwa Mwezi",
  "Moon phases are automatically estimated for farm planning. Manual override is available if you want to adjust based on local observation or a preferred lunar calendar.":
    "Awamu za mwezi hukadiriwa kiotomatiki kwa ajili ya kupanga shamba. Unaweza kuzibadilisha mwenyewe ukitaka kufuata uangalizi wa eneo lako au kalenda ya mwezi unayoipendelea.",

  /* Moon phases (values stored in the database stay in English) */
  "New Moon": "Mwezi Mwandamo",
  "Waxing Moon": "Mwezi Unaokua",
  "Full Moon": "Mwezi Mpevu",
  "Waning Moon": "Mwezi Unaopungua",

  /* Guide summaries per phase */
  "Planning, soil preparation, composting, seed selection, observation, setting intentions.":
    "Kupanga, kuandaa udongo, kutengeneza mboji, kuchagua mbegu, kuangalia shamba, kuweka malengo.",
  "Planting leafy greens and above-ground crops, seed soaking, grafting, propagation, encouraging upward growth.":
    "Kupanda mboga za majani na mazao yanayokua juu ya ardhi, kuloweka mbegu, kubebesha, kuzalisha miche, kuchochea ukuaji wa juu.",
  "Transplanting, watering, feeding, compost activation, peak growth energy.":
    "Kuhamisha miche, kumwagilia, kulisha mimea, kuamsha mboji, kilele cha nguvu ya ukuaji.",
  "Planting root crops and tubers, pruning, weeding, fertilising soil, harvesting for storage, processing wood.":
    "Kupanda mazao ya mizizi na viazi, kupogoa, kupalilia, kurutubisha udongo, kuvuna kwa kuhifadhi, kuchakata mbao.",

  /* Month-grid headlines */
  "Plan & prepare": "Panga na uandae",
  "Sow & grow upward": "Panda na ukuze juu",
  "Transplant & feed": "Hamisha miche na ulishe",
  "Roots, pruning & harvest": "Mizizi, kupogoa na kuvuna",

  /* Daily lunar guidance */
  "Today's Lunar Guidance": "Mwongozo wa Mwezi wa Leo",
  "Good for planning": "Nzuri kwa kupanga",
  "Good for observing the land": "Nzuri kwa kuangalia shamba",
  "Good for seed selection": "Nzuri kwa kuchagua mbegu",
  "Good for compost planning": "Nzuri kwa kupanga mboji",
  "Good for light soil preparation": "Nzuri kwa kuandaa udongo kidogo",
  "Avoid overloading the day with heavy planting": "Epuka kujaza siku kwa upandaji mkubwa",
  "Good for seed soaking": "Nzuri kwa kuloweka mbegu",
  "Good for leafy greens": "Nzuri kwa mboga za majani",
  "Good for above-ground crops": "Nzuri kwa mazao yanayokua juu ya ardhi",
  "Good for grafting": "Nzuri kwa kubebesha",
  "Good for propagation": "Nzuri kwa kuzalisha miche",
  "Good for medicinal leaves and flowers": "Nzuri kwa majani na maua ya dawa",
  "Sap flow is traditionally considered stronger": "Kwa mila, utomvu huhesabiwa kuwa na nguvu zaidi",
  "Avoid heavy pruning": "Epuka kupogoa sana",
  "Good for transplanting": "Nzuri kwa kuhamisha miche",
  "Good for feeding plants": "Nzuri kwa kulisha mimea",
  "Good for turning compost": "Nzuri kwa kugeuza mboji",
  "Good for lighter watering": "Nzuri kwa kumwagilia kidogo",
  "Good for harvesting crops for immediate use": "Nzuri kwa kuvuna mazao ya kutumia mara moja",
  "Moisture retention may be stronger": "Udongo huenda ukahifadhi unyevu zaidi",
  "Avoid deep soil disturbance": "Epuka kuchimbua udongo kwa kina",
  "Strong for root planting": "Bora sana kwa kupanda mazao ya mizizi",
  "Good for ginger, turmeric, onions, garlic and tubers": "Nzuri kwa tangawizi, manjano, vitunguu, vitunguu saumu na viazi",
  "Good for pruning": "Nzuri kwa kupogoa",
  "Good for weeding": "Nzuri kwa kupalilia",
  "Good for pest control": "Nzuri kwa kudhibiti wadudu",
  "Good for applying mature compost": "Nzuri kwa kuweka mboji iliyoiva",
  "Good for harvesting storage crops": "Nzuri kwa kuvuna mazao ya kuhifadhi",
  "Good for cutting and processing wood": "Nzuri kwa kukata na kuchakata mbao",
  "Good for medicinal roots and bark": "Nzuri kwa mizizi na magome ya dawa",
  "Good for deeper soil work": "Nzuri kwa kazi ya udongo wa kina",
  "Good for livestock maintenance such as hoof trimming and deworming":
    "Nzuri kwa kutunza mifugo kama kukata kwato na kutoa minyoo",
  "Avoid transplanting delicate seedlings": "Epuka kuhamisha miche dhaifu",

  /* Biodynamic icon labels */
  "Planting": "Kupanda",
  "Pruning": "Kupogoa",
  "Watering": "Kumwagilia",
  "Moon phase": "Awamu ya mwezi",
  "Compost": "Mboji",
  "Wood processing": "Kuchakata mbao",
  "Livestock": "Mifugo",
  "Harvesting": "Kuvuna",
  "Root crops": "Mazao ya mizizi",
  "Medicinal herbs": "Mimea ya dawa",
  "Pest control": "Kudhibiti wadudu",
  "Fruit trees": "Miti ya matunda",
  "Soil work": "Kazi ya udongo",
  "Seed soaking": "Kuloweka mbegu",

  /* Task categories (values stored in the database stay in English) */
  "Fertilising": "Kurutubisha",
  "Weeding": "Kupalilia",
  "Soil": "Udongo",
  "Processing": "Kuchakata",
  "Pest Control": "Kudhibiti Wadudu",
  "Seed Soaking": "Kuloweka Mbegu",
  "Medicinal Herbs": "Mimea ya Dawa",
  "Fruit Trees": "Miti ya Matunda",
  "Other": "Nyingine",

  /* Reminders */
  "Reminders due today": "Vikumbusho vya leo",
  "Reminders": "Vikumbusho",
  "· due {date}": "· ifikapo {date}",
  "Done": "Imekamilika",
  "Skip": "Ruka",

  /* Best Next 3 Days */
  "Best Next 3 Days": "Siku 3 Bora Zijazo",
  "No suitable day soon": "Hakuna siku inayofaa hivi karibuni",
  "Best for Root Crops": "Bora kwa Mazao ya Mizizi",
  "Best for Leafy Growth": "Bora kwa Ukuaji wa Majani",
  "Best for Compost & Feeding": "Bora kwa Mboji na Kulisha Mimea",
  "Plant ginger": "Panda tangawizi",
  "Plant turmeric": "Panda manjano",
  "Apply compost": "Weka mboji",
  "Weed beds": "Palilia matuta",
  "Plant spinach": "Panda mchicha",
  "Plant herbs": "Panda viungo",
  "Soak seeds": "Loweka mbegu",
  "Propagate cuttings": "Zalisha vipandikizi",
  "Turn compost": "Geuza mboji",
  "Feed plants": "Lisha mimea",
  "Light watering": "Mwagilia kidogo",
  "Harvest fresh produce": "Vuna mazao mabichi",

  /* Task modal */
  "Edit task": "Hariri kazi",
  "Add task": "Ongeza kazi",
  "Title": "Jina",
  "Plant root tubers: ginger, turmeric": "Panda mazao ya mizizi: tangawizi, manjano",
  "Date": "Tarehe",
  "Category": "Aina",
  "Status": "Hali",
  "Planned": "Imepangwa",
  "Crop / activity": "Zao / shughuli",
  "(optional)": "(hiari)",
  "Ginger, turmeric…": "Tangawizi, manjano…",
  "Assign to": "Mpe",
  "Unassigned": "Haijapewa mtu",
  "Notes": "Maelezo",
  "Reminder (optional)": "Kikumbusho (hiari)",
  "Remind me on": "Nikumbushe tarehe",
  "Reminder status": "Hali ya kikumbusho",
  "Pending": "Inasubiri",
  "Skipped": "Imerukwa",
  "Reminder note": "Ujumbe wa kikumbusho",
  "Check ginger bed, water seedlings…": "Kagua tuta la tangawizi, mwagilia miche…",
  "Saving…": "Inahifadhi…",
  "Save task": "Hifadhi kazi",
  "Cancel": "Ghairi",

  /* Task list */
  "No tasks yet.": "Bado hakuna kazi.",
  "Mark as not done": "Weka kuwa haijakamilika",
  "Mark as done": "Weka kuwa imekamilika",
  "Rolled over — originally scheduled for {date}": "Imehamishwa mbele — awali ilipangwa tarehe {date}",
  "↪ probably for {date}": "↪ huenda ni ya {date}",
  "Assigned": "Imepewa mtu",
  "Delete task": "Futa kazi",

  /* Day card */
  "Manual override": "Imebadilishwa kwa mkono",
  "Automatically calculated": "Imekokotolewa kiotomatiki",
  "Override moon phase": "Badilisha awamu ya mwezi mwenyewe",
  "Tasks ({n})": "Kazi ({n})",
  "Add": "Ongeza",
  "saving…": "inahifadhi…",
  "Observations, intentions…": "Uangalizi, malengo…",

  /* Day rows */
  "Nothing planned": "Hakuna kilichopangwa",
  "1 task": "Kazi 1",
  "{n} tasks": "Kazi {n}",
  "· {n} done": "· {n} zimekamilika",
  "Collapse day": "Kunja siku",
  "Expand day": "Panua siku",

  /* Month grid */
  "Mon": "Jmt",
  "Tue": "Jnn",
  "Wed": "Jtn",
  "Thu": "Alh",
  "Fri": "Iju",
  "Sat": "Jmo",
  "Sun": "Jpl",
  "{phase} — open day": "{phase} — fungua siku",
  "Open day": "Fungua siku",
};
