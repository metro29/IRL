import { createClient } from "@/lib/supabase/client";

/** Object path: {groupId}/{userId}/{file} in the dedicated `chat` bucket (not proofs). */
export async function uploadChatImage(
  file: File,
  groupId: string,
  userId: string
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const path = `${groupId}/${userId}/${crypto.randomUUID()}.${safeExt}`;

  const { error } = await supabase.storage.from("chat").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("chat").getPublicUrl(path);

  return publicUrl;
}
