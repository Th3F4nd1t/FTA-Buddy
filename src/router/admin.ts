import { count, gt, eq, and, sql } from "drizzle-orm";
import { db } from "../db/db";
import { appTelemetry, events, matchEvents, matchLogs, messages, notes, users } from "../db/schema";
import { adminProcedure, router } from "../trpc";
import { events as liveEvents } from "../state";

export const adminRouter = router({
	getStats: adminProcedure.query(async () => {
		const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

		const [
			[{ totalUsers }],
			[{ newUsersThisWeek }],
			[{ activeUsersThisWeek }],
			usersByRoleRows,
			[{ totalEvents }],
			[{ activeEvents }],
			[{ newEventsThisWeek }],
			[{ notesThisWeek }],
			[{ messagesThisWeek }],
			[{ matchEventsThisWeek }],
			[{ matchEventsConverted }],
			[{ matchEventsDismissed }],
			[{ matchLogsThisWeek }],
		] = await Promise.all([
			db.select({ totalUsers: count() }).from(users),
			db.select({ newUsersThisWeek: count() }).from(users).where(gt(users.created_at, oneWeekAgo)),
			db.select({ activeUsersThisWeek: count() }).from(users).where(gt(users.last_seen, oneWeekAgo)),
			db.select({ role: users.role, cnt: count() }).from(users).groupBy(users.role),
			db.select({ totalEvents: count() }).from(events),
			db.select({ activeEvents: count() }).from(events).where(eq(events.archived, false)),
			db.select({ newEventsThisWeek: count() }).from(events).where(gt(events.created_at, oneWeekAgo)),
			db.select({ notesThisWeek: count() }).from(notes).where(gt(notes.created_at, oneWeekAgo)),
			db.select({ messagesThisWeek: count() }).from(messages).where(gt(messages.created_at, oneWeekAgo)),
			db.select({ matchEventsThisWeek: count() }).from(matchEvents).where(gt(matchEvents.created_at, oneWeekAgo)),
			db
				.select({ matchEventsConverted: count() })
				.from(matchEvents)
				.where(and(eq(matchEvents.status, "converted"), gt(matchEvents.created_at, oneWeekAgo))),
			db
				.select({ matchEventsDismissed: count() })
				.from(matchEvents)
				.where(and(eq(matchEvents.status, "dismissed"), gt(matchEvents.created_at, oneWeekAgo))),
			db.select({ matchLogsThisWeek: count() }).from(matchLogs).where(gt(matchLogs.start_time, oneWeekAgo)),
		]);

		const roleMap: Record<string, number> = {};
		for (const row of usersByRoleRows) {
			roleMap[row.role] = row.cnt;
		}

		const liveEventCount = Object.values(liveEvents).filter(
			(e) => e.stats.extensions.length > 0,
		).length;

		return {
			users: {
				total: totalUsers,
				newThisWeek: newUsersThisWeek,
				activeThisWeek: activeUsersThisWeek,
				byRole: roleMap,
			},
			events: {
				total: totalEvents,
				active: activeEvents,
				newThisWeek: newEventsThisWeek,
				liveNow: liveEventCount,
			},
			activity: {
				notesThisWeek,
				messagesThisWeek,
				matchEventsThisWeek,
				matchEventsConverted,
				matchEventsDismissed,
				matchLogsThisWeek,
			},
		};
	}),

	getRecentTelemetry: adminProcedure.query(async () => {
		const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

		const rows = await db
			.select({ event_type: appTelemetry.event_type, cnt: count() })
			.from(appTelemetry)
			.where(gt(appTelemetry.created_at, oneWeekAgo))
			.groupBy(appTelemetry.event_type)
			.orderBy(sql`count(*) desc`);

		return rows.map((r) => ({ event_type: r.event_type, count: r.cnt }));
	}),
});
