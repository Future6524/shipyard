import { getFile } from "@/lib/releases";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  const file = Number.isInteger(id) ? await getFile(id) : null;
  if (!file) return new Response("Not found", { status: 404 });
  const inline = file.mime.startsWith("image/");
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
  return new Response(file.data, {
    headers: {
      "Content-Type": file.mime,
      // Images show inline; everything else downloads, so uploads never render as pages.
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"`,
      // Files are immutable rows, so they can be cached forever.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
