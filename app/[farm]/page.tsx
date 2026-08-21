import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getShopData } from "@/lib/shop";
import { Shopfront } from "./Shopfront";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ farm: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { farm } = await params;
  const shop = await getShopData(farm).catch(() => null);
  if (!shop) return { title: "Farm shop" };
  return {
    title: `${shop.farm.name} — produce to reserve`,
    description: `Reserve a share of what ${shop.farm.name} is growing. Everything listed has a harvest expected against it.`,
  };
}

export default async function FarmShopPage({ params }: Props) {
  const { farm } = await params;

  let shop = null;
  try {
    shop = await getShopData(farm);
  } catch {
    notFound();
  }
  if (!shop) notFound();

  return <Shopfront shop={shop} />;
}
