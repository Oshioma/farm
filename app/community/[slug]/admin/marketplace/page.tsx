import { SpaceTypeFilterView } from "@/app/community/[slug]/admin/_lib/SpaceTypeFilterView";

export default function MarketplaceAdminPage() {
  return (
    <SpaceTypeFilterView
      spaceTypes={["marketplace", "donations"]}
      title="Marketplace"
      description="Where members buy, sell, trade or fundraise."
      emptyIcon="store"
    />
  );
}
