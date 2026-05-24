import { jsonOk } from "@/lib/http";

export async function POST() {
  console.info("[easyaccess] webhook ignored because EasyAccess is disabled; active provider is vtpass");
  return jsonOk({ received: true, ignored: true, provider: "vtpass" });
}
