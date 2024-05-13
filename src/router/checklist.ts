import { z } from "zod";
import { EventChecklist } from "../../shared/types";
import { eventProcedure, router } from "../trpc";
import { db } from "../db/db";
import { events } from "../db/schema";
import { eq } from "drizzle-orm";
import { eventList } from "..";

export const checklistRouter = router({
    get: eventProcedure.query(async ({ input, ctx }) => {
        return ctx.event.checklist as EventChecklist;
    }),

    update: eventProcedure.input(z.object({
        team: z.string(),
        key: z.enum(['present', 'weighed', 'inspected', 'radioProgrammed', 'connectionTested']),
        value: z.boolean()
    })).query(async ({ input, ctx }) => {
        const checklist = ctx.event.checklist as EventChecklist;
        checklist[input.team][input.key] = input.value;

        await db.update(events).set({ checklist }).where(eq(events.code, ctx.event.code));

        eventList[ctx.event.code].socketClients.forEach(client => {
            client.send(JSON.stringify({ type: 'checklist', checklist }));
        });

        return checklist;
    })
});