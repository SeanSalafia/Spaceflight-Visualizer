import { unlinkSync, existsSync } from "fs";

import type {
  LL2Launch,
  LL2Paginated,
  LL2LauncherStage,
  CollectState,
  LaunchRecord,
  OutputData,
  GeneralInfo,
  VehicleInformation,
  MissionInformation,
  PayloadInformation,
  OrbitSpecifics,
  RecoveryInformation,
  CrewMemberRecord,
} from "./types";

// Configuration

const LL2_BASE = "https://ll.thespacedevs.com/2.2.0";
const PAGE_SIZE = 100;
const DELAY_MS = 1000; // 1 req/second to all LL2 endpoints
const STATE_FILE = ".collect_state.json";

const LL2_API_KEY = process.env.LL2_API_KEY ?? null;

// Status IDs considered a completed launch outcome

const COMPLETED = new Set([3, 4, 7]); // Success, Failure, Partial Failure

// Engine & Propellant Lookup

const ROCKET_SPECS: Record<string, { engine: string; propellant: string }> = {

  // SpaceX

  "Falcon 9":                { engine: "Merlin 1D",                  propellant: "RP-1/LOX" },
  "Falcon Heavy":            { engine: "Merlin 1D (x27 core)",       propellant: "RP-1/LOX" },
  "Falcon 1":                { engine: "Merlin 1A / 1C",             propellant: "RP-1/LOX" },
  "Starship":                { engine: "Raptor 2",                   propellant: "CH4/LOX (Methalox)" },

  // Blue Origin

  "New Glenn":               { engine: "BE-4",                       propellant: "CH4/LOX (Methalox)" },
  "New Shepard":             { engine: "BE-3PM",                     propellant: "LH2/LOX (Hydrolox)" },

  // ULA

  "Vulcan Centaur":          { engine: "BE-4 / RL-10C-1-1",          propellant: "CH4/LOX + LH2/LOX" },
  "Atlas V":                 { engine: "RD-180 / RL-10",             propellant: "RP-1/LOX + LH2/LOX" },
  "Delta IV Heavy":          { engine: "RS-68A / RL-10B-2",          propellant: "LH2/LOX (Hydrolox)" },
  "Delta IV Medium":         { engine: "RS-68 / RL-10B-2",           propellant: "LH2/LOX (Hydrolox)" },
  "Delta II":                { engine: "RS-27A / AJ10-118K",         propellant: "RP-1/LOX + N2O4/AK50" },

  // NASA / SLS

  "SLS":                     { engine: "RS-25 / RL-10C",             propellant: "LH2/LOX (Hydrolox)" },

  // Northrop Grumman

  "Antares":                 { engine: "RD-181 / CASTOR 30XL",       propellant: "RP-1/LOX + Solid" },
  "Minotaur-C":              { engine: "Solid",                      propellant: "Solid" },
  "Minotaur IV":             { engine: "Solid",                      propellant: "Solid" },
  "Minotaur I":              { engine: "Solid",                      propellant: "Solid" },
  "Pegasus XL":              { engine: "Orion 50S XL / Star 27",     propellant: "Solid" },

  // Rocket Lab

  "Electron":                { engine: "Rutherford (electric pump)", propellant: "RP-1/LOX" },
  "Neutron":                 { engine: "Archimedes",                 propellant: "CH4/LOX (Methalox)" },

  // Virgin Orbit

  "LauncherOne":             { engine: "NewtonThree / NewtonFour",   propellant: "RP-1/LOX" },

  // Relativity Space

  "Terran 1":                { engine: "Aeon 1",                     propellant: "CH4/LOX (Methalox)" },
  "Terran R":                { engine: "Aeon R",                     propellant: "CH4/LOX (Methalox)" },

  // Firefly

  "Alpha":                   { engine: "Reaver / Lightning",         propellant: "RP-1/LOX" },

  // Roscosmos / Russian

  "Soyuz 2.1a":              { engine: "RD-107A / RD-0110",          propellant: "RP-1/LOX" },
  "Soyuz 2.1b":              { engine: "RD-107A / RD-0124",          propellant: "RP-1/LOX" },
  "Soyuz-FG":                { engine: "RD-107A / RD-0110",          propellant: "RP-1/LOX" },
  "Soyuz-U":                 { engine: "RD-107A / RD-0110",          propellant: "RP-1/LOX" },
  "Soyuz":                   { engine: "RD-107 / RD-0110",           propellant: "RP-1/LOX" },
  "Proton-M":                { engine: "RD-275M / RD-0213",          propellant: "N2O4/UDMH" },
  "Proton-K":                { engine: "RD-253 / RD-0210",           propellant: "N2O4/UDMH" },
  "Zenit":                   { engine: "RD-171 / RD-120",            propellant: "RP-1/LOX" },
  "Angara A5":               { engine: "RD-191 / RD-0124",           propellant: "RP-1/LOX" },
  "Angara 1.2":              { engine: "RD-191",                     propellant: "RP-1/LOX" },
  "Rokot":                   { engine: "RD-0233 / RD-0235",          propellant: "N2O4/UDMH" },
  "Kosmos":                  { engine: "RD-219 / RD-119",            propellant: "N2O4/UDMH" },
  "Dneprs":                  { engine: "RD-264",                     propellant: "N2O4/UDMH" },
  "Shtil":                   { engine: "Solid",                      propellant: "Solid" },
  "Volna":                   { engine: "Solid",                      propellant: "Solid" },
  "Start":                   { engine: "Solid",                      propellant: "Solid" },

  // ESA / ArianeGroup

  "Ariane 5 ECA+":           { engine: "Vulcain 2.1 / HM7B",        propellant: "LH2/LOX (Hydrolox)" },
  "Ariane 5 ECA":            { engine: "Vulcain 2 / HM7B",          propellant: "LH2/LOX (Hydrolox)" },
  "Ariane 5 ES":             { engine: "Vulcain 2 / HM7B",          propellant: "LH2/LOX (Hydrolox)" },
  "Ariane 5":                { engine: "Vulcain 2 / HM7B",          propellant: "LH2/LOX (Hydrolox)" },
  "Ariane 6":                { engine: "Vulcain 2.1 / Vinci",       propellant: "LH2/LOX (Hydrolox)" },
  "Ariane 4":                { engine: "Viking 5C / HM7B",          propellant: "N2O4/UDMH + LH2/LOX" },
  "Vega-C":                  { engine: "P120C / Zefiro-40",         propellant: "Solid" },
  "Vega":                    { engine: "P80 / Zefiro-23",           propellant: "Solid" },

  // JAXA

  "H-IIA":                   { engine: "LE-7A / LE-5B",             propellant: "LH2/LOX (Hydrolox)" },
  "H-IIB":                   { engine: "LE-7A (×2) / LE-5B",        propellant: "LH2/LOX (Hydrolox)" },
  "H3":                      { engine: "LE-9 / LE-5B-3",            propellant: "LH2/LOX (Hydrolox)" },
  "H-II":                    { engine: "LE-7 / LE-5A",              propellant: "LH2/LOX (Hydrolox)" },
  "Epsilon":                 { engine: "Solid",                     propellant: "Solid" },
  "J-I":                     { engine: "Solid",                     propellant: "Solid" },
  "M-V":                     { engine: "Solid",                     propellant: "Solid" },
  "Mu-3S II":                { engine: "Solid",                     propellant: "Solid" },

  // ISRO

  "PSLV":                    { engine: "S139 / Vikas",              propellant: "Solid/N2O4+UDMH" },
  "GSLV Mk III":             { engine: "Vikas / CE-20",             propellant: "N2O4/UDMH + LH2/LOX" },
  "LVM3":                    { engine: "Vikas / CE-20",             propellant: "N2O4/UDMH + LH2/LOX" },
  "GSLV":                    { engine: "Vikas / CE-7.5",            propellant: "N2O4/UDMH + LH2/LOX" },
  "SSLV":                    { engine: "SS1 / L110 / CE-10",        propellant: "Solid/Liquid" },
  "SLV":                     { engine: "Solid",                     propellant: "Solid" },
  "ASLV":                    { engine: "Solid",                     propellant: "Solid" },

  // CNSA / Chinese

  "Long March 5B":           { engine: "YF-77 (×2)",                propellant: "LH2/LOX (Hydrolox)" },
  "Long March 5":            { engine: "YF-77 / YF-75D",            propellant: "LH2/LOX (Hydrolox)" },
  "Long March 7A":           { engine: "YF-100 / YF-115 / YF-75D",  propellant: "RP-1/LOX + LH2/LOX" },
  "Long March 7":            { engine: "YF-100 / YF-115",           propellant: "RP-1/LOX" },
  "Long March 8":            { engine: "YF-100 / YF-75D",           propellant: "RP-1/LOX + LH2/LOX" },
  "Long March 6A":           { engine: "YF-100K / YF-115",          propellant: "RP-1/LOX" },
  "Long March 6":            { engine: "YF-100 / YF-115",           propellant: "RP-1/LOX" },
  "Long March 3C":           { engine: "YF-21 / YF-75",             propellant: "N2O4/UDMH + LH2/LOX" },
  "Long March 3B":           { engine: "YF-21 / YF-75",             propellant: "N2O4/UDMH + LH2/LOX" },
  "Long March 3A":           { engine: "YF-21 / YF-75",             propellant: "N2O4/UDMH + LH2/LOX" },
  "Long March 4C":           { engine: "YF-21 / YF-22E",            propellant: "N2O4/UDMH" },
  "Long March 4B":           { engine: "YF-21 / YF-22E",            propellant: "N2O4/UDMH" },
  "Long March 2F":           { engine: "YF-20B / YF-24E",           propellant: "N2O4/UDMH" },
  "Long March 2D":           { engine: "YF-21C / YF-22E",           propellant: "N2O4/UDMH" },
  "Long March 2C":           { engine: "YF-21C / YF-22E",           propellant: "N2O4/UDMH" },
  "Long March 2E":           { engine: "YF-20 / YF-22",             propellant: "N2O4/UDMH" },
  "Long March 11":           { engine: "Solid",                     propellant: "Solid" },
  "Long March 1":            { engine: "YF-2A / YF-3 / Solid",      propellant: "N2O4/UDMH + Solid" },
  "Zhuque-2":                { engine: "Tianque-12",                propellant: "CH4/LOX (Methalox)" },
  "Zhuque-3":                { engine: "Tianque-12B",               propellant: "CH4/LOX (Methalox)" },
  "Kuaizhou-11":             { engine: "Solid",                     propellant: "Solid" },
  "Kuaizhou-1A":             { engine: "Solid",                     propellant: "Solid" },
  "Ceres-1":                 { engine: "Solid",                     propellant: "Solid" },
  "Gravity-1":               { engine: "Solid",                     propellant: "Solid" },
  "Hyperbola-1":             { engine: "Solid",                     propellant: "Solid" },
  "Jielong-3":               { engine: "Solid",                     propellant: "Solid" },
  "Tianlong-2":              { engine: "TH-12",                     propellant: "RP-1/LOX" },
  "Lijian-1":                { engine: "Solid",                     propellant: "Solid" },

  // R-7 / Sputnik family (Soviet R-7 ICBM derivatives)

  "Sputnik 8K74PS":          { engine: "RD-107 / RD-108",           propellant: "RP-1/LOX" },
  "Sputnik 8A91":            { engine: "RD-107 / RD-108",           propellant: "RP-1/LOX" },
  "Luna 8K72":               { engine: "RD-107 / RD-108 / RD-0105", propellant: "RP-1/LOX" },
  "Luna 8K72PS":             { engine: "RD-107 / RD-108 / RD-0105", propellant: "RP-1/LOX" },
  "Vostok 8A92":             { engine: "RD-107 / RD-108 / RD-0109", propellant: "RP-1/LOX" },
  "Vostok-K":                { engine: "RD-107 / RD-108 / RD-0109", propellant: "RP-1/LOX" },
  "Vostok-2":                { engine: "RD-107 / RD-108 / RD-0109", propellant: "RP-1/LOX" },
  "Voskhod":                 { engine: "RD-107 / RD-108 / RD-0110", propellant: "RP-1/LOX" },
  "Molniya":                 { engine: "RD-107 / RD-108 / RD-0110", propellant: "RP-1/LOX" },
  "Polyot":                  { engine: "RD-107 / RD-108 / RD-0110", propellant: "RP-1/LOX" },
  "Sputnik":                 { engine: "RD-107 / RD-108",           propellant: "RP-1/LOX" },

  // Other / Historical

  "Saturn V":                { engine: "F-1 / J-2",                 propellant: "RP-1/LOX + LH2/LOX" },
  "Saturn IB":               { engine: "H-1 / J-2",                 propellant: "RP-1/LOX + LH2/LOX" },
  "Titan IV":                { engine: "LR87 / LR91 / RL-10",       propellant: "N2O4/UDMH + LH2/LOX" },
  "Titan III":               { engine: "LR87 / LR91 / Solid",       propellant: "N2O4/UDMH + Solid" },
  "Titan II":                { engine: "LR87-AJ-11 / LR91-AJ-11",   propellant: "N2O4/Aerozine 50" },
  "Titan I":                 { engine: "LR87 / LR91",               propellant: "RP-1/LOX" },
  "Atlas-Centaur":           { engine: "RS-56 / RL-10",             propellant: "RP-1/LOX + LH2/LOX" },
  "Atlas E/F":               { engine: "RS-56-OBA",                 propellant: "RP-1/LOX" },
  "Atlas D":                 { engine: "MA-2 / MA-3",               propellant: "RP-1/LOX" },
  "Atlas":                   { engine: "MA series",                 propellant: "RP-1/LOX" },
  "Thor-Delta":              { engine: "MB-3 / AJ-10",              propellant: "RP-1/LOX + N2O4/Aerozine" },
  "Thor":                    { engine: "MB-3",                      propellant: "RP-1/LOX" },
  "Scout":                   { engine: "Solid",                     propellant: "Solid" },
  "Redstone":                { engine: "A-7",                       propellant: "Ethanol/LOX" },
  "Juno I":                  { engine: "A-7 / Solid",               propellant: "Ethanol/LOX + Solid" },
  "Juno II":                 { engine: "S-3D / Solid",              propellant: "RP-1/LOX + Solid" },
  "Vanguard":                { engine: "GE X-405 / AJ-10",          propellant: "RP-1/LOX + RFNA/UDMH" },
  "R-7":                     { engine: "RD-107 / RD-108",           propellant: "RP-1/LOX" },

};

function getRocketSpecs(name: string): { engine: string; propellant: string } {

  if (ROCKET_SPECS[name]) return ROCKET_SPECS[name];

  for (const [key, val] of Object.entries(ROCKET_SPECS)) {

    if (name.startsWith(key)) return val;

  }

  for (const [key, val] of Object.entries(ROCKET_SPECS)) {

    if (name.toLowerCase().includes(key.toLowerCase())) return val;

  }

  return { engine: "Unknown", propellant: "Unknown" };

}

// Date / Time Helpers

function formatDate(iso: string | null | undefined): string | null {

  if (!iso) return null;

  const d = new Date(iso);

  if (isNaN(d.getTime())) return null;

  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");

  const yyyy = d.getUTCFullYear();

  return `${mm}/${dd}/${yyyy}`;

}

function formatTime(iso: string | null | undefined): string | null {

  if (!iso) return null;

  const d = new Date(iso);

  if (isNaN(d.getTime())) return null;

  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");

  return `${hh}:${min}:${ss} UTC`;

}

// Parse ISO 8601 duration (e.g. "P14DT6H") into fractional days
function parseDurationDays(dur: string | null | undefined): number | null {

  if (!dur) return null;

  const m = dur.match(/P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/);
  if (!m) return null;

  const days = parseInt(m[3] ?? "0", 10);
  const hours = parseInt(m[4] ?? "0", 10);

  return days + hours / 24;

}

// Launch Transform

const OUTCOME_MAP: Record<number, string> = {

  1: "Go for Launch",
  2: "To Be Determined",
  3: "Success",
  4: "Failure",
  5: "On Hold",
  6: "In Flight",
  7: "Partial Failure",
  8: "To Be Confirmed",

};

function transformLaunch(launch: LL2Launch): LaunchRecord {

  const cfg = launch.rocket.configuration;
  const lsp = launch.launch_service_provider;
  const stage = launch.rocket.launcher_stage[0] as LL2LauncherStage | undefined;
  const sc = launch.rocket.spacecraft_stage;
  const mission = launch.mission;
  const pad = launch.pad;
  const allCrew = [...(sc?.launch_crew ?? []), ...(sc?.onboard_crew ?? [])];

  const specs = getRocketSpecs(cfg.name);
  const mfr = cfg.manufacturer ?? lsp;
  const program  = launch.program[0] ?? null;
  const patch = launch.mission_patches.sort((a, b) => a.priority - b.priority)[0] ?? null;
  const infoURL = launch.infoURLs[0]?.url ?? null;
  const vidURL = launch.vidURLs[0]?.url ?? null;

  // General Info

  const generalInfo: GeneralInfo = {

    launch_id:                        launch.id,
    launch_name:                      launch.name,
    slug:                             launch.slug,
    date_utc:                         formatDate(launch.net) ?? launch.net,
    launch_time_utc:                  formatTime(launch.net),
    window_start:                     formatDate(launch.window_start),
    window_end:                       formatDate(launch.window_end),
    net_precision:                    launch.net_precision?.name ?? null,
    outcome:                          OUTCOME_MAP[launch.status.id] ?? launch.status.name,
    outcome_detail:                   launch.failreason ?? null,
    hold_reason:                      launch.holdreason ?? null,
    weather_concerns:                 launch.weather_concerns ?? null,
    launch_site: {
      name:                           pad.name,
      location:                       pad.location.name,
      country_code:                   pad.country_code ?? pad.location.country_code,
      timezone:                       pad.location.timezone_name,
      latitude:                       pad.latitude  ? parseFloat(pad.latitude)  : null,
      longitude:                      pad.longitude ? parseFloat(pad.longitude) : null,
      map_url:                        pad.map_url ?? null,
      total_pad_launches:             pad.total_launch_count,
      total_location_launches:        pad.location.total_launch_count,
      total_location_landings:        pad.location.total_landing_count,
    },
    pad_turnaround_days:              parseDurationDays(launch.pad_turnaround),
    webcast_live:                     launch.webcast_live,
    image_url:                        launch.image ?? null,
    mission_patch_url:                patch?.image_url ?? null,
    info_url:                         infoURL,
    video_url:                        vidURL,
    flightclub_url:                   launch.flightclub_url ?? null,
    program:                          program?.name ?? null,
    program_type:                     program?.type?.name ?? null,
    hashtag:                          launch.hashtag ?? null,
    orbital_launch_count_all_time:    launch.orbital_launch_attempt_count ?? null,
    orbital_launch_count_ytd:         launch.orbital_launch_attempt_count_year ?? null,
    pad_launch_count_all_time:        launch.pad_launch_attempt_count ?? null,
    agency_launch_count_all_time:     launch.agency_launch_attempt_count ?? null,
    agency_launch_count_ytd:          launch.agency_launch_attempt_count_year ?? null,
    last_updated:                     launch.last_updated,

  };

  // Vehicle Information
  const vehicleInformation: VehicleInformation = {

    vehicle_name:                     cfg.name,
    vehicle_full_name:                cfg.full_name ?? null,
    vehicle_family:                   cfg.family ?? null,
    vehicle_variant:                  cfg.variant ?? null,
    vehicle_alias:                    cfg.alias ?? null,
    vehicle_active:                   cfg.active,

    launch_provider:                  lsp.name,
    provider_type:                    lsp.type ?? null,
    provider_country:                 lsp.country_code ?? null,
    provider_total_launches:          lsp.total_launch_count,
    provider_successful_launches:     lsp.successful_launches,
    provider_failed_launches:         lsp.failed_launches,
    provider_consecutive_successes:   lsp.consecutive_successful_launches,

    manufacturer:                     mfr.name,
    manufacturer_country:             mfr.country_code ?? null,

    engine_type:                      specs.engine,
    propellants:                      specs.propellant,

    reusable:                         cfg.reusable ?? false,
    min_stages:                       cfg.min_stage ?? null,
    max_stages:                       cfg.max_stage ?? null,
    length_m:                         cfg.length ?? null,
    diameter_m:                       cfg.diameter ?? null,
    launch_mass_t:                    cfg.launch_mass ?? null,
    leo_capacity_kg:                  cfg.leo_capacity ?? null,
    gto_capacity_kg:                  cfg.gto_capacity ?? null,
    total_thrust_kn:                  cfg.to_thrust ?? null,
    launch_cost_usd:                  cfg.launch_cost ?? null,

    vehicle_total_launches:           cfg.total_launch_count,
    vehicle_successful_launches:      cfg.successful_launches,
    vehicle_failed_launches:          cfg.failed_launches,
    vehicle_successful_landings:      cfg.successful_landings,
    vehicle_attempted_landings:       cfg.attempted_landings,
    vehicle_consecutive_successes:    cfg.consecutive_successful_launches,

    maiden_flight_date:               formatDate(cfg.maiden_flight),
    vehicle_wiki_url:                 cfg.wiki_url ?? null,

  };

  // Mission Information
  const crewMembers: CrewMemberRecord[] = allCrew.map(c => ({

    name:           c.astronaut.name,
    role:           c.role.role,
    nationality:    c.astronaut.nationality ?? null,
    date_of_birth:  formatDate(c.astronaut.date_of_birth),
    flights_count:  0,  // not available in crew sub-object; full detail requires /astronaut/ endpoint
    time_in_space:  c.astronaut.time_in_space ?? null,
    agency:         c.astronaut.agency?.name ?? null,

  }));

  const missionInformation: MissionInformation = {

    mission_name:           mission?.name ?? null,
    mission_type:           mission?.type ?? null,
    mission_description:    mission?.description ?? null,
    launch_designator:      mission?.launch_designator ?? null,
    agency_type:            lsp.type ?? null,
    orbit_name:             mission?.orbit?.name ?? null,
    orbit_abbreviation:     mission?.orbit?.abbrev ?? null,
    destination:            sc?.destination ?? null,
    mission_end_date:       formatDate(sc?.mission_end),
    crew_size:              allCrew.length,
    crew_members:           crewMembers,

  };

  // Payload Information
  const spacecraft = sc?.spacecraft ?? null;
  const scCfg      = spacecraft?.spacecraft_config ?? null;

  const payloadInformation: PayloadInformation = {

    payload_name:                spacecraft?.name ?? mission?.name ?? null,
    payload_type:                scCfg?.type?.name ?? null,
    spacecraft_name:             spacecraft?.name ?? null,
    spacecraft_serial:           spacecraft?.serial_number ?? null,
    spacecraft_human_rated:      scCfg?.human_rated ?? null,
    spacecraft_crew_capacity:    scCfg?.crew_capacity ?? null,
    spacecraft_payload_capacity_kg: scCfg?.payload_capacity ?? null,
    spacecraft_height_m:         scCfg?.height ?? null,
    spacecraft_diameter_m:       scCfg?.diameter ?? null,
    payload_reused:              stage?.reused ?? null,

  };

  // Orbit Specifics
  const orbitSpecifics: OrbitSpecifics = {

    orbit_name:         mission?.orbit?.name ?? null,
    orbit_abbreviation: mission?.orbit?.abbrev ?? null,
    perigee_km:         null,
    apogee_km:          null,
    inclination_deg:    null,

  };

  // Recovery Information
  const landing = stage?.landing ?? sc?.landing ?? null;
  const launcher = stage?.launcher ?? null;

  const recoveryInformation: RecoveryInformation = {

    booster_serial:             launcher?.serial_number ?? null,
    booster_flight_number:      stage?.launcher_flight_number ?? null,
    reused:                     stage?.reused ?? null,
    days_since_last_flight:     stage?.turn_around_time_days ?? null,
    previous_mission:           stage?.previous_flight?.name ?? null,

    recovery_attempted:         landing?.attempt ?? false,
    recovery_success:           landing?.success ?? null,
    recovery_type:              landing?.type?.abbrev ?? null,
    recovery_vessel:            landing?.location?.name ?? null,
    recovery_vessel_landings:   landing?.location?.successful_landings ?? null,
    recovery_location:          landing?.location?.location?.name ?? null,
    downrange_distance_km:      landing?.downrange_distance ?? null,

    booster_total_flights:      launcher?.flights ?? null,
    booster_successful_landings: launcher?.successful_landings ?? 0,
    booster_attempted_landings:  launcher?.attempted_landings ?? 0,
    booster_status:             launcher?.status ?? null,

  };

  return {

    "General Info":        generalInfo,
    "Vehicle Information": vehicleInformation,
    "Mission Information": missionInformation,
    "Payload Information": payloadInformation,
    "Orbit Specifics":     orbitSpecifics,
    "Recovery Information": recoveryInformation,

  };

}

// HTTP

function sleep(ms: number): Promise<void> {

  return new Promise(res => setTimeout(res, ms));

}

async function fetchPage(url: string): Promise<LL2Paginated<LL2Launch>> {

  const headers: Record<string, string> = {

    "User-Agent": "SpaceflightVisualizer/2.0 (Educational/Research)",

  };

  if (LL2_API_KEY) headers["Authorization"] = `Token ${LL2_API_KEY}`;

  const res = await fetch(url, { headers });

  if (res.status === 429) {

    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "3600", 10);
    const err = new Error(`RATE_LIMIT:${retryAfter}:${url}`);

    err.name = "RateLimitError";
    throw err;

  }

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);

  return res.json() as Promise<LL2Paginated<LL2Launch>>;

}

// State & Output Persistence

async function loadState(): Promise<CollectState | null> {

  if (!existsSync(STATE_FILE)) return null;

  try {

    return await Bun.file(STATE_FILE).json() as CollectState;

  } catch {

    return null;

  }

}

async function saveState(state: CollectState): Promise<void> {

  await Bun.write(STATE_FILE, JSON.stringify(state, null, 2));

}

function deleteState(): void {

  try { unlinkSync(STATE_FILE); } catch { /* already gone */ }

}

async function writeOutput(records: LaunchRecord[], outputFile: string): Promise<void> {

  const padWidth = Math.max(4, String(records.length).length);
  const out: OutputData = {};

  for (let i = 0; i < records.length; i++) {

    out[`Launch_${String(i + 1).padStart(padWidth, "0")}`] = records[i];

  }

  await Bun.write(outputFile, JSON.stringify(out, null, 2));

}

async function loadExistingRecords(outputFile: string): Promise<LaunchRecord[]> {

  if (!existsSync(outputFile)) return [];

  try {

    const data = await Bun.file(outputFile).json() as Record<string, LaunchRecord>;
    return Object.values(data);

  } catch {

    return [];

  }

}

// CLI

function parseArgs(): { output: string; max: number } {

  const args = process.argv.slice(2);

  if (args.includes("--help")) {

    console.log(`
      Spaceflight Launch Data Collector  (LL2 source)
      Usage: bun run collect.ts [--output <file>] [--max <n>]

        --output <file>   Output JSON file  (default: spaceflight_data.json)
        --max <n>         Fetch at most N launches  (default: all)
        --help            Show this message

      Environment:
        LL2_API_KEY       LL2 API token — removes rate limits
                          Free key: https://thespacedevs.com/

      On rate-limit the script saves progress and exits.
      Re-run the same command to resume.
    `);

    process.exit(0);

  }

  const oi = args.indexOf("--output");
  const mi = args.indexOf("--max");

  return {

    output: oi >= 0 ? args[oi + 1] : "spaceflight_data.json",
    max: mi >= 0 ? parseInt(args[mi + 1], 10) : Infinity,

  };

}

// Main

async function main(): Promise<void> {

  const { output, max } = parseArgs();

  const startTime = Date.now();

  console.log("  Spaceflight Launch Data Collector");
  console.log(`  Output  : ${output}`);
  console.log(`  Max     : ${max === Infinity ? "all" : max}`);
  console.log(`  Auth    : ${LL2_API_KEY ? "API key present" : "anonymous (15 req/hr)"}`);

  // Resume only when a matching state file exists; otherwise always start fresh

  const state = await loadState();
  const records: LaunchRecord[] = [];

  let nextUrl: string | null;
  let page: number;
  let totalInDB = 0;

  if (state && state.output_file === output) {

    const existing = await loadExistingRecords(output);

    records.push(...existing);
    console.log(`\nResuming from page ${state.page} — ${records.length} launches already collected.`);

    nextUrl = state.next_url;
    page = state.page;
    totalInDB = records.length;  // best estimate until we fetch

  } else {

    if (state) deleteState();  // stale state for a different output file

    const now = encodeURIComponent(new Date().toISOString());

    nextUrl = `${LL2_BASE}/launch/?mode=detailed&limit=${PAGE_SIZE}&ordering=net&net__lte=${now}`;
    page = 1;

  }

  while (nextUrl !== null && records.length < max) {

    // Throttle: 1 request per second

    if (page > (state?.page ?? 1) || !state) {

      await sleep(DELAY_MS);

    }

    let pageData: LL2Paginated<LL2Launch>;

    try {

      pageData = await fetchPage(nextUrl);

    } catch (err) {

      const msg = (err as Error).message;

      if (msg.startsWith("RATE_LIMIT:")) {

        // Format is "RATE_LIMIT:<seconds>:<url>" — split on first two colons only

        const firstColon = msg.indexOf(":");
        const secondColon = msg.indexOf(":", firstColon + 1);
        const afterStr = msg.slice(firstColon + 1, secondColon);
        const blockedUrl = msg.slice(secondColon + 1);
        const waitMin = Math.ceil(parseInt(afterStr, 10) / 60);

        // Write whatever we have and save state

        await writeOutput(records, output);
        await saveState({

          output_file: output,
          endpoint: "/launch/",
          next_url: blockedUrl ?? nextUrl,
          page,
          collected: records.length,
          timestamp: new Date().toISOString(),

        });

        console.log(`  Rate limit reached — progress saved`);
        console.log(`  Collected : ${records.length} launches`);
        console.log(`  Page      : ${page}`);
        console.log(`  Endpoint  : /launch/`);
        console.log(`  Resume in : ~${waitMin} min`);
        console.log(`  State     : ${STATE_FILE}`);
        console.log(`  Output    : ${output} (${records.length} records written)`);
        console.log(`\n  Re-run the same command to continue.`);
        process.exit(0);
      }

      throw err;

    }

    totalInDB = pageData.count;

    for (const launch of pageData.results) {

      if (!COMPLETED.has(launch.status.id)) continue;
      if (records.length >= max) break;

      records.push(transformLaunch(launch));

    }

    nextUrl = pageData.next;
    page++;

    process.stdout.write(`\r  Page ${page - 1}: ${records.length} collected / ${totalInDB} in DB   ` );

    // Persist after every page so data is never lost

    await writeOutput(records, output);

    if (nextUrl) {

      await saveState({

        output_file: output,
        endpoint: "/launch/",
        next_url: nextUrl,
        page,
        collected: records.length,
        timestamp: new Date().toISOString(),

      });

    }

  }

  process.stdout.write("\n");

  // Collection complete

  await writeOutput(records, output);
  deleteState();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const fileSizeMB = (await Bun.file(output).size / 1_048_576).toFixed(2);

  // Summary

  const outcomes: Record<string, number> = {};
  const providers: Record<string, number> = {};
  const countries: Record<string, number> = {};

  for (const r of records) {

    const o = r["General Info"].outcome;
    const p = r["Vehicle Information"].launch_provider;
    const c = r["Vehicle Information"].manufacturer_country ?? "Unknown";

    outcomes[o] = (outcomes[o]  ?? 0) + 1;
    providers[p] = (providers[p] ?? 0) + 1;
    countries[c] = (countries[c] ?? 0) + 1;

  }

  const topProviders = Object.entries(providers)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([n, c]) => `    ${n}: ${c}`).join("\n");

  const topCountries = Object.entries(countries)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `    ${c}: ${n}`).join("\n");

  // Sort MM/DD/YYYY as YYYYMMDD for chronological ordering

  const toSortKey = (d: string) => {

    const [mm, dd, yyyy] = d.split("/");
    return `${yyyy}${mm}${dd}`;

  };

  const dates = records
    .map(r => r["General Info"].date_utc)
    .sort((a, b) => toSortKey(a).localeCompare(toSortKey(b)));

  const crewed = records.filter(r => r["Mission Information"].crew_size > 0).length;
  const reused = records.filter(r => r["Recovery Information"].reused === true).length;
  const recovered = records.filter(r => r["Recovery Information"].recovery_attempted).length;

  console.log(`
      Collection Complete
      Launches    : ${records.length} of ${totalInDB}
      Date range  : ${dates[0]} → ${dates[dates.length - 1]}
      Output      : ${output}  (${fileSizeMB} MB)
      Time        : ${elapsed}s

      Outcomes:
    ${Object.entries(outcomes).map(([k, v]) => `    ${k}: ${v}`).join("\n")}

      Top providers:
    ${topProviders}

      By manufacturer country:
    ${topCountries}

      Crewed missions   : ${crewed}
      Reused boosters   : ${reused}
      Recovery attempts : ${recovered}
  `);
}

main().catch(err => {

  console.error("\nError:", (err as Error).message);
  process.exit(1);

});
