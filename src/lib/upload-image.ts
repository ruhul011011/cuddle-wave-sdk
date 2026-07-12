import { supabase } from "@/integrations/supabase/client";

export async function uploadArticleImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image is too large (max 8MB).");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("article-images").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);

  // Bucket is private; use a long-lived signed URL (10 years).
  const { data, error: sErr } = await supabase.storage
    .from("article-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (sErr || !data?.signedUrl) throw new Error(sErr?.message || "Failed to get image URL");
  return data.signedUrl;
}
