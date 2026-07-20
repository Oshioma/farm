import { SpaceTypeFilterView } from "@/app/community/[slug]/admin/_lib/SpaceTypeFilterView";

export default function EventsAdminPage() {
  return (
    <SpaceTypeFilterView
      spaceTypes={["events", "calendar", "livestreams"]}
      title="Events"
      description="Upcoming and past events, calendars and livestreams across your community."
      emptyIcon="calendar-days"
    />
  );
}
