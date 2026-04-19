#!/usr/bin/env python3
"""
Spaceflight_Data.csv builder
Joins:
  - GCAT launchlog.tsv        (base launch table)
  - GCAT currentcat.tsv       (orbital parameters: perigee, apogee, inclination, orbit class)
  - SpaceX API v4 /launches   (recovery type, landing pad, booster serial, reuse count, payload mass, orbit)
  - SpaceX API v4 /payloads   (payload mass, orbit, customer)
  - SpaceX API v4 /rockets    (propellant, engine type)
  - SpaceX API v4 /landpads   (landing pad name/location)
  - Hand-coded vehicle lookup (propellant/engine for non-SpaceX vehicles)

Requirements: pip install requests pandas
"""

import requests
import pandas as pd
import io
import time

# ── Vehicle metadata (non-SpaceX, hand-coded) ─────────────────────────────────
VEHICLE_META = {
    # LV_Type (as it appears in GCAT): (provider, country, propellant_1, propellant_2, engine_type, reusable_s1)
    "Falcon 9":        ("SpaceX",      "USA", "RP-1",     "LOX",  "Merlin 1D",    True),
    "Falcon Heavy":    ("SpaceX",      "USA", "RP-1",     "LOX",  "Merlin 1D",    True),
    "Starship":        ("SpaceX",      "USA", "Methane",  "LOX",  "Raptor",       True),
    "New Glenn":       ("Blue Origin", "USA", "Methane",  "LOX",  "BE-4",         True),
    "Vulcan Centaur":  ("ULA",         "USA", "LH2",      "LOX",  "BE-4",         False),
    "Atlas V":         ("ULA",         "USA", "RP-1",     "LOX",  "RD-180",       False),
    "Delta IV Heavy":  ("ULA",         "USA", "LH2",      "LOX",  "RS-68A",       False),
    "Electron":        ("Rocket Lab",  "USA", "RP-1",     "LOX",  "Rutherford",   False),
    "Antares":         ("Northrop",    "USA", "RP-1",     "LOX",  "RD-181",       False),
    "Ariane 5":        ("ArianeGroup", "FRA", "LH2",      "LOX",  "Vulcain 2",    False),
    "Ariane 6":        ("ArianeGroup", "FRA", "LH2",      "LOX",  "Vulcain 2.1",  False),
    "Vega-C":          ("ArianeGroup", "ITA", "HTPB",     "N/A",  "P120C",        False),
    "Soyuz-2.1a":      ("Roscosmos",   "RUS", "RP-1",     "LOX",  "RD-107A",      False),
    "Soyuz-2.1b":      ("Roscosmos",   "RUS", "RP-1",     "LOX",  "RD-107A",      False),
    "Proton-M":        ("Roscosmos",   "RUS", "UDMH",     "N2O4", "RD-275M",      False),
    "Long March 2C":   ("CASC",        "CHN", "UDMH",     "N2O4", "YF-21C",       False),
    "Long March 3B":   ("CASC",        "CHN", "LH2",      "LOX",  "YF-75",        False),
    "Long March 5B":   ("CASC",        "CHN", "LH2",      "LOX",  "YF-77",        False),
    "Long March 6":    ("CASC",        "CHN", "RP-1",     "LOX",  "YF-100",       False),
    "Long March 6A":   ("CASC",        "CHN", "RP-1",     "LOX",  "YF-100",       False),
    "Long March 8":    ("CASC",        "CHN", "RP-1",     "LOX",  "YF-100",       False),
    "Zhuque-2":        ("Landspace",   "CHN", "Methane",  "LOX",  "Tianque-12",   False),
    "PSLV":            ("ISRO",        "IND", "HTPB",     "N2O4", "Vikas",        False),
    "GSLV Mk III":     ("ISRO",        "IND", "LH2",      "LOX",  "CE-20",        False),
    "H-IIA":           ("JAXA",        "JPN", "LH2",      "LOX",  "LE-7A",        False),
    "H3":              ("JAXA",        "JPN", "LH2",      "LOX",  "LE-9",         False),
    "Epsilon":         ("JAXA",        "JPN", "HTPB",     "N/A",  "SRB-A3",       False),
    "Gravity-1":       ("Orienspace",  "CHN", "HTPB",     "N/A",  "Solid",        False),
}

GCAT_LAUNCH_URL    = "https://planet4589.org/space/gcat/tsv/derived/launchlog.tsv"
GCAT_ORBITAL_URL   = "https://planet4589.org/space/gcat/tsv/derived/currentcat.tsv"
SPACEX_LAUNCHES    = "https://api.spacexdata.com/v4/launches"
SPACEX_PAYLOADS    = "https://api.spacexdata.com/v4/payloads"
SPACEX_ROCKETS     = "https://api.spacexdata.com/v4/rockets"
SPACEX_LANDPADS    = "https://api.spacexdata.com/v4/landpads"

def fetch_tsv(url, comment="#"):
    print(f"  Fetching {url} ...")
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    lines = [l for l in r.text.splitlines() if not l.startswith(comment)]
    return pd.read_csv(io.StringIO("\n".join(lines)), sep="\t", low_memory=False)

def fetch_json(url):
    print(f"  Fetching {url} ...")
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.json()

# ── 1. GCAT launch log ─────────────────────────────────────────────────────────
print("\n[1/5] Loading GCAT launch log...")
gcat = fetch_tsv(GCAT_LAUNCH_URL)
gcat.columns = gcat.columns.str.strip()

# Keep one row per launch (primary payload row — Type starts with 'P ')
gcat_primary = gcat[gcat["Type"].str.startswith("P", na=False)].copy()
gcat_primary = gcat_primary.drop_duplicates(subset="Launch_Tag", keep="first")

# Parse launch date to just YYYY-MM-DD
gcat_primary["launch_date"] = gcat_primary["Launch_Date"].str.extract(r"(\d{4}\s+\w+\s+\d+)")[0]
try:
    gcat_primary["launch_date"] = pd.to_datetime(gcat_primary["launch_date"], format="%Y %b %d", errors="coerce")
except Exception:
    pass

# Derive launch success from Launch_Code: OS=success, OF=failure
gcat_primary["launch_success"] = gcat_primary["Launch_Code"].str.startswith("OS")

# ── 2. GCAT orbital parameters ────────────────────────────────────────────────
print("\n[2/5] Loading GCAT orbital catalog...")
orb = fetch_tsv(GCAT_ORBITAL_URL)
orb.columns = orb.columns.str.strip()

# Keep only primary payloads (Type starts with 'P') and deduplicate by Piece (= Launch_Tag + piece letter)
orb_primary = orb[orb["Type"].str.startswith("P", na=False)].copy()

# Extract Launch_Tag from Piece column (first token, e.g. "2023 ALP 1" -> "2023 ALP")
orb_primary["Launch_Tag"] = orb_primary["Piece"].str.extract(r"^(\d{4}[\s\-]\w+(?:\s+\w+)?)")

# For the join, keep key orbital parameters
orb_keep = orb_primary[["Launch_Tag","Perigee","Apogee","Inc","OpOrbit"]].copy()
orb_keep.columns = ["Launch_Tag","perigee_km","apogee_km","inclination_deg","orbit_class"]
orb_keep = orb_keep.drop_duplicates(subset="Launch_Tag", keep="first")

# ── 3. SpaceX API ─────────────────────────────────────────────────────────────
print("\n[3/5] Loading SpaceX API data...")
sx_launches_raw = fetch_json(SPACEX_LAUNCHES)
sx_payloads_raw = fetch_json(SPACEX_PAYLOADS)
sx_rockets_raw  = fetch_json(SPACEX_ROCKETS)
sx_landpads_raw = fetch_json(SPACEX_LANDPADS)

# Build lookup dicts
payload_map = {p["id"]: p for p in sx_payloads_raw}
rocket_map  = {r["id"]: r for r in sx_rockets_raw}
landpad_map = {lp["id"]: lp for lp in sx_landpads_raw}

sx_rows = []
for lx in sx_launches_raw:
    date_str = lx.get("date_utc","")
    try:
        launch_date = pd.to_datetime(date_str).date()
    except Exception:
        launch_date = None

    # Rocket / propellant
    rocket_id   = lx.get("rocket")
    rocket_info = rocket_map.get(rocket_id, {})
    engines     = rocket_info.get("engines", {})
    propellant_1 = engines.get("propellant_1", "")
    propellant_2 = engines.get("propellant_2", "")
    engine_type  = f"{engines.get('type','')} {engines.get('version','')}".strip()

    # Core / recovery
    cores = lx.get("cores", [])
    core = cores[0] if cores else {}
    booster_serial   = core.get("core")          # SpaceX ID string; real serial (B10xx) in separate cores endpoint
    booster_flight_n = core.get("flight")
    reused           = core.get("reused")
    landing_attempt  = core.get("landing_attempt")
    landing_success  = core.get("landing_success")
    landing_type     = core.get("landing_type")  # RTLS, ASDS, Ocean
    landpad_id       = core.get("landpad")
    landpad_name     = landpad_map.get(landpad_id, {}).get("full_name") if landpad_id else None
    gridfins         = core.get("gridfins")
    legs             = core.get("legs")

    # Payload
    payload_ids  = lx.get("payloads", [])
    payload_id   = payload_ids[0] if payload_ids else None
    payload_info = payload_map.get(payload_id, {}) if payload_id else {}
    payload_mass_kg = payload_info.get("mass_kg")
    orbit            = payload_info.get("orbit")
    customers        = ", ".join(payload_info.get("customers", []))
    payload_type     = payload_info.get("type")

    # Orbit params (SpaceX payload has these when available)
    op = payload_info.get("orbit_params", {}) or {}
    sx_perigee   = op.get("periapsis_km")
    sx_apogee    = op.get("apoapsis_km")
    sx_incl      = op.get("inclination_deg")

    sx_rows.append({
        "sx_launch_id":      lx.get("id"),
        "sx_flight_number":  lx.get("flight_number"),
        "sx_mission_name":   lx.get("name"),
        "launch_date_sx":    launch_date,
        "vehicle_name":      rocket_info.get("name"),
        "launch_site":       lx.get("launchpad"),
        "launch_success_sx": lx.get("success"),
        "details":           lx.get("details"),
        "propellant_1":      propellant_1,
        "propellant_2":      propellant_2,
        "engine_type":       engine_type,
        "booster_serial":    booster_serial,
        "booster_flight_n":  booster_flight_n,
        "booster_reused":    reused,
        "gridfins":          gridfins,
        "legs":              legs,
        "recovery_attempted":landing_attempt,
        "recovery_success":  landing_success,
        "recovery_type":     landing_type,
        "recovery_vessel":   landpad_name,
        "payload_mass_kg":   payload_mass_kg,
        "target_orbit":      orbit,
        "customers":         customers,
        "payload_type":      payload_type,
        "sx_perigee_km":     sx_perigee,
        "sx_apogee_km":      sx_apogee,
        "sx_inclination":    sx_incl,
    })

sx_df = pd.DataFrame(sx_rows)
sx_df["launch_date_sx"] = pd.to_datetime(sx_df["launch_date_sx"], errors="coerce")

# ── 4. Join GCAT launch log + orbital params ──────────────────────────────────
print("\n[4/5] Joining tables...")
gcat_merged = gcat_primary.merge(orb_keep, on="Launch_Tag", how="left")

# Rename GCAT columns to clean names
gcat_merged = gcat_merged.rename(columns={
    "Launch_Tag":   "launch_tag",
    "LV_Type":      "vehicle_name",
    "Agency":       "agency",
    "Launch_Site":  "launch_site",
    "Launch_Pad":   "launch_pad",
    "Platform":     "platform",
    "Launch_Code":  "launch_code",
    "LVState":      "vehicle_country",
    "Mission":      "mission_name",
    "Apogee":       "gcat_apogee_km",   # raw from launch table (target apogee)
})

# Add vehicle metadata for non-SpaceX
def get_vehicle_meta(vname):
    for k, v in VEHICLE_META.items():
        if k.lower() in str(vname).lower():
            return v
    return (None, None, None, None, None, None)

meta_cols = ["provider","country","propellant_1","propellant_2","engine_type","reusable_s1"]
gcat_merged[meta_cols] = pd.DataFrame(
    gcat_merged["vehicle_name"].apply(get_vehicle_meta).tolist(),
    index=gcat_merged.index
)

# ── 5. Join SpaceX enrichment onto GCAT rows ──────────────────────────────────
# Match on date (GCAT launch_date) — SpaceX launches are unique per day
gcat_merged["launch_date_dt"] = pd.to_datetime(gcat_merged["launch_date"], errors="coerce")
sx_df_slim = sx_df.copy()

merged = gcat_merged.merge(
    sx_df_slim,
    left_on="launch_date_dt",
    right_on="launch_date_sx",
    how="left",
    suffixes=("_gcat","_sx")
)

# Coalesce overlapping columns: prefer SpaceX value when available
def coalesce(a, b):
    return a.combine_first(b)

# Consolidate perigee/apogee/inclination: prefer GCAT orbital catalog, fallback SpaceX
merged["perigee_km_final"]     = coalesce(merged.get("perigee_km", pd.Series(dtype=float)),
                                          merged.get("sx_perigee_km", pd.Series(dtype=float)))
merged["apogee_km_final"]      = coalesce(merged.get("apogee_km", pd.Series(dtype=float)),
                                          merged.get("sx_apogee_km", pd.Series(dtype=float)))
merged["inclination_deg_final"]= coalesce(merged.get("inclination_deg", pd.Series(dtype=float)),
                                          merged.get("sx_inclination", pd.Series(dtype=float)))

# ── 6. Build final clean output ───────────────────────────────────────────────
print("\n[5/5] Building final CSV...")

output_cols = {
    "launch_tag":           "launch_tag",
    "launch_date_dt":       "launch_date",
    "vehicle_name_gcat":    "vehicle_name",
    "provider":             "provider",
    "country":              "vehicle_country",
    "engine_type_gcat":     "engine_type",
    "propellant_1_gcat":    "propellant_1",
    "propellant_2_gcat":    "propellant_2",
    "reusable_s1":          "reusable_first_stage",
    "agency":               "launch_agency",
    "launch_site":          "launch_site",
    "launch_pad":           "launch_pad",
    "launch_success":       "launch_success",
    "sx_mission_name":      "mission_name",
    "customers":            "customers",
    "payload_type":         "payload_type",
    "payload_mass_kg":      "payload_mass_kg",
    "target_orbit":         "target_orbit",
    "orbit_class":          "orbit_class",
    "perigee_km_final":     "perigee_km",
    "apogee_km_final":      "apogee_km",
    "inclination_deg_final":"inclination_deg",
    "booster_serial":       "booster_serial",
    "booster_flight_n":     "booster_flight_number",
    "booster_reused":       "booster_reused",
    "gridfins":             "gridfins",
    "legs":                 "landing_legs",
    "recovery_attempted":   "recovery_attempted",
    "recovery_success":     "recovery_success",
    "recovery_type":        "recovery_type",
    "recovery_vessel":      "recovery_vessel",
    "details":              "mission_notes",
}

# Select only columns that actually exist in merged
available = {k: v for k, v in output_cols.items() if k in merged.columns}
final = merged[list(available.keys())].rename(columns=available)

# Clean whitespace in string columns
for col in final.select_dtypes(include="object").columns:
    final[col] = final[col].str.strip()

final.to_csv("Spaceflight_Data.csv", index=False)
print(f"\n✅ Done! Spaceflight_Data.csv written with {len(final):,} rows x {len(final.columns)} columns.")
print("Columns:", list(final.columns))
