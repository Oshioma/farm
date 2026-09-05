/* English UI string -> Kiswahili. Farm settings page (app/farm/settings). */
export const settings: Record<string, string> = {
  /* Page chrome */
  "Loading…": "Inapakia…",
  "Settings — managers only": "Mipangilio — kwa wasimamizi tu",
  "Settings": "Mipangilio",
  "← Back to farm": "← Rudi shambani",
  "Farm: {name}": "Shamba: {name}",

  /* Load / delete / export messages */
  "Failed to load farms": "Imeshindwa kupakia mashamba",
  "Failed to delete farm": "Imeshindwa kufuta shamba",
  "No farm data found to export.": "Hakuna data ya shamba ya kuhamisha.",
  "Export complete. Downloaded 1 CSV file with {n} rows.": "Uhamishaji umekamilika. Faili 1 la CSV lenye safu {n} limepakuliwa.",
  "Failed to export data": "Imeshindwa kuhamisha data",

  /* Shop pictures messages */
  "Could not save the picture": "Imeshindwa kuhifadhi picha",
  "Shop picture updated.": "Picha ya duka imebadilishwa.",
  "Could not remove the picture": "Imeshindwa kuondoa picha",
  "Shop picture removed.": "Picha ya duka imeondolewa.",
  "Produce photo updated.": "Picha ya mazao imebadilishwa.",
  "Could not save that photo": "Imeshindwa kuhifadhi picha hiyo",

  /* Location messages */
  "Location is not available on this device.": "Huduma ya mahali haipatikani kwenye kifaa hiki.",
  "Allow location access to save the farm position.": "Ruhusu ufikiaji wa mahali ili kuhifadhi eneo la shamba.",
  "Could not save location": "Imeshindwa kuhifadhi eneo",
  "Farm position saved for nearest-farm sorting.": "Eneo la shamba limehifadhiwa kwa kupanga mashamba ya karibu zaidi.",

  /* Growing practices messages */
  "Could not save growing practices": "Imeshindwa kuhifadhi mbinu za kilimo",
  "Growing practice information saved. Certification evidence must be independently verified before a verified badge appears.":
    "Taarifa za mbinu za kilimo zimehifadhiwa. Ushahidi wa cheti lazima uthibitishwe kwa uhuru kabla ya beji ya uthibitisho kuonekana.",

  /* Fulfilment messages */
  "Could not save collection and delivery details": "Imeshindwa kuhifadhi maelezo ya kuchukua na usafirishaji",
  "Buyer collection and delivery details saved.": "Maelezo ya wanunuzi ya kuchukua na usafirishaji yamehifadhiwa.",

  /* Listing messages */
  "Could not change the listing": "Imeshindwa kubadilisha hali ya duka la umma",
  "This farm is now public.": "Shamba hili sasa ni la umma.",
  "This farm is no longer public.": "Shamba hili si la umma tena.",

  /* Growing practices section */
  "Growing practices": "Mbinu za kilimo",
  "Tell buyers how you grow. “Organic practices” is a farmer declaration; Shamba only shows a verified certification badge after the evidence is independently checked.":
    "Waeleze wanunuzi jinsi unavyolima. “Kilimo hai” ni tamko la mkulima; Shamba huonyesha beji ya cheti kilichothibitishwa tu baada ya ushahidi kukaguliwa kwa uhuru.",
  "Growing approach": "Njia ya kilimo",
  "Not specified": "Haijabainishwa",
  "Uses organic practices": "Hutumia mbinu za kilimo hai",
  "Regenerative practices": "Mbinu za kilimo rejeshi",
  "Conventional farming": "Kilimo cha kawaida",
  "How you grow": "Jinsi unavyolima",
  "For example: compost inputs, pest controls, seed sources and what you do not use":
    "Kwa mfano: matumizi ya mboji, udhibiti wa wadudu, vyanzo vya mbegu na usichokitumia",
  "Optional certification evidence": "Ushahidi wa cheti (hiari)",
  "Certifying organisation": "Shirika linalotoa cheti",
  "Certificate reference": "Namba ya kumbukumbu ya cheti",
  "Evidence link (https://…)": "Kiungo cha ushahidi (https://…)",
  "Certification currently verified. Editing and saving these details will require verification again.":
    "Cheti kimethibitishwa kwa sasa. Ukihariri na kuhifadhi maelezo haya, uthibitisho utahitajika tena.",
  "Evidence supplied here is not presented as verified until an administrator checks it.":
    "Ushahidi uliotolewa hapa hauonyeshwi kama umethibitishwa hadi msimamizi wa mfumo aukague.",
  "Saving…": "Inahifadhi…",
  "Save growing practices": "Hifadhi mbinu za kilimo",

  /* Public shop section */
  "Public shop": "Duka la umma",
  "Off by default. While it is off, this farm appears nowhere public — not in the market, and not at its own shop address either. Turning it on publishes the crops that have an expected harvest, the weight expected, and how much is unclaimed. Customer details are never shown.":
    "Limezimwa kwa kawaida. Likiwa limezimwa, shamba hili halionekani popote hadharani — si sokoni, wala kwenye anwani ya duka lake lenyewe. Ukiliwasha, mazao yenye mavuno yanayotarajiwa, uzito unaotarajiwa na kiasi ambacho hakijachukuliwa huchapishwa. Taarifa za wateja hazionyeshwi kamwe.",
  "Position for nearest-farm sorting": "Eneo kwa kupanga mashamba ya karibu zaidi",
  "Save the farm’s approximate public position. Buyers only use their own location after tapping “Sort by nearest”.":
    "Hifadhi eneo la takriban la shamba linaloonekana hadharani. Wanunuzi hutumia mahali walipo tu baada ya kubofya “Panga kwa ukaribu”.",
  "Use this device’s location": "Tumia mahali pa kifaa hiki",
  "Save position": "Hifadhi eneo",
  "Public phone or WhatsApp number": "Namba ya simu au WhatsApp ya umma",
  "How buyers receive orders": "Jinsi wanunuzi wanavyopokea oda",
  "Collection only": "Kuchukua tu",
  "Delivery only": "Usafirishaji tu",
  "Collection or delivery": "Kuchukua au usafirishaji",
  "Collection instructions": "Maelekezo ya kuchukua mazao",
  "Where to collect, useful directions and available times": "Mahali pa kuchukua, maelekezo ya njia na muda unaopatikana",
  "Delivery area and arrangements": "Eneo la usafirishaji na mpangilio wake",
  "Areas covered, delivery days and whether a fee applies": "Maeneo yanayofikiwa, siku za usafirishaji na kama kuna ada",
  "Save buyer information": "Hifadhi taarifa za wanunuzi",
  "The database does not have the market column yet. Run the pending migration and this switch will work.":
    "Hifadhidata bado haina safu ya soko. Endesha uhamishaji unaosubiri na swichi hii itafanya kazi.",
  "Saving...": "Inahifadhi...",
  "Take this farm off the market": "Ondoa shamba hili sokoni",
  "Publish this farm to the market": "Chapisha shamba hili sokoni",
  "Public": "La umma",
  "Not public": "Si la umma",
  "View the shop": "Tazama duka",

  /* Shop pictures section */
  "Shop pictures": "Picha za duka",
  "One picture for the top of the shop, and a photo of the produce for each crop — the harvested vegetable rather than the plant in the ground. Where a crop has no produce photo, the shop falls back to its plant photo from the Crops page.":
    "Picha moja ya juu ya duka, na picha ya mazao kwa kila zao — mboga iliyovunwa badala ya mmea ulio shambani. Zao lisilo na picha ya mazao, duka hutumia picha ya mmea wake kutoka ukurasa wa Mazao.",
  "Top of the shop": "Juu ya duka",
  "Shop header": "Picha ya juu ya duka",
  "No picture": "Hakuna picha",
  "Uploading...": "Inapakia...",
  "Swap picture": "Badilisha picha",
  "Add picture": "Ongeza picha",
  "Remove": "Ondoa",
  "Produce photos": "Picha za mazao",
  "No crops on this farm yet.": "Bado hakuna mazao kwenye shamba hili.",
  "No photo": "Hakuna picha",
  "Swap": "Badilisha",
  "Add": "Ongeza",
  "Showing the plant photo": "Inaonyesha picha ya mmea",
  "Only crops with an expected harvest appear in the shop, so a photo here shows up once that crop has an estimate on the Harvest ETA sheet. Plant photos are taken on the Crops page.":
    "Ni mazao yenye mavuno yanayotarajiwa tu ndiyo huonekana dukani, hivyo picha ya hapa itaonekana zao hilo litakapokuwa na makadirio kwenye jedwali la Muda wa Mavuno. Picha za mimea hupigwa kwenye ukurasa wa Mazao.",

  /* Data export section */
  "Data Export": "Kuhamisha Data",
  "Download all data for this farm in a single CSV file for backup, reporting, or offline work.":
    "Pakua data yote ya shamba hili katika faili moja la CSV kwa ajili ya nakala rudufu, ripoti, au kazi bila mtandao.",
  "Exporting...": "Inahamisha...",
  "Export farm data (CSV)": "Hamisha data ya shamba (CSV)",

  /* Danger zone */
  "Danger Zone": "Eneo la Hatari",
  "Permanently delete this farm and all its data.": "Futa kabisa shamba hili na data yake yote.",
  "Delete farm": "Futa shamba",
  "Are you sure you want to delete “{name}”?": "Una uhakika unataka kufuta “{name}”?",
  "Yes, delete": "Ndiyo, futa",
  "Cancel": "Ghairi",
  "This cannot be undone. All farm data will be lost.": "Hili haliwezi kutenduliwa. Data yote ya shamba itapotea.",
  "Deleting…": "Inafuta…",
  "Permanently delete": "Futa kabisa",
};
