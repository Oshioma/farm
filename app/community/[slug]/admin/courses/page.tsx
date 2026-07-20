import { SpaceTypeFilterView } from "@/app/community/[slug]/admin/_lib/SpaceTypeFilterView";

export default function CoursesAdminPage() {
  return (
    <SpaceTypeFilterView
      spaceTypes={["courses", "podcasts"]}
      title="Courses"
      description="Structured lessons and audio content members progress through."
      emptyIcon="graduation-cap"
    />
  );
}
