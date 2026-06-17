import cron from "node-cron";
import { closeExpiredBidOpenDays, runReminders } from "@/lib/reminders/runner";
import { logger } from "@/lib/logger";

let started = false;

export function startReminderScheduler() {
  if (started || process.env.NODE_ENV === "test") return;
  started = true;

  cron.schedule("0 6 * * *", async () => {
    try {
      const result = await runReminders();
      logger.info({ result }, "Daily reminders completed");
    } catch (err) {
      logger.error({ err }, "Daily reminders failed");
    }
  });

  cron.schedule("0 0 * * *", async () => {
    try {
      const closed = await closeExpiredBidOpenDays();
      logger.info({ closed }, "Bid open day auto-close completed");
    } catch (err) {
      logger.error({ err }, "Bid open day auto-close failed");
    }
  });
}
