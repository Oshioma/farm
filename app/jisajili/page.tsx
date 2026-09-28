import type { Metadata } from "next";
import { WhatsAppSignup } from "./WhatsAppSignup";

export const metadata: Metadata = { title: "Shamba Online — jisajili kwa WhatsApp / sign up with WhatsApp" };

type Props = { searchParams: Promise<{ lang?: string }> };

/* The language is settled here, on the server, so the first thing a farmer
   sees is already in it: Kiswahili unless the link asks for English. */
export default async function WhatsAppSignupPage({ searchParams }: Props) {
  const { lang } = await searchParams;
  const explicit = lang === "en" || lang === "sw";
  return (
    <WhatsAppSignup initialLang={lang === "en" ? "en" : "sw"} explicit={explicit} />
  );
}
