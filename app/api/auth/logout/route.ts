import { clearAuthCookie } from "@/lib/auth";
import { jsonOk } from "@/lib/http";

export async function POST() {
  clearAuthCookie();
  return jsonOk({ ok: true });
}
