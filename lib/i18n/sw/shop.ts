/* English UI string -> Kiswahili. The public shopfront buyers see
   (app/[farm]/Shopfront.tsx). Keys are the exact English text rendered
   there, placeholders included; see lib/i18n.tsx for how they are filled. */
export const shop: Record<string, string> = {
  /* ── top bar ── */
  "Manage farm": "Simamia shamba",
  "Add crops": "Ongeza mazao",
  "Your pre-order · {n}": "Oda yako ya awali · {n}",
  "Nothing reserved yet": "Bado hujahifadhi chochote",

  /* ── hero ── */
  "Claim your share before it is picked.": "Weka oda yako kabla mazao hayajavunwa.",
  "Everything on this page is already in the ground with a harvest expected against it. Reserve the kilos you want, and collect them the week they come out.":
    "Kila kitu kwenye ukurasa huu tayari kimepandwa na mavuno yanatarajiwa. Hifadhi kilo unazotaka, na uzichukue wiki yatakapovunwa.",
  "See what’s coming": "Ona yanayokuja",
  "crops with a harvest date": "mazao yenye tarehe ya mavuno",
  "expected this season": "yanatarajiwa msimu huu",
  "already reserved": "tayari yamehifadhiwa",
  "Produce from {farm}": "Mazao kutoka {farm}",
  "Picked to order, never held in cold store.": "Yanavunwa kwa oda yako, hayahifadhiwi kwenye jokofu.",
  "Illustration of planted beds": "Mchoro wa matuta yaliyopandwa",

  /* ── growing practice ── */
  "Farming that restores the land": "Kilimo kinachorejesha afya ya ardhi",
  "Regenerative practices": "Kilimo endelevu cha kurejesha ardhi",
  "This farm says it grows to rebuild soil, encourage biodiversity and leave the land healthier for the next harvest.":
    "Shamba hili linasema linalima kwa kujenga upya udongo, kukuza bioanuwai na kuacha ardhi ikiwa na afya zaidi kwa mavuno yajayo.",
  "Organic certification verified": "Cheti cha kilimo hai kimethibitishwa",
  "Farmer-declared organic practices": "Mkulima anasema anatumia kilimo hai",
  "Conventional farming": "Kilimo cha kawaida",
  "Certification evidence:": "Ushahidi wa cheti:",
  "View evidence": "Ona ushahidi",
  "Evidence supplied by the farmer; not yet independently verified by Shamba.":
    "Ushahidi umetolewa na mkulima; bado haujathibitishwa na Shamba.",

  /* ── season strip ── */
  "The season ahead": "Msimu ujao",
  "What is coming, and when": "Yanayokuja, na lini",
  "Weights are the farm's own estimates, updated as the crop grows.":
    "Uzito ni makadirio ya shamba lenyewe, yanasasishwa kadri mazao yanavyokua.",
  "{n} crop": "zao {n}",
  "{n} crops": "mazao {n}",
  "picking now": "yanavunwa sasa",

  /* month labels (lib/harvest HARVEST_MONTHS) */
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

  /* ── produce list ── */
  "Open for pre-order": "Oda za awali zinapokelewa",
  "Produce with a harvest date": "Mazao yenye tarehe ya mavuno",
  "If a crop has no expected harvest against it, it is not listed here. Nothing is sold on a maybe.":
    "Zao lisilo na mavuno yanayotarajiwa haliorodheshwi hapa. Hakuna kinachouzwa kwa kubahatisha.",
  "Nothing is expected out of the ground just now. Check back next season.":
    "Hakuna mazao yanayotarajiwa kwa sasa. Rudi tena msimu ujao.",
  "bed {beds}": "tuta {beds}",
  "Bed {beds}": "Tuta {beds}",
  "{kg} expected": "{kg} yanatarajiwa",
  "{kg} free": "{kg} zipo",
  "/ kg": "/ kilo",
  "Price on collection": "Bei wakati wa kuchukua",
  "Reserve": "Hifadhi",

  /* ── how it works ── */
  "Three steps, no card needed": "Hatua tatu, bila kadi ya benki",
  "Step one": "Hatua ya kwanza",
  "Reserve your kilos": "Hifadhi kilo zako",
  "Pick a crop, pick the month it is coming out, and say how many kilos you want from it.":
    "Chagua zao, chagua mwezi wa mavuno, na useme unataka kilo ngapi.",
  "Step two": "Hatua ya pili",
  "We pick to your order": "Tunavuna kulingana na oda yako",
  "You hear from us the week it is ready with the real weight. Short of a good crop, we tell you early rather than late.":
    "Tutakujulisha wiki yatakapokuwa tayari pamoja na uzito halisi. Mavuno yakipungua, tutakuambia mapema badala ya kuchelewa.",
  "Step three": "Hatua ya tatu",
  "Collect and settle": "Chukua na ulipe",
  "Collect on the agreed day and pay then. Nothing is charged when you reserve.":
    "Chukua siku iliyokubaliwa na ulipe wakati huo. Hakuna malipo unapohifadhi.",

  /* ── getting your order ── */
  "Getting your order": "Kupata oda yako",
  "Collect from the farm": "Chukua shambani",
  "Delivery is available": "Usafirishaji unapatikana",
  "Collect or arrange delivery": "Chukua au panga usafirishaji",
  "Ask the farm on WhatsApp": "Uliza shamba kwa WhatsApp",

  /* ── footer ── */
  "Prices are per kilo and settled on the day at the weighed amount. Estimates move with the weather — we would rather say so than promise a number we cannot pick.":
    "Bei ni kwa kilo na hulipwa siku hiyo kulingana na uzito uliopimwa. Makadirio hubadilika na hali ya hewa — tunapendelea kusema ukweli kuliko kuahidi kiasi tusichoweza kuvuna.",

  /* ── reserve sheet ── */
  "Harvest month": "Mwezi wa mavuno",
  "Expected in {month}": "Yanatarajiwa {month}",
  "How many kilos": "Kilo ngapi",
  "All {kg}": "Zote {kg}",
  "Only {kg} is still unclaimed that month.": "Ni {kg} tu zilizobaki mwezi huo.",
  "of {crop} in {month}": "za {crop} mwezi wa {month}",
  "about {amount}": "takriban {amount}",
  "We pick to the weight you reserve and weigh it on the day. If the crop falls short, we tell you early rather than late.":
    "Tunavuna kulingana na uzito uliohifadhi na kupima siku hiyo. Mavuno yakipungua, tutakuambia mapema badala ya kuchelewa.",
  "The farm expects \"{expected}\" that month, so say how many kilos you would like and they will confirm.":
    "Shamba linatarajia \"{expected}\" mwezi huo, hivyo sema unataka kilo ngapi na watathibitisha.",
  "Say how many kilos you would like.": "Sema unataka kilo ngapi.",
  "Add to pre-order": "Ongeza kwenye oda ya awali",
  "Cancel": "Ghairi",

  /* ── checkout ── */
  "Your pre-order": "Oda yako ya awali",
  "Remove": "Ondoa",
  "Reserved weight": "Uzito uliohifadhiwa",
  "Indicative value": "Thamani ya makadirio",
  "To pay now": "Malipo ya sasa",
  "Nothing": "Hakuna",
  "Name or business *": "Jina lako au biashara *",
  "Green Grocer Ltd": "Duka la Mboga Ltd",
  "Who we ask for": "Tumuulize nani",
  "Telephone": "Namba ya simu",
  "Email": "Barua pepe",
  "Anything we should know": "Kitu chochote tunachopaswa kujua",
  "Collection day, packing, delivery…": "Siku ya kuchukua, ufungaji, usafirishaji…",
  "Leave a telephone number or an email address so the farm can confirm.":
    "Acha namba ya simu au barua pepe ili shamba liweze kuthibitisha.",
  "Sending…": "Inatuma…",
  "Send reservation": "Tuma oda",
  "Keep looking": "Endelea kuangalia",
  "Could not send your pre-order.": "Imeshindikana kutuma oda yako ya awali.",

  /* ── confirmation ── */
  "Reserved. We will pick it for you.": "Imehifadhiwa. Tutakuvunia.",
  "Reference {reference}": "Kumbukumbu {reference}",
  "{farm} will be in touch to confirm. Nothing has been charged — you settle on collection, for the weight actually picked.":
    "{farm} watawasiliana nawe kuthibitisha. Hakuna malipo yaliyofanyika — utalipa wakati wa kuchukua, kwa uzito halisi uliovunwa.",
  "Track your reservation": "Fuatilia oda yako",
  "Done": "Sawa",
};
