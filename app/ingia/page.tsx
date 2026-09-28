import type { Metadata } from "next";
import { PhoneLogin } from "./PhoneLogin";

export const metadata: Metadata = { title: "Shamba Online — ingia / sign in" };

type Props = { searchParams: Promise<{ lang?: string; phone?: string; redirectTo?: string }> };

/* The language is settled here, on the server, so the first thing a farmer
   sees is already in it: Kiswahili unless the link asks for English. */
export default async function PhoneLoginPage({ searchParams }: Props) {
  const { lang, phone, redirectTo } = await searchParams;
  const explicit = lang === "en" || lang === "sw";
  return (
    <PhoneLogin
      initialLang={lang === "en" ? "en" : "sw"}
      explicit={explicit}
      initialPhone={phone ?? ""}
      next={redirectTo ?? "/farm"}
    />
  );
}
