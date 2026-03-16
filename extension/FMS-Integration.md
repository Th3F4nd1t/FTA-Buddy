# FTA Buddy - FMS Integration Overview

FTA Buddy's browser extension connects to FMS at `10.0.100.5` using SignalR push subscriptions for live data and REST API calls for everything else. The general approach is to use SignalR wherever possible and only hit REST endpoints when needed: once on startup, in response to a specific event, or periodically when there's no push alternative.

The SignalR connection model is based directly on how the official FMS Field Monitor and Audience Display work. FTA Buddy subscribes to the same hubs and events those tools use, and does nothing to modify or interfere with FMS.

The extension's role is purely data collection. It receives or fetches data from FMS, then forwards it to a remote FTA Buddy server for storage and processing. All the heavy lifting (analysis, display, storage) happens on that server, not locally and not on the FMS network. This means the extension should not have any meaningful impact on FMS performance.

---

## SignalR Hubs

The extension connects to four SignalR hubs. All connections use automatic reconnect with exponential backoff (capped at 2 min), a 30-second server timeout, and a 15-second keep-alive interval.

### `fieldMonitorHub`

| Event | What it's used for |
|---|---|
| `fieldmonitordatachanged` | This is the core data source for the live field monitor. Each push updates robot status for all 6 stations: DS link, radio, RoboRIO, code, battery, ping, bandwidth, packet loss, signal strength, and radio connection quality. |
| `matchstatusinfochanged` | Tracks the match lifecycle (prestart, auto, teleop, match over). Used to record cycle time timestamps and to kick off DS log fetching when a match ends or is cancelled. |
| `scheduleaheadbehindchanged` | Updates the ahead/behind schedule indicator in the UI. |

### `infrastructureHub`

| Event | What it's used for |
|---|---|
| `robotversiondatachanged` | Gets DS and robot software version data per station so FTA Buddy can flag version mismatches. |
| `activetournamentlevelchanged` | Triggers a schedule re-fetch when the event moves between tournament levels (quals to playoffs, etc.). |
| `plc_match_status_changed` | Watches for `RefDone` from the referee panel to record the "refs done" cycle time timestamp. |
| `lastcycletimecalculated` | Receives the last cycle time from FMS and sends it to the FTA Buddy server for schedule projection. |
| `scheduleaheadbehindchanged` | Same as on `fieldMonitorHub`, updates the schedule offset. |

### `ftaAppHub`

The extension connects to `ftaAppHub` using the FTA App token. This keeps FTA Buddy's notes in sync with the FMS FTA App in real time without any polling.

| Event | What it's used for |
|---|---|
| `noteadded` | Adds the note to FTA Buddy's note list. |
| `noteupdated` | Updates the note text or resolution status. |
| `notereopened` | Marks the note as reopened. |
| `noteresolved` | Marks the note as resolved. |
| `notedeleted` | Removes the note. |

### `gameSpecificHub`

The extension maintains a connection to `gameSpecificHub` but does not currently do anything with the events it receives. They are logged to the console only.

---

## REST API Calls

### On startup (called once)

| Endpoint | Why |
|---|---|
| `GET /api/v1.0/systembase/get/get_CurrentlyActiveEventCode` | Gets the event code so uploaded data is attributed to the right event. |
| `GET /api/v1.0/audience/get/GetCurrentMatchAndPlayNumber` | Gets the current match so the extension starts in the right state. |
| `GET /api/v1.0/match/get/GetCurrentSchedule` | Gets the quals schedule for cycle time projections and ahead/behind estimates. Also called again when `activetournamentlevelchanged` fires. |

### On match end (triggered by `matchstatusinfochanged`)

| Endpoint | Why |
|---|---|
| `GET /api/v1.0/fieldmonitor/get/GetResults/{level}` | After a match ends, this is called to get the FMS-internal `fmsMatchId` for the match. That UUID is needed to fetch DS logs and isn't available from SignalR. |
| `GET /api/v1.0/fieldmonitor/get/GetLog/{matchId}/{alliance}/{station}` | Called once per robot (6 times per match) to retrieve each station's DS connection log, which is then uploaded to FTA Buddy for review and analysis. |

### On-demand (triggered by user action)

| Endpoint | Why |
|---|---|
| `GET /api/v1.0/fieldmonitor/get/GetResultsByTeamNumber/{team}` | Called when a user looks up a specific team's match history. |

### Notes (triggered by user action)

These write back to FMS so notes show up in both FTA Buddy and the FMS FTA App.

| Endpoint | Why |
|---|---|
| `POST /Notes/AddNote` | User creates a note in FTA Buddy. |
| `POST /Notes/UpdateNote` | User edits or resolves a note. |
| `POST /Notes/DeleteNote` | User deletes a note. |

---

## Periodic Polling

There are two background polls. FTA Buddy stops the team list poll as soon as it's no longer needed.

| What | Interval | Notes |
|---|---|---|
| `GET /api/v1.0/match/get/GetAllTeamNumbers` | Every 5 minutes | Tracks any changes to the team list that might happen if a team drops the event day of. Stops automatically once the quals schedule is available, since the team list is stable by then. |
| Match log auto-import | Every 5 minutes | Fetches the list of completed matches from FMS, compares it against what has already been imported, and downloads DS logs only for matches that haven't been uploaded yet. This is a safety net for matches that were missed at match end (e.g. if the extension was offline). Runs for the duration of the event. |
