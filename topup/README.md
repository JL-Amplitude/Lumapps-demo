# Lumapps demo — data top-up

Self-contained bundle that keeps the Lumapps Amplitude demo project current.
It uploads synthetic events for every day after `last_run_date` in
`taxonomies/lumapps.state.json` up to today (UTC), so gaps of any length are filled.

```
topup/
├── topup.sh                 ← run this
├── scripts/                 generator (generate.py, extensions.py, …)
├── taxonomies/
│   ├── lumapps.py           taxonomy (events, personas, 40 accounts)
│   └── lumapps.state.json   seed 42 · 2000 users · API key · last_run_date
└── logs/                    one log per run
```

## Run

```bash
./topup.sh --status     # how many days are missing
./topup.sh --dry-run    # generate without uploading
./topup.sh              # upload and advance last_run_date
```

Requires `python3` (3.9+). If `requests` is not installed, the script creates a
local `.venv` on first run. `AMPLITUDE_API_KEY=… ./topup.sh` overrides the stored key.

Re-running is safe: insert_ids are deterministic, so Amplitude de-duplicates repeats.
The state file only advances after a successful upload.

## Schedule it (optional)

Daily at 07:00 via cron (`crontab -e`):

```
0 7 * * * /path/to/topup/topup.sh >> /path/to/topup/logs/cron.log 2>&1
```

Keep this folder private — the state file contains the project API key.
