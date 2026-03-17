<script lang="ts">
	import Icon from "@iconify/svelte";
	import { Badge, Button, Card, Input } from "flowbite-svelte";
	import { onMount } from "svelte";
	import { formatTime } from "../../../../shared/formatTime";
	import type { EventState } from "../../../../src/router/field-monitor";
	import { trpc } from "../../main";
	import { userStore } from "../../stores/user";

	let subscription: ReturnType<typeof trpc.field.management.subscribe> | null = null;

	let events: EventState[] = $state([]);
	let hearts: { [k: string]: boolean } = $state({});

	type EventUserEntry = { id: number; username: string; role: string };
	let eventUsers: Record<string, EventUserEntry[]> = $state({});

	type Stats = Awaited<ReturnType<typeof trpc.admin.getStats.query>>;
	type TelemetryRow = { event_type: string; count: number };

	let stats: Stats | null = $state(null);
	let telemetry: TelemetryRow[] = $state([]);
	let statsLoading = $state(true);

	onMount(() => {
		if (subscription) {
			subscription.unsubscribe();
		}
		subscription = trpc.field.management.subscribe(
			{ token: $userStore.token },
			{
				onData: (data) => {
					hearts[data.code] = true;
					setTimeout(() => {
						hearts[data.code] = false;
					}, 250);
					let idx = events.findIndex((e) => e.code === data.code);
					if (idx >= 0) {
						events[idx] = { ...events[idx], ...data };
					} else {
						events.push(data);
					}
					events = events.sort((a, b) => {
						if (a.extensions.length === b.extensions.length) {
							if (a.extensions.length === 0) return a.code.localeCompare(b.code);
							const aDate = a.extensions[0].lastFrame;
							const bDate = b.extensions[0].lastFrame;
							return bDate.toISOString().split("T")[1].localeCompare(aDate.toISOString().split("T")[1]);
						}
						return b.extensions.length - a.extensions.length;
					});
				},
			},
		);

		if ($userStore.admin) {
			Promise.all([
				trpc.admin.getStats.query(),
				trpc.admin.getRecentTelemetry.query(),
				trpc.event.getAllWithUsers.query(),
			])
				.then(([s, t, users]) => {
					stats = s;
					telemetry = t;
					eventUsers = Object.fromEntries(users.map((e) => [e.code, e.users]));
				})
				.catch((err) => console.error("[Management]", err))
				.finally(() => {
					statsLoading = false;
				});
		}
	});

	const FieldStates: Record<number, string> = {
		0: "Unknown",
		1: "Match Running Teleop",
		2: "Match Transitioning",
		3: "Match Running Auto",
		4: "Match Ready",
		5: "Prestart Completed",
		6: "Prestart Initiated",
		7: "Ready to Prestart",
		8: "Match Aborted",
		9: "Match Over",
		10: "Ready for Post Result",
		11: "Match Not Ready",
	};

	const fieldStateBadgeColor: Record<number, string> = {
		1: "green",
		3: "green",
		4: "blue",
		5: "blue",
		6: "yellow",
		7: "yellow",
		8: "red",
		9: "purple",
		10: "indigo",
	};

	const roleColors: Record<string, string> = {
		FTA: "blue",
		FTAA: "green",
		CSA: "yellow",
		RI: "purple",
	};

	let message = $state("");
	let effectedEvents = $state("");

	async function startIssue(msg: string, affected: string[]) {
		await trpc.app.startIssue.mutate({ message: msg, effectedEvents: affected.filter((e) => e !== "") });
	}

	async function endIssue() {
		await trpc.app.endIssue.mutate();
	}

	function formatUptime(connected: Date) {
		const secs = Math.floor((Date.now() - new Date(connected).getTime()) / 1000);
		if (secs < 60) return `${secs}s`;
		if (secs < 3600) return `${Math.floor(secs / 60)}m`;
		return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
	}

	const telemetryLabels: Record<string, string> = {
		page_view: "Page Views",
		match_log_viewed: "Match Log Views",
		team_history_viewed: "Team History Views",
	};
</script>

<div class="h-full overflow-y-auto bg-gray-50 dark:bg-neutral-900">
	<div class="max-w-6xl mx-auto p-4 flex flex-col gap-6">

		<!-- Stats Cards -->
		{#if statsLoading}
			<div class="flex items-center justify-center py-8">
				<Icon icon="mdi:loading" class="w-8 h-8 animate-spin text-primary-600" />
			</div>
		{:else if stats}
			<!-- User Stats -->
			<div>
				<h2 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Users</h2>
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<Card class="p-4 text-center">
						<p class="text-3xl font-bold text-primary-600">{stats.users.total}</p>
						<p class="text-sm text-gray-500 mt-1">Total Users</p>
					</Card>
					<Card class="p-4 text-center">
						<p class="text-3xl font-bold text-green-600">{stats.users.newThisWeek}</p>
						<p class="text-sm text-gray-500 mt-1">New This Week</p>
					</Card>
					<Card class="p-4 text-center">
						<p class="text-3xl font-bold text-blue-600">{stats.users.activeThisWeek}</p>
						<p class="text-sm text-gray-500 mt-1">Active This Week</p>
					</Card>
					<Card class="p-4">
						<p class="text-xs font-semibold text-gray-500 mb-2">By Role</p>
						<div class="flex flex-wrap gap-1">
							{#each Object.entries(stats.users.byRole) as [role, cnt]}
								<Badge color={roleColors[role] ?? "gray"}>{role}: {cnt}</Badge>
							{/each}
						</div>
					</Card>
				</div>
			</div>

			<!-- Event Stats -->
			<div>
				<h2 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Events</h2>
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<Card class="p-4 text-center">
						<p class="text-3xl font-bold text-primary-600">{stats.events.total}</p>
						<p class="text-sm text-gray-500 mt-1">Total Events</p>
					</Card>
					<Card class="p-4 text-center">
						<p class="text-3xl font-bold text-green-600">{stats.events.active}</p>
						<p class="text-sm text-gray-500 mt-1">Not Archived</p>
					</Card>
					<Card class="p-4 text-center">
						<p class="text-3xl font-bold text-blue-600">{stats.events.newThisWeek}</p>
						<p class="text-sm text-gray-500 mt-1">New This Week</p>
					</Card>
					<Card class="p-4 text-center">
						<p class="text-3xl font-bold text-yellow-500">{stats.events.liveNow}</p>
						<p class="text-sm text-gray-500 mt-1">Live Now</p>
					</Card>
				</div>
			</div>

			<!-- Activity This Week -->
			<div>
				<h2 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Activity This Week</h2>
				<div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
					<Card class="p-4 text-center">
						<p class="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.activity.notesThisWeek}</p>
						<p class="text-xs text-gray-500 mt-1">Notes</p>
					</Card>
					<Card class="p-4 text-center">
						<p class="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.activity.messagesThisWeek}</p>
						<p class="text-xs text-gray-500 mt-1">Messages</p>
					</Card>
					<Card class="p-4 text-center">
						<p class="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.activity.matchEventsThisWeek}</p>
						<p class="text-xs text-gray-500 mt-1">Auto Events</p>
					</Card>
					<Card class="p-4 text-center">
						<p class="text-2xl font-bold text-green-600">{stats.activity.matchEventsConverted}</p>
						<p class="text-xs text-gray-500 mt-1">Converted</p>
					</Card>
					<Card class="p-4 text-center">
						<p class="text-2xl font-bold text-red-500">{stats.activity.matchEventsDismissed}</p>
						<p class="text-xs text-gray-500 mt-1">Dismissed</p>
					</Card>
					<Card class="p-4 text-center">
						<p class="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.activity.matchLogsThisWeek}</p>
						<p class="text-xs text-gray-500 mt-1">Match Logs</p>
					</Card>
				</div>
			</div>

			<!-- Telemetry -->
			{#if telemetry.length > 0}
				<div>
					<h2 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Feature Usage (Last 7 Days)</h2>
					<Card class="p-4">
						<div class="flex flex-col gap-2">
							{#each telemetry as row}
								{@const max = telemetry[0].count}
								<div class="flex items-center gap-3">
									<span class="text-sm text-gray-600 dark:text-gray-400 w-40 shrink-0">
										{telemetryLabels[row.event_type] ?? row.event_type}
									</span>
									<div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
										<div
											class="bg-primary-500 h-full rounded-full transition-all"
											style="width: {Math.round((row.count / max) * 100)}%"
										></div>
									</div>
									<span class="text-sm font-semibold text-gray-700 dark:text-gray-300 w-12 text-right">{row.count}</span>
								</div>
							{/each}
						</div>
					</Card>
				</div>
			{/if}
		{/if}

		<!-- Known Issue Control -->
		<div>
			<h2 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Known Issue</h2>
			<Card class="p-4">
				<div class="flex flex-col gap-2">
					<Input type="text" placeholder="Message" bind:value={message} />
					<Input type="text" placeholder="Affected event codes (comma-separated)" bind:value={effectedEvents} />
					<div class="flex gap-2 mt-1">
						<Button
							color="red"
							onclick={() => startIssue(message, effectedEvents.split(","))}
						>
							<Icon icon="mdi:alert-circle" class="mr-1 w-4 h-4" /> Start Issue
						</Button>
						<Button color="green" onclick={endIssue}>
							<Icon icon="mdi:check-circle" class="mr-1 w-4 h-4" /> End Issue
						</Button>
					</div>
				</div>
			</Card>
		</div>

		<!-- Live Events -->
		<div>
			<h2 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
				Live Events
				<span class="ml-2 text-sm font-normal text-gray-500">({events.length} known)</span>
			</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{#each events as event}
					<Card class="p-4 flex flex-col gap-2">
						<!-- Header -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<div class="w-2 h-2 rounded-full {hearts[event.code] ? 'bg-green-500' : 'bg-gray-300'} transition-colors"></div>
								<span class="font-semibold text-gray-800 dark:text-gray-100">{event.code.toUpperCase()}</span>
							</div>
							<Badge color={fieldStateBadgeColor[event.field] ?? "gray"} class="text-xs">
								{FieldStates[event.field] ?? "Unknown"}
							</Badge>
						</div>

						<p class="text-sm text-gray-500 -mt-1">{event.name ?? ""}</p>

						<!-- Match info -->
						{#if event.level && event.match}
							<p class="text-xs text-gray-500">
								{event.level} Match {event.match}
							</p>
						{/if}

						<!-- Extensions -->
						{#if event.extensions.length > 0}
							<div class="text-xs text-gray-600 dark:text-gray-400 border-t pt-2 mt-1">
								{#each event.extensions as ext}
									<div class="flex gap-2 flex-wrap">
										<span class="font-mono">{ext.ip ?? "?"}</span>
										<span>up {formatUptime(ext.connected)}</span>
										<span>{ext.frames} frames</span>
										<span class="text-gray-400">last {formatTime(ext.lastFrame)}</span>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-xs text-gray-400 italic">No extension connected</p>
						{/if}

						<!-- Clients -->
						{#if event.clients.length > 0}
							<p class="text-xs text-gray-500">{event.clients.length} client{event.clients.length !== 1 ? 's' : ''} connected</p>
						{/if}

						<!-- Users -->
						{#if eventUsers[event.code]?.length}
							<div class="flex flex-wrap gap-1 border-t pt-2 mt-1">
								{#each eventUsers[event.code] as u}
									<Badge color={roleColors[u.role] ?? "gray"} class="text-xs">
										{u.username}
									</Badge>
								{/each}
							</div>
						{/if}
					</Card>
				{/each}

				{#if events.length === 0}
					<p class="text-gray-500 col-span-3 text-center py-8">No live events detected yet.</p>
				{/if}
			</div>
		</div>

	</div>
</div>
