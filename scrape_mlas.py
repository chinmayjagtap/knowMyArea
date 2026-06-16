"""
Scrape current-assembly MLA data from PRS India (prsindia.org/mlatrack)
and merge every state's CSV into a single `data/mla-members.csv` shipped
with the static site.

PRS data is licensed CC-BY 4.0; this script preserves provenance by
keeping each member's state and assembly-term columns intact.

One-shot. Run when you need to refresh:
    python3 scrape_mlas.py
"""

import csv
import re
import sys
import time
from pathlib import Path
from typing import List, Optional, Tuple
from urllib.parse import urljoin

import requests

BASE = "https://prsindia.org"
LIST_URL = BASE + "/mlatrack"
OUT_DIR = Path(__file__).parent / "data"
OUT_FILE = OUT_DIR / "mla-members.csv"

# Names taken from the PRS dropdown on /mlatrack. UTs without a legislative
# assembly (A&N, Chandigarh, D&N&H+D&D, Lakshadweep, Ladakh) are excluded by
# PRS itself, so they don't appear here either.
STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
    "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
    "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# `/files/mlatrack/<state>/<term>/<state>_assembly_term_<term>.csv`
CSV_RE = re.compile(
    r'href="(/files/mlatrack/[^/]+/(\d+)/[^"]+_assembly_term_\d+\.csv)"'
)


def latest_csv_url(state: str) -> Optional[Tuple[str, int]]:
    """Return (absolute CSV URL, term number) for the most recent assembly."""
    r = requests.get(LIST_URL, params={"state": state}, headers=HEADERS, timeout=30)
    r.raise_for_status()
    matches = CSV_RE.findall(r.text)
    if not matches:
        return None
    # Pick the highest assembly-term number (most recent).
    href, term = max(matches, key=lambda m: int(m[1]))
    return urljoin(BASE, href), int(term)


def fetch_state(state: str) -> List[dict]:
    info = latest_csv_url(state)
    if not info:
        print(f"  ! no CSV link found for {state}", file=sys.stderr)
        return []
    url, term = info
    r = requests.get(url, headers=HEADERS, timeout=60)
    r.raise_for_status()
    # PRS CSVs are UTF-8 with BOM occasionally; let the csv module handle quoting.
    text = r.content.decode("utf-8-sig", errors="replace")
    rows = list(csv.DictReader(text.splitlines()))
    print(f"  \u2713 {state:<22} term {term:>2}  {len(rows):>4} members")
    return rows


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    all_rows: List[dict] = []
    headers: List[str] = []

    for state in STATES:
        try:
            rows = fetch_state(state)
        except requests.HTTPError as e:
            print(f"  ! {state}: HTTP {e.response.status_code}", file=sys.stderr)
            continue
        except Exception as e:
            print(f"  ! {state}: {e}", file=sys.stderr)
            continue
        if rows and not headers:
            # Normalise headers across states by union of first-state's columns
            # plus any new columns later states introduce.
            headers = list(rows[0].keys())
        for r in rows:
            for k in r.keys():
                if k not in headers:
                    headers.append(k)
        all_rows.extend(rows)
        time.sleep(0.5)  # polite rate limit

    if not all_rows:
        print("No data fetched. Aborting.", file=sys.stderr)
        return 1

    with OUT_FILE.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        for r in all_rows:
            writer.writerow(r)

    print(f"\nWrote {len(all_rows)} members across {len(STATES)} states -> {OUT_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
