"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { createRelease, DomainError, recordChange, type ChangeInput, type FileInput } from "@/lib/releases";
import { requireAdmin } from "@/lib/session";
import { STATUSES, type Status } from "@/lib/types";

export type FormState = { error?: string; ok?: number } | undefined;

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 8;
const TEXT_EXT = /\.(txt|md|markdown|log|csv|json)$/i;

// Identify uploads by their content rather than trusting the browser's MIME type.
function sniff(name: string, b: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return "application/zip";
  if (TEXT_EXT.test(name) && !b.includes(0)) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(b);
      return name.toLowerCase().endsWith(".json") ? "application/json" : name.match(/\.(md|markdown)$/i) ? "text/markdown" : "text/plain";
    } catch {
      return null;
    }
  }
  return null;
}

async function readFiles(fd: FormData): Promise<FileInput[]> {
  const list = fd.getAll("files").filter((v): v is File => v instanceof File && v.size > 0);
  if (list.length > MAX_FILES) throw new DomainError(`Attach at most ${MAX_FILES} files at a time.`);
  if (list.reduce((a, f) => a + f.size, 0) > MAX_FILE_BYTES) throw new DomainError("Attachments must total 4 MB or less per upload.");
  const out: FileInput[] = [];
  for (const f of list) {
    const data = new Uint8Array(await f.arrayBuffer());
    const name = f.name.slice(0, 120) || "file";
    const mime = sniff(name, data);
    if (!mime) throw new DomainError(`"${name}" isn't a supported file. Use images, PDF, ZIP or text files.`);
    out.push({ name, mime, data });
  }
  return out;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function fail(e: unknown): FormState {
  if (e instanceof DomainError) return { error: e.message };
  console.error(e);
  return { error: "Something went wrong. Nothing was recorded." };
}

function refresh(id?: number) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/admin/releases/${id}`);
}

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name").slice(0, 60);
  if (!name) return { error: "Enter your name. It's recorded on every change you make." };
  if (!(await checkPassword(str(fd, "password")))) return { error: "Incorrect password." };
  const { token, maxAge } = await createSessionToken(name);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}

export async function createReleaseAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireAdmin();
  let id: number;
  try {
    const product = str(fd, "product");
    id = await createRelease(
      {
        productId: product && product !== "new" ? Number(product) : undefined,
        newProductName: product === "new" ? str(fd, "newProduct") : undefined,
        version: str(fd, "version"),
        title: str(fd, "title"),
        description: str(fd, "description"),
        owner: str(fd, "owner"),
        targetDate: str(fd, "targetDate") || null,
        items: fd.getAll("item").map(String),
        files: await readFiles(fd),
      },
      actor,
    );
  } catch (e) {
    return fail(e);
  }
  refresh();
  redirect(`/admin/releases/${id}?created=1`);
}

/** One entry point for every change on the release admin page; `kind` picks the change. */
export async function changeAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireAdmin();
  const id = Number(fd.get("releaseId"));
  try {
    const kind = str(fd, "kind");
    const note = str(fd, "note") || undefined;
    let input: ChangeInput;
    switch (kind) {
      case "STATUS": {
        const to = str(fd, "to") as Status;
        if (!STATUSES.includes(to)) throw new DomainError("Choose a new status.");
        input = { kind, to, note, override: fd.get("override") === "on" };
        break;
      }
      case "TOGGLE":
        input = { kind, itemId: Number(fd.get("itemId")), done: fd.get("done") === "1" };
        break;
      case "ITEM_ADDED":
        input = { kind, label: str(fd, "label") };
        break;
      case "OWNER":
        input = { kind, owner: str(fd, "owner"), note };
        break;
      case "TARGET_DATE":
        input = { kind, date: str(fd, "targetDate") || null, note };
        break;
      case "NOTE":
        input = { kind, note: note ?? "", files: await readFiles(fd) };
        break;
      default:
        throw new DomainError("Unknown change.");
    }
    await recordChange(id, input, actor);
  } catch (e) {
    return fail(e);
  }
  refresh(id);
  return { ok: Date.now() };
}
