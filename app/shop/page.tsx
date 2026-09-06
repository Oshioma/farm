import type { Metadata } from "next";
import { getMarketData } from "@/lib/shop";
import type { MarketData } from "@/lib/shop";
import { MarketView } from "./MarketView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The market — produce to reserve",
  description: "Everything the farms have coming out of the ground, with the weight expected and what is still unclaimed.",
};

/* Market palette, shared with each farm's own shopfront. */
const PAPER = "#faf7f2";
const sans = "Karla, Helvetica, Arial, sans-serif";

export default async function MarketPage() {
  let market: MarketData;
  try {
    market = await getMarketData();
  } catch {
    market = { farms: [], totalExpectedKg: 0, totalAvailableKg: 0, cropCount: 0 };
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&family=Karla:wght@400;500;600;700&display=swap"
      />

      <main style={{ background: PAPER, color: "#1c1917", fontFamily: sans, minHeight: "100vh" }}>
        <MarketView market={market} />
      </main>
    </>
  );
}
