<script lang="ts">
	import { FieldState, MatchState, MatchStateMap, ROBOT, type MonitorFrame, type ScheduleDetails } from "../../../shared/types";
	import MonitorRow from "../components/MonitorRow.svelte";
	import TeamModal from "../components/TeamModal.svelte";
	import { formatTimeShortNoAgo, formatTimeShortNoAgoMinutesOnly, formatTimeShortNoAgoSeconds } from "../../../shared/formatTime";
	import type { MonitorEvent, MonitorFrameHandler } from "../util/monitorFrameHandler";
	import { onDestroy, onMount } from "svelte";
	import { trpc } from "../main";
	import { cycleTimeToMS } from "../../../shared/cycleTimeToMS";
	import { userStore } from "../stores/user";
	import { audioQueuer } from "../field-monitor";
	import Spinner from "../components/Spinner.svelte";
	import { updateScheduleText } from "../util/schedule-detail-formatter";
	import { Button } from "flowbite-svelte";
	import Icon from "@iconify/svelte";

	export let frameHandler: MonitorFrameHandler;
	let monitorFrame: MonitorFrame | undefined = frameHandler.getFrame();

	frameHandler.addEventListener("frame", (evt) => {
		monitorFrame = (evt as MonitorEvent).detail.frame;
		if (monitorFrame.field === FieldState.PRESTART_COMPLETED || monitorFrame.field === FieldState.MATCH_NOT_READY) {
			hide = false;
		} else {
			hide = true;
		}
	});

	frameHandler.addEventListener("prestart", () => {
		hide = false;
	});

	frameHandler.addEventListener("match-ready", () => {
		hide = true;
	});

	onMount(async () => {
		monitorFrame = frameHandler.getFrame();
		if (monitorFrame.field === FieldState.PRESTART_COMPLETED || monitorFrame.field === FieldState.MATCH_NOT_READY) {
			hide = false;
		} else {
			hide = true;
		}
	});

	const FieldStates = {
		0: "Unknown",
		1: "Match Running Teleop",
		2: "Match Transistioning",
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

	const DS_Colors: { [key: number]: string } = {
		0: "bg-red-600",
		1: "bg-green-500",
		2: "bg-yellow-500",
		3: "bg-yellow-400",
		4: "bg-yellow-400",
		5: "bg-red-800",
		6: "bg-red-800",
		7: "bg-green-600",
	};

	const Status_Colors: { [key: number]: string } = {
		0: "bg-red-600",
		1: "bg-yellow-500",
		2: "bg-green-500",
	};

	const stations: ROBOT[] = Object.values(ROBOT);

	let hide = true;
</script>

<div class="absolute w-screen bg-transparent bottom-36" class:hidden={hide}>
	{#if monitorFrame}
		<div class="grid grid-cols-[1fr_1fr_1fr_600px_1fr_1fr_1fr] justify-between">
			<div class="grid grid-cols-3 w-18 mx-auto gap-0.5">
				<div class="size-6 {DS_Colors[monitorFrame.blue1.ds]}"></div>
				<div class="size-6 {Status_Colors[(monitorFrame.blue1.radio ? 1 : 0) + (monitorFrame.blue1.radioConnected ? 1 : 0)]}"></div>
				<div class="size-6 {Status_Colors[(monitorFrame.blue1.rio ? 1 : 0) + (monitorFrame.blue1.code ? 1 : 0)]}"></div>
			</div>

			<div class="grid grid-cols-3 w-18 mx-auto gap-0.5">
				<div class="size-6 {DS_Colors[monitorFrame.blue2.ds]}"></div>
				<div class="size-6 {Status_Colors[(monitorFrame.blue2.radio ? 1 : 0) + (monitorFrame.blue2.radioConnected ? 1 : 0)]}"></div>
				<div class="size-6 {Status_Colors[(monitorFrame.blue2.rio ? 1 : 0) + (monitorFrame.blue2.code ? 1 : 0)]}"></div>
			</div>

			<div class="grid grid-cols-3 w-18 mx-auto gap-0.5">
				<div class="size-6 {DS_Colors[monitorFrame.blue3.ds]}"></div>
				<div class="size-6 {Status_Colors[(monitorFrame.blue3.radio ? 1 : 0) + (monitorFrame.blue3.radioConnected ? 1 : 0)]}"></div>
				<div class="size-6 {Status_Colors[(monitorFrame.blue3.rio ? 1 : 0) + (monitorFrame.blue3.code ? 1 : 0)]}"></div>
			</div>

			<div></div>

			<div class="grid grid-cols-3 w-18 mx-auto gap-0.5">
				<div class="size-6 {DS_Colors[monitorFrame.red1.ds]}"></div>
				<div class="size-6 {Status_Colors[(monitorFrame.red1.radio ? 1 : 0) + (monitorFrame.red1.radioConnected ? 1 : 0)]}"></div>
				<div class="size-6 {Status_Colors[(monitorFrame.red1.rio ? 1 : 0) + (monitorFrame.red1.code ? 1 : 0)]}"></div>
			</div>

			<div class="grid grid-cols-3 w-18 mx-auto gap-0.5">
				<div class="size-6 {DS_Colors[monitorFrame.red2.ds]}"></div>
				<div class="size-6 {Status_Colors[(monitorFrame.red2.radio ? 1 : 0) + (monitorFrame.red2.radioConnected ? 1 : 0)]}"></div>
				<div class="size-6 {Status_Colors[(monitorFrame.red2.rio ? 1 : 0) + (monitorFrame.red2.code ? 1 : 0)]}"></div>
			</div>

			<div class="grid grid-cols-3 w-18 mx-auto gap-0.5">
				<div class="size-6 {DS_Colors[monitorFrame.red3.ds]}"></div>
				<div class="size-6 {Status_Colors[(monitorFrame.red3.radio ? 1 : 0) + (monitorFrame.red3.radioConnected ? 1 : 0)]}"></div>
				<div class="size-6 {Status_Colors[(monitorFrame.red3.rio ? 1 : 0) + (monitorFrame.red3.code ? 1 : 0)]}"></div>
			</div>
		</div>
	{/if}
</div>
