"use server";

import { requireUser } from "@/lib/auth";
import { sniffMime } from "@/lib/crypto";
import { back } from "@/lib/flash";
import { limit } from "@/lib/rate-limit";
import { kycSchema } from "@/lib/validations";

const MAX = 4 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

async function readFile(f: FormDataEntryValue | null, required: boolean): Promise<{ bytes: Uint8Array; mime: string } | null> {
  if (!(f instanceof File) || f.size === 0) return required ? null : null;
  if (f.size > MAX) throw new Error("file_too_large");
  const bytes = new Uint8Array(await f.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime) throw new Error("file_type");
  return { bytes, mime };
}

export async function submitKyc(fd: FormData) {
  const P = "/dashboard/kyc";
  const { sb, user, profile } = await requireUser(P);
  if (!["none", "rejected"].includes(profile.kyc_status)) back(P, "error", "kyc_not_allowed");
  const parsed = kycSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(P, "error", "invalid_input");
  if (!(await limit(sb, "kyc", 5, 86400, `:${user.id}`))) back(P, "error", "too_many");

  let front, back_, selfie;
  try {
    front = await readFile(fd.get("id_front"), true);
    back_ = await readFile(fd.get("id_back"), false);
    selfie = await readFile(fd.get("selfie"), true);
  } catch (e: any) {
    back(P, "error", e?.message === "file_too_large" ? "file_too_large" : "file_type");
  }
  if (!front || !selfie) back(P, "error", "kyc_files_missing");

  const id = crypto.randomUUID();
  const paths: string[] = [];
  const up = async (name: string, f: { bytes: Uint8Array; mime: string }) => {
    const path = `${user.id}/${id}-${name}.${EXT[f.mime]}`;
    const { error } = await sb.storage.from("kyc").upload(path, f.bytes, { contentType: f.mime, upsert: false });
    if (error) throw new Error("upload_failed");
    paths.push(path);
    return path;
  };
  try {
    const id_front_path = await up("front", front!);
    const id_back_path = back_ ? await up("back", back_) : null;
    const selfie_path = await up("selfie", selfie!);
    const { error } = await sb.from("kyc_submissions").insert({
      user_id: user.id,
      legal_name: parsed.data.legal_name,
      country: parsed.data.country,
      doc_type: parsed.data.doc_type,
      id_front_path,
      id_back_path,
      selfie_path,
    });
    if (error) throw new Error("save_failed");
  } catch {
    if (paths.length) await sb.storage.from("kyc").remove(paths);
    back(P, "error", "kyc_failed");
  }
  back(P, "msg", "kyc_submitted");
}
