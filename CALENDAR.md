# Biotech Readout Calendar

This repo builds an iCalendar (`.ics`) file of upcoming clinical readouts for XBI holdings.

## Build

```bash
python3 tools/build_calendar.py
```

Outputs:
- `calendar/biotech-readouts.ics`
- `data/events.json`

## Apple Calendar

Options:
- **Import once:** In Calendar, choose `File > Import...` and select `calendar/biotech-readouts.ics`.
- **Subscribe (updates automatically):** Place the `.ics` file in a location your Mac can reach via a stable URL
  (e.g., iCloud Drive public link), then use `File > New Calendar Subscription...` and paste the URL.

## Overrides

If ClinicalTrials.gov lacks details like MOA, add overrides in `data/overrides.yaml` keyed by NCT ID.

## Notes

- Readout date proxy: Primary Completion Date from ClinicalTrials.gov.
- Recent results: Results First Post Date within the last 30 days.
- Stock prices are sourced from free Stooq CSV quotes and may be delayed.
