import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { closeExpiredBidOpenDays, runReminders } from "@/lib/reminders/runner";

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const secret = request.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid cron secret");
    }
    const reminders = await runReminders();
    const closed = await closeExpiredBidOpenDays();
    return jsonOk({ reminders, closed });
  });
}
