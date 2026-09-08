import { readCachedMap } from "@/lib/static-map";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  // Trip ID is alphanumeric per ids.ts — defend the filesystem from anything else.
  if (!/^[a-z0-9]{6,20}$/.test(id)) {
    return new Response("not found", { status: 404 });
  }

  const bytes = await readCachedMap(id);
  if (!bytes) return new Response("not found", { status: 404 });

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
