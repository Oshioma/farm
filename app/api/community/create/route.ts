import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { SPACE_TYPE_CATALOG } from "@/lib/community/catalog/spaceTypes";
import { getJournalSubject } from "@/lib/community/catalog/journalSubjects";
import type { CreateCommunityRequest } from "@/lib/community/wizardTypes";

export const dynamic = "force-dynamic";

async function getAuthedUser(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => cookieStore.getAll() },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as CreateCommunityRequest | null;
  if (!body || !body.name?.trim() || !body.slug?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(body.slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: existing } = await admin.from("communities").select("id").eq("slug", body.slug).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "That URL is already taken" }, { status: 409 });
  }

  const { data: community, error: communityError } = await admin
    .from("communities")
    .insert({
      owner_id: user.id,
      name: body.name.trim(),
      slug: body.slug,
      description: body.description || null,
      logo_url: body.logoUrl || null,
      banner_url: body.bannerUrl || null,
      privacy: body.privacy,
      pricing_type: body.pricingType,
      template_key: body.templateKey,
      transformation_goal: body.transformationGoal || null,
      nav_style: body.navStyle,
      nav_collapsible: body.navCollapsible,
      status: body.launch ? "launched" : "draft",
    })
    .select()
    .single();

  if (communityError || !community) {
    return NextResponse.json({ error: communityError?.message ?? "Failed to create community" }, { status: 500 });
  }

  const communityId = community.id as string;

  try {
    const { data: ownerMember, error: memberError } = await admin
      .from("community_members")
      .insert({
        community_id: communityId,
        user_id: user.id,
        role: "owner",
        status: "active",
        display_name: user.user_metadata?.full_name ?? user.email,
      })
      .select()
      .single();
    if (memberError) throw memberError;

    if (body.pricingType === "paid" && body.plans.length) {
      const { error } = await admin.from("community_membership_plans").insert(
        body.plans.map((plan, i) => ({
          community_id: communityId,
          name: plan.name,
          price_cents: plan.price_cents,
          billing_interval: plan.billing_interval,
          features: plan.features,
          is_default: i === 0,
          sort_order: i,
        }))
      );
      if (error) throw error;
    }

    let profileFieldOrder = 0;
    if (body.profileFields.length) {
      const { error } = await admin.from("community_profile_field_defs").insert(
        body.profileFields.map((f) => ({
          community_id: communityId,
          key: f.key,
          label: f.label,
          field_type: f.field_type,
          options: f.options ?? [],
          show_in_directory: f.show_in_directory ?? false,
          filterable: f.filterable ?? false,
          sort_order: profileFieldOrder++,
        }))
      );
      if (error) throw error;
    }

    const visibleSpaces = body.spaces.filter((s) => !s.is_hidden);

    const spaceRows = body.spaces.map((s, i) => ({
      community_id: communityId,
      name: s.name,
      slug: s.slug,
      icon: s.icon,
      description: s.description || null,
      visibility: s.visibility,
      space_type: s.space_type,
      group_label: s.group_label,
      is_hidden: s.is_hidden,
      sort_order: i,
      created_by: user.id,
    }));

    const { data: insertedSpaces, error: spacesError } = await admin.from("spaces").insert(spaceRows).select();
    if (spacesError) throw spacesError;

    const spaceIdByTempSlug = new Map<string, string>();
    for (const inserted of insertedSpaces ?? []) {
      spaceIdByTempSlug.set(inserted.slug, inserted.id);
    }

    const componentRows: { space_id: string; component_type: string; sort_order: number }[] = [];
    const journalFieldRows: {
      space_id: string;
      key: string;
      label: string;
      field_type: string;
      options: string[];
      sort_order: number;
    }[] = [];

    for (const s of body.spaces) {
      const spaceId = spaceIdByTempSlug.get(s.slug);
      if (!spaceId) continue;

      const meta = SPACE_TYPE_CATALOG[s.space_type];
      meta.defaultComponents.forEach((componentType, i) => {
        componentRows.push({ space_id: spaceId, component_type: componentType, sort_order: i });
      });

      if (s.space_type === "journal") {
        const fields = s.journalFields ?? getJournalSubject(s.journalSubject ?? "custom")?.suggestedFields ?? [];
        fields.forEach((f, i) => {
          journalFieldRows.push({
            space_id: spaceId,
            key: f.key,
            label: f.label,
            field_type: f.field_type,
            options: f.options ?? [],
            sort_order: i,
          });
        });
      }
    }

    if (componentRows.length) {
      const { error } = await admin.from("space_components").insert(componentRows);
      if (error) throw error;
    }
    if (journalFieldRows.length) {
      const { error } = await admin.from("journal_field_defs").insert(journalFieldRows);
      if (error) throw error;
    }

    // Navigation: group visible spaces by group_label, ungrouped spaces at top level.
    const groupLabels = Array.from(new Set(visibleSpaces.map((s) => s.group_label).filter((g): g is string => !!g)));
    const groupIdByLabel = new Map<string, string>();

    if (groupLabels.length) {
      const { data: groups, error } = await admin
        .from("navigation_items")
        .insert(
          groupLabels.map((label, i) => ({
            community_id: communityId,
            item_type: "group",
            label,
            sort_order: i,
            is_collapsible: true,
          }))
        )
        .select();
      if (error) throw error;
      for (const g of groups ?? []) groupIdByLabel.set(g.label, g.id);
    }

    const navRows = visibleSpaces.map((s, i) => {
      const spaceId = spaceIdByTempSlug.get(s.slug);
      return {
        community_id: communityId,
        space_id: spaceId,
        parent_id: s.group_label ? (groupIdByLabel.get(s.group_label) ?? null) : null,
        item_type: "space" as const,
        label: s.name,
        icon: s.icon,
        sort_order: i,
      };
    });
    if (navRows.length) {
      const { error } = await admin.from("navigation_items").insert(navRows);
      if (error) throw error;
    }

    if (body.challenges.length) {
      const growthSpace = insertedSpaces?.find((s) => s.space_type === "challenges");
      const { error } = await admin.from("challenges").insert(
        body.challenges.map((c) => ({
          community_id: communityId,
          space_id: growthSpace?.id ?? null,
          name: c.name,
          description: c.description,
          duration_days: c.duration_days,
          points: c.points,
          daily_tasks: (c.daily_tasks ?? []).map((label) => ({ label })),
          weekly_tasks: (c.weekly_tasks ?? []).map((label) => ({ label })),
        }))
      );
      if (error) throw error;
    }

    return NextResponse.json({ community, memberId: ownerMember.id });
  } catch (err) {
    // Roll back the community (cascades clean up every dependent row) so a
    // failed wizard run never leaves a half-built community behind.
    await admin.from("communities").delete().eq("id", communityId);
    const message = err instanceof Error ? err.message : "Failed to finish setting up the community";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
