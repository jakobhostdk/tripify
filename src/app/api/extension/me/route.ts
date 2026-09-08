import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) {
    return Response.json(
      { signedIn: false },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(
    { signedIn: true, user: { id: me.id, username: me.username } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
