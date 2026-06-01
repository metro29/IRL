import { createClient } from "@/lib/supabase/client";

export async function uploadProofPhoto(
  file: File,
  folder: "attendance" | "challenges",
  userId: string
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const path = `${folder}/${userId}/${crypto.randomUUID()}.${safeExt}`;

  const { error } = await supabase.storage.from("proofs").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("proofs").getPublicUrl(path);

  return publicUrl;
}
