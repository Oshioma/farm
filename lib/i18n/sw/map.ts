/* English UI string -> Kiswahili. Farm map (app/farm/components/FarmMap.tsx). */
export const map: Record<string, string> = {
  // Toolbar
  "Saving…": "Inahifadhi…",
  "Save Layout": "Hifadhi Mpangilio",
  "Cancel": "Ghairi",
  "Bed name (e.g. R1)": "Jina la kitanda (mf. R1)",
  "Add": "Ongeza",
  "+ Add Bed": "+ Ongeza Kitanda",
  "Label text": "Maandishi ya lebo",
  "+ Add Text": "+ Ongeza Maandishi",
  "+ Add Seedling Zone": "+ Ongeza Eneo la Miche",
  "Upload Map Image": "Pakia Picha ya Ramani",
  "Remove Background": "Ondoa Mandhari",
  "Edit Map": "Hariri Ramani",
  "Upload Your Farm Map": "Pakia Ramani ya Shamba Lako",

  // Blank-farm prompt
  "No map configured for this farm": "Hakuna ramani iliyowekwa kwa shamba hili",
  "Upload an aerial photo or sketch of your farm, then place beds on top of it.":
    "Pakia picha ya angani au mchoro wa shamba lako, kisha weka vitanda juu yake.",
  "Upload Farm Map": "Pakia Ramani ya Shamba",

  // Edit-mode hint
  "Drag beds & labels to move them. Drag corners to resize beds. Double-click text to edit it.":
    "Buruta vitanda na lebo ili kuvihamisha. Buruta pembe ili kubadilisha ukubwa wa vitanda. Bofya maandishi mara mbili ili kuyahariri.",

  // Map objects
  "Seedling Zone": "Eneo la Miche",
  "Row": "Mstari",
  "Bed": "Kitanda",

  // Edit side panel
  "Editing: {bed}": "Inahariri: {bed}",
  "Position: ({x}, {y})": "Mahali: ({x}, {y})",
  "Size: {w} x {h}": "Ukubwa: {w} x {h}",
  "Delete Bed": "Futa Kitanda",
  "Edit Text": "Hariri Maandishi",
  "Label text (use newlines for multi-line)": "Maandishi ya lebo (tumia mistari mipya kwa mistari mingi)",
  "Save Text": "Hifadhi Maandishi",
  "Delete Label": "Futa Lebo",

  // Seedling-zone details panel
  "Close": "Funga",
  "1 tray": "Trei 1",
  "{n} trays": "Trei {n}",
  " · linked to \"{zone}\"": " · imeunganishwa na \"{zone}\"",
  " · all trays": " · trei zote",
  "No trays on the seedling map yet. Add some on the Seedlings page.":
    "Bado hakuna trei kwenye ramani ya miche. Ongeza kwenye ukurasa wa Miche.",
  "Empty": "Tupu",
  "Open seedling map →": "Fungua ramani ya miche →",

  // Bed details panel
  "Bed link: {name}": "Kiungo cha kitanda: {name}",
  " · {n} ac": " · ekari {n}",
  "No crops in this bed": "Hakuna mazao kwenye kitanda hiki",
  "Plants": "Mimea",
  "Unnamed": "Bila jina",
  "Fertiliser": "Mbolea",
  "Compost": "Mboji",
  "Mulch": "Matandazo",
  "Pest control": "Udhibiti wa wadudu",
  "1 time": "Mara 1",
  "{n} times": "Mara {n}",
  "Target: {pest}": "Lengo: {pest}",
  "Next: {date}": "Ijayo: {date}",
  "This bed is still syncing. Save the map layout to auto-link it.":
    "Kitanda hiki bado kinasawazishwa. Hifadhi mpangilio wa ramani ili kiunganishwe kiotomatiki.",
  "Harvest ETA": "Makadirio ya Mavuno",
  "Harvest: {date}": "Mavuno: {date}",
  "Companions: {plants}": "Mimea rafiki: {plants}",
  "+ Add crop to {bed}": "+ Ongeza zao kwenye {bed}",
  "Quick add action": "Ongeza haraka",
  "+ Fertiliser": "+ Mbolea",
  "+ Compost": "+ Mboji",
  "+ Mulch": "+ Matandazo",
  "+ Pest control": "+ Udhibiti wa wadudu",
  "Click a row on the map to see details": "Bofya mstari kwenye ramani ili kuona maelezo",
  "Click a bed on the map to see details": "Bofya kitanda kwenye ramani ili kuona maelezo",

  // Crop status values as shown in the bed panel (database values, display only)
  "planned": "imepangwa",
  "planted": "imepandwa",
  "germinating": "inaota",
  "growing": "inakua",
  "harvest_ready": "tayari kuvunwa",
  "harvested": "imevunwa",

  // Month abbreviations in the harvest ETA grid
  "Jan": "Jan",
  "Feb": "Feb",
  "Mar": "Mac",
  "Apr": "Apr",
  "May": "Mei",
  "Jun": "Jun",
  "Jul": "Jul",
  "Aug": "Ago",
  "Sep": "Sep",
  "Oct": "Okt",
  "Nov": "Nov",
  "Dec": "Des",

  // Legend
  "Legend": "Ufunguo",
  "Unmapped": "Haijaunganishwa",
  "Planned": "Imepangwa",
  "Planted": "Imepandwa",
  "Growing": "Inakua",
  "Harvest ready": "Tayari kuvunwa",
  "Pest control treatments": "Matibabu ya udhibiti wa wadudu",
};
