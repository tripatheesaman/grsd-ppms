import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/api/response";
import { formatPlaceholderGuide } from "@/lib/documents/placeholders";
import { requireAnyPermission } from "@/lib/security/auth-guard";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireAnyPermission(request as never, ["settings.view", "templates.manage"]);
    const content = formatPlaceholderGuide();
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ppms-placeholder-guide.txt"',
      },
    });
  });
}
