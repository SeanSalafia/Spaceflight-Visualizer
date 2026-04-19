import re
import time
import io
import requests
import pandas as pd

# Sources

GCAT_LAUNCH_URL = "https://planet4589.org/space/gcat/tsv/derived/launchlog.tsv"
GCAT_ORBITAL_URL = "https://planet4589.org/space/gcat/tsv/derived/currentcat.tsv"
LL2_BASE = "https://lldev.thespacedevs.com/2.2.0"

# Useful Metadata for Matching and Analysis

VEHICLE_META = [

    # (gcat_name_substring, provider, country, propellant_1, propellant_2, engine, reusable_s1)
    # Most-specific entries first to avoid false substring matches.

    # SpaceX
    ("Falcon Heavy",       "SpaceX",          "USA",  "RP-1",    "LOX",  "Merlin 1D",     True),
    ("Falcon 9",           "SpaceX",          "USA",  "RP-1",    "LOX",  "Merlin 1D",     True),
    ("Falcon 1",           "SpaceX",          "USA",  "RP-1",    "LOX",  "Merlin 1C",     False),
    ("Starship",           "SpaceX",          "USA",  "Methane", "LOX",  "Raptor",        True),

    # Blue Origin

    ("New Glenn",          "Blue Origin",     "USA",  "Methane", "LOX",  "BE-4",          True),
    ("New Shepard",        "Blue Origin",     "USA",  "LH2",     "LOX",  "BE-3",          True),

    # ULA

    ("Vulcan Centaur",     "ULA",             "USA",  "LH2",     "LOX",  "BE-4",          False),
    ("Atlas V",            "ULA",             "USA",  "RP-1",    "LOX",  "RD-180",        False),
    ("Delta IV Heavy",     "ULA",             "USA",  "LH2",     "LOX",  "RS-68A",        False),
    ("Delta IV",           "ULA",             "USA",  "LH2",     "LOX",  "RS-68",         False),
    ("Delta II",           "ULA",             "USA",  "RP-1",    "LOX",  "RS-27A",        False),

    # Rocket Lab

    ("Electron",           "Rocket Lab",      "USA",  "RP-1",    "LOX",  "Rutherford",    False),
    ("Neutron",            "Rocket Lab",      "USA",  "Methane", "LOX",  "Archimedes",    True),

    # Northrop / Orbital

    ("Antares",            "Northrop",        "USA",  "RP-1",    "LOX",  "RD-181",        False),
    ("Pegasus",            "Northrop",        "USA",  "HTPB",    "N/A",  "Orion",         False),
    ("Minotaur",           "Northrop",        "USA",  "HTPB",    "N/A",  "Solid",         False),

    # Other US

    ("Space Shuttle",      "NASA",            "USA",  "LH2",     "LOX",  "SSME",          True),
    ("SLS",                "NASA",            "USA",  "LH2",     "LOX",  "RS-25",         False),
    ("LauncherOne",        "Virgin Orbit",    "USA",  "RP-1",    "LOX",  "NewtonThree",   False),
    ("Firefly Alpha",      "Firefly",         "USA",  "RP-1",    "LOX",  "Reaver",        False),
    ("Titan",              "USAF",            "USA",  "UDMH",    "N2O4", "LR-87",         False),
    ("Thor",               "USAF/NASA",       "USA",  "RP-1",    "LOX",  "MB-3",          False),
    ("Atlas",              "USAF/NASA",       "USA",  "RP-1",    "LOX",  "MA-5",          False),
    ("Delta",              "USAF/NASA",       "USA",  "RP-1",    "LOX",  "RS-27",         False),
    ("Scout",              "NASA",            "USA",  "HTPB",    "N/A",  "Algol",         False),
    ("Juno",               "NASA",            "USA",  "RP-1",    "LOX",  "A-7",           False),
    ("Saturn V",           "NASA",            "USA",  "RP-1",    "LOX",  "F-1",           False),
    ("Saturn IB",          "NASA",            "USA",  "RP-1",    "LOX",  "H-1",           False),
    ("Saturn I",           "NASA",            "USA",  "RP-1",    "LOX",  "H-1",           False),
    ("Jupiter C",          "NASA",            "USA",  "RP-1",    "LOX",  "A-7",           False),
    ("Vanguard",           "NRL",             "USA",  "RP-1",    "LOX",  "GE-X-405",      False),
    ("H-1",                "USAF/NASA",       "USA",  "RP-1",    "LOX",  "H-1",           False),
    # Ariane / ESA
    ("Ariane 6",           "ArianeGroup",     "FRA",  "LH2",     "LOX",  "Vulcain 2.1",   False),
    ("Ariane 5",           "ArianeGroup",     "FRA",  "LH2",     "LOX",  "Vulcain 2",     False),
    ("Ariane 4",           "ArianeGroup",     "FRA",  "UDMH",    "N2O4", "Viking",        False),
    ("Ariane 3",           "ArianeGroup",     "FRA",  "UDMH",    "N2O4", "Viking",        False),
    ("Ariane 1",           "ArianeGroup",     "FRA",  "UDMH",    "N2O4", "Viking",        False),
    ("Vega-C",             "ArianeGroup",     "ITA",  "HTPB",    "N/A",  "P120C",         False),
    ("Vega",               "ArianeGroup",     "ITA",  "HTPB",    "N/A",  "P80",           False),

    # Roscosmos / Soviet — specific variants before generic names

    ("Soyuz-2-1B",         "Roscosmos",       "RUS",  "RP-1",    "LOX",  "RD-107A/108A",  False),
    ("Soyuz-2-1A",         "Roscosmos",       "RUS",  "RP-1",    "LOX",  "RD-107A/108A",  False),
    ("Soyuz-2.1b",         "Roscosmos",       "RUS",  "RP-1",    "LOX",  "RD-107A/108A",  False),
    ("Soyuz-2.1a",         "Roscosmos",       "RUS",  "RP-1",    "LOX",  "RD-107A/108A",  False),
    ("Soyuz-FG",           "Roscosmos",       "RUS",  "RP-1",    "LOX",  "RD-107A/108A",  False),
    ("Soyuz-U2",           "Roscosmos",       "RUS",  "RP-1",    "LOX",  "RD-107/108",    False),
    ("Soyuz-U",            "Roscosmos",       "RUS",  "RP-1",    "LOX",  "RD-107/108",    False),
    ("Soyuz",              "Roscosmos",       "RUS",  "RP-1",    "LOX",  "RD-107/108",    False),
    ("Proton-M",           "Roscosmos",       "RUS",  "UDMH",    "N2O4", "RD-275M",       False),
    ("Proton-K",           "Roscosmos",       "RUS",  "UDMH",    "N2O4", "RD-253",        False),
    ("Proton",             "Roscosmos",       "RUS",  "UDMH",    "N2O4", "RD-253",        False),
    ("Rokot",              "Roscosmos",       "RUS",  "UDMH",    "N2O4", "RD-0233",       False),
    ("Angara",             "Roscosmos",       "RUS",  "RP-1",    "LOX",  "RD-191",        False),
    ("Zenit",              "Yuzhnoye",        "UKR",  "RP-1",    "LOX",  "RD-171",        False),
    ("Kosmos 11K65M",      "Roscosmos",       "RUS",  "UDMH",    "N2O4", "RD-119",        False),
    ("Kosmos 11K63",       "Roscosmos",       "RUS",  "UDMH",    "N2O4", "RD-119",        False),
    ("Kosmos",             "Roscosmos",       "RUS",  "UDMH",    "N2O4", "RD-119",        False),
    ("Tsiklon-3",          "Yuzhnoye",        "UKR",  "UDMH",    "N2O4", "RD-261",        False),
    ("Tsiklon-2",          "Yuzhnoye",        "UKR",  "UDMH",    "N2O4", "RD-251",        False),
    ("Molniya",            "Roscosmos",       "RUS",  "RP-1",    "LOX",  "RD-107/108",    False),
    ("Voskhod",            "Roscosmos",       "RUS",  "RP-1",    "LOX",  "RD-107/108",    False),
    ("Vostok",             "Roscosmos",       "RUS",  "RP-1",    "LOX",  "RD-107/108",    False),
    ("Dnepr",              "Roscosmos",       "RUS",  "UDMH",    "N2O4", "RD-264",        False),
    ("Strela",             "Roscosmos",       "RUS",  "UDMH",    "N2O4", "RD-268",        False),
    ("R-36O",              "Yuzhnoye",        "UKR",  "UDMH",    "N2O4", "RD-251",        False),

    # China — specific before generic

    ("Chang Zheng 5B",     "CASC",            "CHN",  "LH2",     "LOX",  "YF-77",         False),
    ("Chang Zheng 5",      "CASC",            "CHN",  "LH2",     "LOX",  "YF-77",         False),
    ("Chang Zheng 7A",     "CASC",            "CHN",  "RP-1",    "LOX",  "YF-100",        False),
    ("Chang Zheng 7",      "CASC",            "CHN",  "RP-1",    "LOX",  "YF-100",        False),
    ("Chang Zheng 6A",     "CASC",            "CHN",  "RP-1",    "LOX",  "YF-100",        False),
    ("Chang Zheng 6",      "CASC",            "CHN",  "RP-1",    "LOX",  "YF-100",        False),
    ("Chang Zheng 8",      "CASC",            "CHN",  "RP-1",    "LOX",  "YF-100",        False),
    ("Chang Zheng 3B",     "CASC",            "CHN",  "LH2",     "LOX",  "YF-75",         False),
    ("Chang Zheng 3A",     "CASC",            "CHN",  "LH2",     "LOX",  "YF-75",         False),
    ("Chang Zheng 3",      "CASC",            "CHN",  "LH2",     "LOX",  "YF-75",         False),
    ("Chang Zheng 4C",     "CASC",            "CHN",  "UDMH",    "N2O4", "YF-21C",        False),
    ("Chang Zheng 4B",     "CASC",            "CHN",  "UDMH",    "N2O4", "YF-21C",        False),
    ("Chang Zheng 4",      "CASC",            "CHN",  "UDMH",    "N2O4", "YF-21C",        False),
    ("Chang Zheng 2F",     "CASC",            "CHN",  "UDMH",    "N2O4", "YF-20B",        False),
    ("Chang Zheng 2D",     "CASC",            "CHN",  "UDMH",    "N2O4", "YF-21C",        False),
    ("Chang Zheng 2C",     "CASC",            "CHN",  "UDMH",    "N2O4", "YF-21C",        False),
    ("Chang Zheng 2",      "CASC",            "CHN",  "UDMH",    "N2O4", "YF-21C",        False),
    ("Chang Zheng 11",     "CASC",            "CHN",  "HTPB",    "N/A",  "Solid",         False),
    ("Long March",         "CASC",            "CHN",  "UDMH",    "N2O4", "YF-series",     False),
    ("Lijian",             "CASC",            "CHN",  "RP-1",    "LOX",  "YF-100",        False),
    ("Jielong",            "CASC",            "CHN",  "HTPB",    "N/A",  "Solid",         False),
    ("Kuaizhou",           "CASIC",           "CHN",  "HTPB",    "N/A",  "Solid",         False),
    ("Gravity-1",          "Orienspace",      "CHN",  "HTPB",    "N/A",  "Solid",         False),
    ("Zhuque-2",           "Landspace",       "CHN",  "Methane", "LOX",  "Tianque-12",    False),
    ("Hyperbola-1",        "iSpace",          "CHN",  "HTPB",    "N/A",  "Solid",         False),
    ("Ceres-1",            "Galactic Energy", "CHN",  "HTPB",    "N/A",  "Solid",         False),
    ("Gushenxing",         "CAS Space",       "CHN",  "HTPB",    "N/A",  "Solid",         False),
    ("Shuang Quxian",      "Galactic Energy", "CHN",  "Methane", "LOX",  "Solid",         False),
    ("Feng Bao",           "CASC",            "CHN",  "UDMH",    "N2O4", "YF-20",         False),

    # India

    ("GSLV Mk III",        "ISRO",            "IND",  "LH2",     "LOX",  "CE-20",         False),
    ("LVM3",               "ISRO",            "IND",  "LH2",     "LOX",  "CE-20",         False),
    ("GSLV",               "ISRO",            "IND",  "UDMH",    "N2O4", "Vikas",         False),
    ("PSLV",               "ISRO",            "IND",  "HTPB",    "N2O4", "Vikas",         False),
    ("SSLV",               "ISRO",            "IND",  "HTPB",    "N/A",  "Solid",         False),

    # Japan

    ("H3",                 "JAXA",            "JPN",  "LH2",     "LOX",  "LE-9",          False),
    ("H-IIB",              "JAXA",            "JPN",  "LH2",     "LOX",  "LE-7A",         False),
    ("H-IIA",              "JAXA",            "JPN",  "LH2",     "LOX",  "LE-7A",         False),
    ("H-II",               "JAXA",            "JPN",  "LH2",     "LOX",  "LE-7",          False),
    ("H-1",                "JAXA",            "JPN",  "RP-1",    "LOX",  "MB-3",          False),
    ("N-2",                "JAXA",            "JPN",  "RP-1",    "LOX",  "MB-3",          False),
    ("N-1",                "JAXA",            "JPN",  "RP-1",    "LOX",  "MB-3",          False),
    ("Epsilon",            "JAXA",            "JPN",  "HTPB",    "N/A",  "SRB-A3",        False),
    ("M-V",                "JAXA",            "JPN",  "HTPB",    "N/A",  "M-14",          False),
    ("SS-520",             "JAXA",            "JPN",  "HTPB",    "N/A",  "Solid",         False),

    # Iran

    ("Qased",              "IRGC",            "IRN",  "UDMH",    "N2O4", "Solid",         False),
    ("Safir",              "ISA",             "IRN",  "UDMH",    "N2O4", "Safir",         False),
    ("Simorgh",            "ISA",             "IRN",  "UDMH",    "N2O4", "Simorgh",       False),

    # Israel

    ("Shavit",             "IAI",             "ISR",  "HTPB",    "N/A",  "Solid",         False),

]

# Data Fetching/Parsing Functions

def get_vehicle_meta(vname):

    vl = str(vname).strip().lower()

    for key, provider, country, p1, p2, engine, reusable in VEHICLE_META:

        if key.lower() in vl:
            return provider, country, p1, p2, engine, reusable

    return None, None, None, None, None, None

def fetch_tsv(url):

    r = requests.get(url, timeout=30)
    r.raise_for_status()

    lines = r.text.splitlines()
    header_found = False

    kept = []

    for line in lines:

        if line.startswith("#") and not header_found:

            kept.append(line[1:].lstrip())
            header_found = True

        elif line.startswith("#"):

            continue

        else:

            kept.append(line)

    df = pd.read_csv(io.StringIO("\n".join(kept)), sep="\t", low_memory=False)
    df.columns = df.columns.str.strip()

    return df


def fetch_ll2_all(endpoint, params=None, delay=6):

    base_params = {"limit": 100, "offset": 0}

    if params:
        base_params.update(params)

    url = f"{LL2_BASE}/{endpoint}/"

    results = []
    page = 0

    while url:

        page += 1
        print(f"    page {page} ({len(results)} records)...", end="\r")

        for attempt in range(6):

            r = requests.get(url, params=base_params, timeout=30)

            if r.status_code == 429:

                wait = 30 * (2 ** attempt)

                print(f"\n    rate limited — waiting {wait}s (attempt {attempt+1}/6)...")
                time.sleep(wait)

                continue

            r.raise_for_status()

            break

        else:

            raise RuntimeError("Exceeded retry limit on 429 responses")

        data = r.json()

        results.extend(data.get("results", []))
        next_url = data.get("next")

        if next_url:

            url = next_url
            base_params = None

            time.sleep(delay)

        else:

            url = None

    print(f"    done — {len(results)} records fetched        ")
    return results

def parse_success(code):

    c = str(code).strip()

    if c.startswith("OS"): # on-time success (e.g. payload deployed to target orbit)
        return True

    if c.startswith("OF"): # failure on the ground (e.g. relight failure, explosion)
        return False

    return None

def piece_to_tag(piece):

    p = str(piece).strip()
    m = re.match(r"^(\d{4}\s+[A-Z0-9]+(?:\s+[A-Z0-9]+)?)\s+\d+\w*$", p)

    if m:
        return m.group(1).strip()

    m2 = re.match(r"^(\d{4}-\d+)[A-Z]\w*$", p)

    if m2:
        return m2.group(1)

    m3 = re.match(r"^(\d{4}-\d+)$", p)

    if m3:
        return m3.group(1)

    return p


# 1. GCAT launch log

print("[1/5] Loading GCAT launch log...")

gcat = fetch_tsv(GCAT_LAUNCH_URL)

gcat_primary = gcat[gcat["Type"].str.strip().str.startswith("P", na=False)].copy()
gcat_primary["Launch_Tag"] = gcat_primary["Launch_Tag"].str.strip()
gcat_primary = gcat_primary.drop_duplicates(subset="Launch_Tag", keep="first")

gcat_primary["launch_date"] = pd.to_datetime(gcat_primary["Launch_Date"].str.extract(r"(\d{4}\s+\w+\s+\d+)")[0], format="%Y %b %d", errors="coerce").dt.normalize().dt.tz_localize(None)
gcat_primary["launch_success"] = gcat_primary["Launch_Code"].apply(parse_success)

meta_list = gcat_primary["LV_Type"].apply(get_vehicle_meta).tolist()
gcat_primary[["provider", "vehicle_country", "propellant_1", "propellant_2", "engine_type", "reusable_first_stage"]] = pd.DataFrame( meta_list, index=gcat_primary.index)

n_match = gcat_primary["provider"].notna().sum()
print(f"  {len(gcat_primary)} primary rows, {n_match} vehicle meta matched ({100*n_match/len(gcat_primary):.1f}%)")

# 2. GCAT orbital catalog

print("[2/5] Loading GCAT orbital catalog...")

orb = fetch_tsv(GCAT_ORBITAL_URL)

orb_p = orb[orb["Type"].str.strip().str.startswith("P", na=False)].copy()
orb_p = orb_p.copy()

orb_p["Launch_Tag"] = orb_p["Piece"].apply(piece_to_tag)

for col in ["Perigee", "Apogee", "Inc"]:
    orb_p[col] = pd.to_numeric(orb_p[col].astype(str).str.strip(), errors="coerce")

orb_keep = (
    orb_p[["Launch_Tag", "Perigee", "Apogee", "Inc", "OpOrbit"]]
    .rename(columns={"Perigee": "perigee_km", "Apogee": "apogee_km", "Inc": "inclination_deg", "OpOrbit": "orbit_class"})
    .dropna(subset=["Launch_Tag"])
    .drop_duplicates(subset="Launch_Tag", keep="first")
)

overlap = len(set(gcat_primary["Launch_Tag"]) & set(orb_keep["Launch_Tag"]))
print(f"  {len(orb_keep)} orbital records, {overlap} keys overlap with launch log")

# 3. Launch Library 2

print("[3/5] Loading Launch Library 2...")
print("  Fetching all completed launches (status: success, failure, partial)...")

ll2_raw = fetch_ll2_all("launch", params={"mode": "detailed", "ordering": "-net", "status__ids": "3,4,7"})

print("  Fetching landing vessel data from /landings/...")
landings_raw = fetch_ll2_all("landings", params={"ordering": "-id"})

vessel_lookup = {}

for ld in landings_raw:

    loc = ld.get("landing_location") or {}
    name = loc.get("name") or loc.get("abbrev")
    fs = ld.get("firststage") or {}
    launcher = fs.get("launcher") or {}
    serial = launcher.get("serial_number")
    flight_n = fs.get("launcher_flight_number")

    if serial and flight_n and name:
        vessel_lookup[(serial, flight_n)] = name

print(f"  Vessel lookup: {len(vessel_lookup)} entries")

ll2_rows = []

for lx in ll2_raw:

    try:
        launch_date = pd.to_datetime(lx.get("net", ""), utc=True).tz_convert(None).normalize()
    except Exception:
        launch_date = pd.NaT

    mission = lx.get("mission") or {}
    orbit_info = mission.get("orbit") or {}
    lsp = lx.get("launch_service_provider") or {}
    pad = lx.get("pad") or {}
    location = pad.get("location") or {}
    status = lx.get("status") or {}
    rocket = lx.get("rocket") or {}
    stages = rocket.get("launcher_stage") or []
    launcher_stage = stages[0] if stages else {}

    booster_serial = None
    booster_flight_n = None
    booster_reused = None
    recovery_attempted = None
    recovery_success = None
    recovery_type = None
    recovery_vessel = None

    if launcher_stage:

        launcher = launcher_stage.get("launcher") or {}
        booster_serial = launcher.get("serial_number")
        booster_flight_n = launcher_stage.get("launcher_flight_number")
        booster_reused = launcher_stage.get("reused")
        landing = launcher_stage.get("landing") or {}
        recovery_attempted = landing.get("attempt")
        recovery_success = landing.get("success")
        landing_type_info = landing.get("type") or {}
        recovery_type = landing_type_info.get("abbrev")
        landing_loc = landing.get("landing_location") or {}

        recovery_vessel = (
            landing_loc.get("name")
            or landing_loc.get("abbrev")
            or vessel_lookup.get((booster_serial, booster_flight_n))
        )

    ll2_rows.append({
        "ll2_date":           launch_date,
        "ll2_name":           lx.get("name"),
        "ll2_status":         status.get("abbrev"),
        "ll2_provider":       lsp.get("name"),
        "ll2_pad":            pad.get("name"),
        "ll2_location":       location.get("name"),
        "ll2_lat":            pad.get("latitude"),
        "ll2_lon":            pad.get("longitude"),
        "ll2_orbit":          orbit_info.get("abbrev"),
        "ll2_orbit_name":     orbit_info.get("name"),
        "ll2_mission_type":   mission.get("type"),
        "ll2_mission_desc":   mission.get("description"),
        "booster_serial":     booster_serial,
        "booster_flight_n":   booster_flight_n,
        "booster_reused":     booster_reused,
        "recovery_attempted": recovery_attempted,
        "recovery_success":   recovery_success,
        "recovery_type":      recovery_type,
        "recovery_vessel":    recovery_vessel,
    })

ll2_df = pd.DataFrame(ll2_rows)
ll2_df["ll2_date"] = pd.to_datetime(ll2_df["ll2_date"], errors="coerce").dt.normalize()

rec_filled = ll2_df["recovery_type"].notna().sum()
print(f"  {len(ll2_df)} LL2 records, {rec_filled} with recovery data")

# 4. Join
print("[4/5] Joining tables...")

base = gcat_primary.merge(orb_keep, on="Launch_Tag", how="left")
print(f"  Orbital params filled: {base['perigee_km'].notna().sum()}/{len(base)}")

base = base.rename(columns={
    "Launch_Tag":  "launch_tag",
    "LV_Type":     "vehicle_name",
    "Agency":      "launch_agency",
    "Launch_Site": "launch_site",
    "Launch_Pad":  "launch_pad",
    "Platform":    "platform",
    "Launch_Code": "launch_code",
    "LVState":     "lv_state",
    "PLName":      "payload_name",
    "Name":        "mission_name",
    "SatOwner":    "sat_owner",
    "SatState":    "sat_state",
    "Flight_ID":   "flight_id",
})

merged = base.merge(ll2_df, left_on="launch_date", right_on="ll2_date", how="left")
print(f"  LL2 matched: {merged['ll2_name'].notna().sum()}/{len(merged)}")

merged["orbit_class"] = merged["orbit_class"].combine_first(merged["ll2_orbit"])

# Integrate legacy LL2 fields into primary fields
merged["launch_pad"] = merged["launch_pad"].combine_first(merged["ll2_pad"])

# For ll2_status, parse and fill missing launch_success values
def parse_ll2_status(status):
    if pd.isna(status):
        return None
    s = str(status).strip().lower()
    if "success" in s or s in ("go", "on target"):
        return True
    if "failure" in s or "fail" in s or s == "tbd":
        return False
    return None

missing_success = merged["launch_success"].isna()
merged.loc[missing_success, "launch_success"] = merged.loc[missing_success, "ll2_status"].apply(parse_ll2_status)

lox_pattern = r"(?i)^(liquid oxygen|lox)$"
bad = merged["propellant_1"].str.match(lox_pattern, na=False)

if bad.any():
    merged.loc[bad, ["propellant_1", "propellant_2"]] = \
        merged.loc[bad, ["propellant_2", "propellant_1"]].values

merged = merged.drop_duplicates(subset="launch_tag", keep="first")

# 5. Output
print("[5/5] Building output...")

merged["has_orbital_params"] = merged["perigee_km"].notna()
merged["has_recovery_data"]  = merged["recovery_type"].notna()
merged["data_complete"]      = merged["has_orbital_params"] & merged["has_recovery_data"]

FINAL_COLS = {
    "launch_tag":           "launch_tag",
    "launch_date":          "launch_date",
    "vehicle_name":         "vehicle_name",
    "provider":             "provider",
    "vehicle_country":      "vehicle_country",
    "engine_type":          "engine_type",
    "propellant_1":         "propellant_1",
    "propellant_2":         "propellant_2",
    "reusable_first_stage": "reusable_first_stage",
    "launch_agency":        "launch_agency",
    "lv_state":             "lv_state",
    "launch_site":          "launch_site",
    "launch_pad":           "launch_pad",
    "ll2_location":         "ll2_location",
    "ll2_lat":              "launch_lat",
    "ll2_lon":              "launch_lon",
    "platform":             "platform",
    "launch_success":       "launch_success",
    "flight_id":            "flight_id",
    "mission_name":         "mission_name",
    "payload_name":         "payload_name",
    "sat_owner":            "sat_owner",
    "sat_state":            "sat_state",
    "ll2_name":             "ll2_mission_name",
    "ll2_mission_type":     "mission_type",
    "ll2_mission_desc":     "mission_description",
    "orbit_class":          "orbit_class",
    "ll2_orbit_name":       "orbit_name",
    "perigee_km":           "perigee_km",
    "apogee_km":            "apogee_km",
    "inclination_deg":      "inclination_deg",
    "booster_serial":       "booster_serial",
    "booster_flight_n":     "booster_flight_number",
    "booster_reused":       "booster_reused",
    "recovery_attempted":   "recovery_attempted",
    "recovery_success":     "recovery_success",
    "recovery_type":        "recovery_type",
    "recovery_vessel":      "recovery_vessel",
    "has_orbital_params":   "has_orbital_params",
    "has_recovery_data":    "has_recovery_data",
    "data_complete":        "data_complete",
}

available = {k: v for k, v in FINAL_COLS.items() if k in merged.columns}
final = merged[list(available.keys())].rename(columns=available).copy()

final.replace({"-": pd.NA, "-.1": pd.NA, "-.2": pd.NA}, inplace=True)

for col in final.select_dtypes(include="object").columns:
    final[col] = final[col].apply(lambda x: x.strip() if isinstance(x, str) else x)

final.to_csv("Spaceflight_Data.csv", index=False)
print(f"Done. {len(final):,} rows x {len(final.columns)} columns -> Spaceflight_Data.csv")
