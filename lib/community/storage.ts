import { supabase } from "@/lib/supabase";

const BUCKET = "community-uploads";

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-").slice(-80);
}

export interface UploadedFile {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

// scope groups uploads under a readable prefix (a community id, a space id, or
// "onboarding" for the wizard, before a community exists) — purely organizational,
// access control is enforced by the leading auth.uid() segment (see the storage
// RLS policies in migrations/create_community_uploads_bucket.sql).
export async function uploadCommunityFile(file: File, scope: string): Promise<UploadedFile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be signed in to upload files");

  const path = `${user.id}/${scope}/${Date.now()}-${sanitizeFilename(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { url: data.publicUrl, path, name: file.name, size: file.size, type: file.type };
}

export async function deleteCommunityFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
