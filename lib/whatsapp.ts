/* WhatsApp deep links and the messages the admin sends by tapping them.
   Nothing here talks to WhatsApp: the app prepares the text, a person presses
   Send. Safe to import from server routes and client components alike. */

export type InviteLang = "en" | "sw";
export type InviteStep = "farm" | "location" | "crop" | "done";

/** Tanzanian numbers: 07xx… becomes 2557xx…; a leading + is dropped. Digits only. */
export function normalisePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("0")) return `255${digits.slice(1)}`;
  return digits;
}

export function whatsappLink(phone: string, text: string): string {
  const number = normalisePhone(phone);
  const query = `?text=${encodeURIComponent(text)}`;
  return number ? `https://wa.me/${number}${query}` : `https://wa.me/${query}`;
}

type Vars = { name: string; link: string; farm?: string | null; shopLink?: string | null };

const messages: Record<InviteLang, Record<InviteStep | "invite", (v: Vars) => string>> = {
  en: {
    invite: ({ name, link }) =>
      `Hello ${name}, welcome to Shamba Online. Tap this link to set up your farm shop. It takes two minutes and no login is needed:\n${link}`,
    farm: ({ name, link }) =>
      `Hello ${name}, your Shamba farm shop is waiting. Tap to name your farm:\n${link}`,
    location: ({ name, link, farm }) =>
      `Hello ${name}, one more step for ${farm ?? "your farm"}. Tap to add where the farm is:\n${link}`,
    crop: ({ name, link, farm }) =>
      `Hello ${name}, ${farm ?? "your farm"} is almost ready. Tap to add your first crop and open your shop:\n${link}`,
    done: ({ name, farm, shopLink }) =>
      `Hello ${name}, the ${farm ?? "farm"} shop is live. Share this link with buyers:\n${shopLink ?? ""}`,
  },
  sw: {
    invite: ({ name, link }) =>
      `Habari ${name}, karibu Shamba Online. Bonyeza kiungo hiki kuandaa duka la shamba lako. Inachukua dakika mbili na hakuna kuingia kunahitajika:\n${link}`,
    farm: ({ name, link }) =>
      `Habari ${name}, duka la shamba lako kwenye Shamba linakusubiri. Bonyeza ulipe jina shamba lako:\n${link}`,
    location: ({ name, link, farm }) =>
      `Habari ${name}, hatua moja zaidi kwa ${farm ?? "shamba lako"}. Bonyeza uweke eneo la shamba:\n${link}`,
    crop: ({ name, link, farm }) =>
      `Habari ${name}, ${farm ?? "shamba lako"} liko karibu kukamilika. Bonyeza uongeze zao lako la kwanza na ufungue duka:\n${link}`,
    done: ({ name, farm, shopLink }) =>
      `Habari ${name}, duka la ${farm ?? "shamba"} sasa liko hewani. Shiriki kiungo hiki na wanunuzi:\n${shopLink ?? ""}`,
  },
};

/** The first message, sent when the invite is created. */
export function inviteMessage(lang: InviteLang, vars: Vars): string {
  return messages[lang].invite(vars);
}

/** A stage-aware reminder for a farmer who has not finished. */
export function nudgeMessage(lang: InviteLang, step: InviteStep, vars: Vars): string {
  return messages[lang][step](vars);
}
