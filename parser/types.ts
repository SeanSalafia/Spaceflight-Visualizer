// LL2 API Response Types (matches ll.thespacedevs.com/2.2.0)

export interface LL2Paginated<T> {

  count: number;
  next: string | null;
  previous: string | null;
  results: T[];

}

export interface LL2Status {

  id: number;
  name: string;
  abbrev: string;
  description: string;

}

export interface LL2Agency {

  id: number;
  url: string;
  name: string;
  featured: boolean;
  type: string | null;
  country_code: string | null;
  abbrev: string | null;
  description: string | null;
  administrator: string | null;
  founding_year: string | null;
  launchers: string;
  spacecraft: string;
  launch_library_url: string | null;
  total_launch_count: number;
  consecutive_successful_launches: number;
  successful_launches: number;
  failed_launches: number;
  pending_launches: number;
  consecutive_successful_landings: number;
  successful_landings: number;
  failed_landings: number;
  attempted_landings: number;
  info_url: string | null;
  wiki_url: string | null;
  logo_url: string | null;
  image_url: string | null;
  nation_url: string | null;

}

export interface LL2Orbit {

  id: number;
  name: string;
  abbrev: string;

}

export interface LL2MissionPatch {

  id: number;
  name: string;
  priority: number;
  image_url: string | null;
  agency: Pick<LL2Agency, "id" | "url" | "name" | "type"> | null;

}

export interface LL2InfoURL {

  priority: number;
  source: string;
  title: string | null;
  description: string | null;
  feature_image: string | null;
  url: string;

}

export interface LL2VidURL {

  priority: number;
  source: string;
  publisher: string | null;
  title: string | null;
  description: string | null;
  feature_image: string | null;
  url: string;

}

export interface LL2TimelineEvent {

  type: string;
  relative_time: string;

}

export interface LL2Update {

  id: number;
  profile_image: string | null;
  comment: string | null;
  info_url: string | null;
  created_by: string;
  created_on: string;

}

export interface LL2Program {

  id: number;
  url: string;
  name: string;
  description: string | null;
  agencies: Pick<LL2Agency, "id" | "url" | "name" | "type" | "country_code">[];
  image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  info_url: string | null;
  wiki_url: string | null;
  mission_patches: LL2MissionPatch[];
  type: { id: number; name: string } | null;

}

export interface LL2RocketConfiguration {

  id: number;
  url: string;
  name: string;
  active: boolean;
  reusable: boolean;
  description: string | null;
  family: string | null;
  full_name: string | null;
  variant: string | null;
  alias: string | null;
  min_stage: number | null;
  max_stage: number | null;
  length: number | null;
  diameter: number | null;
  maiden_flight: string | null;
  launch_cost: string | null;
  launch_mass: number | null;
  leo_capacity: number | null;
  gto_capacity: number | null;
  to_thrust: number | null;
  apogee: number | null;
  vehicle_range: number | null;
  image_url: string | null;
  info_url: string | null;
  wiki_url: string | null;
  total_launch_count: number;
  consecutive_successful_launches: number;
  successful_launches: number;
  failed_launches: number;
  pending_launches: number;
  attempted_landings: number;
  successful_landings: number;
  failed_landings: number;
  consecutive_successful_landings: number;
  manufacturer: LL2Agency | null;
  program: LL2Program[];

}

export interface LL2Launcher {

  id: number;
  url: string;
  details: string | null;
  flight_proven: boolean;
  serial_number: string | null;
  status: string | null;
  image_url: string | null;
  successful_landings: number;
  attempted_landings: number;
  flights: number | null;
  last_launch_date: string | null;
  first_launch_date: string | null;

}

export interface LL2LandingLocation {

  id: number;
  name: string;
  abbrev: string;
  description: string | null;
  successful_landings: number;
  location: {
    id: number;
    name: string;
    country_code: string;
    timezone_name: string;
  } | null;

}

export interface LL2LandingType {

  id: number;
  name: string;
  abbrev: string;
  description: string;

}

export interface LL2Landing {

  id: number;
  attempt: boolean;
  success: boolean | null;
  description: string | null;
  downrange_distance: number | null;
  location: LL2LandingLocation | null;
  type: LL2LandingType | null;

}

export interface LL2LauncherStage {

  id: number;
  type: string;
  reused: boolean | null;
  launcher_flight_number: number | null;
  previous_flight_date: string | null;
  turn_around_time_days: number | null;
  previous_flight: { id: string; name: string } | null;
  launcher: LL2Launcher | null;
  landing: LL2Landing | null;

}

export interface LL2Astronaut {

  id: number;
  url: string;
  name: string;
  type: string | null;
  in_space: boolean;
  time_in_space: string | null;
  status: LL2Status | null;
  agency: Pick<LL2Agency, "id" | "url" | "name" | "type" | "country_code"> | null;
  date_of_birth: string | null;
  date_of_death: string | null;
  nationality: string | null;
  twitter: string | null;
  instagram: string | null;
  bio: string | null;
  profile_image: string | null;
  wiki: string | null;
  last_flight: string | null;
  first_flight: string | null;

}

export interface LL2CrewMember {

  id: number;
  role: { id: number; role: string; priority: number };
  astronaut: LL2Astronaut;

}

export interface LL2SpacecraftConfig {

  id: number;
  url: string;
  name: string;
  type: { id: number; name: string } | null;
  agency: Pick<LL2Agency, "id" | "url" | "name" | "type">;
  in_use: boolean;
  capability: string | null;
  history: string | null;
  details: string | null;
  maiden_flight: string | null;
  height: number | null;
  diameter: number | null;
  human_rated: boolean | null;
  crew_capacity: number | null;
  payload_capacity: number | null;
  payload_return_capacity: number | null;
  flight_life: string | null;
  image_url: string | null;
  nation_url: string | null;
  wiki_link: string | null;
  info_link: string | null;

}

export interface LL2Spacecraft {

  url: string;
  name: string;
  serial_number: string | null;
  description: string | null;
  status: LL2Status | null;
  spacecraft_config: LL2SpacecraftConfig;

}

export interface LL2SpacecraftStage {

  id: number;
  url: string;
  mission_end: string | null;
  destination: string | null;
  launch_crew: LL2CrewMember[];
  onboard_crew: LL2CrewMember[];
  landing_crew: LL2CrewMember[];
  spacecraft: LL2Spacecraft | null;
  landing: LL2Landing | null;
  docking_events: unknown[];

}

export interface LL2Rocket {

  id: number;
  configuration: LL2RocketConfiguration;
  launcher_stage: LL2LauncherStage[];
  spacecraft_stage: LL2SpacecraftStage | null;

}

export interface LL2Mission {

  id: number;
  name: string;
  description: string | null;
  launch_designator: string | null;
  type: string | null;
  orbit: LL2Orbit | null;
  agencies: Pick<LL2Agency, "id" | "url" | "name" | "type" | "country_code" | "abbrev">[];
  info_urls: LL2InfoURL[];
  vid_urls: LL2VidURL[];

}

export interface LL2PadLocation {

  id: number;
  url: string;
  name: string;
  country_code: string;
  description: string | null;
  map_image: string | null;
  timezone_name: string;
  total_launch_count: number;
  total_landing_count: number;

}

export interface LL2Pad {

  id: number;
  url: string;
  agency_id: number | null;
  name: string;
  description: string | null;
  info_url: string | null;
  wiki_url: string | null;
  map_url: string | null;
  latitude: string | null;
  longitude: string | null;
  country_code: string | null;
  map_image: string | null;
  total_launch_count: number;
  orbital_launch_attempt_count: number;
  location: LL2PadLocation

}

export interface LL2Launch {

  id: string;
  url: string;
  slug: string;
  flightclub_url: string | null;
  r_spacex_api_id: string | null;
  name: string;
  status: LL2Status;
  last_updated: string;
  updates: LL2Update[];
  net: string;
  net_precision: LL2Status | null;
  window_end: string | null;
  window_start: string | null;
  probability: number | null;
  weather_concerns: string | null;
  holdreason: string | null;
  failreason: string | null;
  hashtag: string | null;
  launch_service_provider: LL2Agency;
  rocket: LL2Rocket;
  mission: LL2Mission | null;
  pad: LL2Pad;
  infoURLs: LL2InfoURL[];
  vidURLs: LL2VidURL[];
  webcast_live: boolean;
  timeline: LL2TimelineEvent[];
  image: string | null;
  infographic: string | null;
  program: LL2Program[];
  mission_patches: LL2MissionPatch[];
  pad_turnaround: string | null;
  orbital_launch_attempt_count: number | null;
  location_launch_attempt_count: number | null;
  pad_launch_attempt_count: number | null;
  agency_launch_attempt_count: number | null;
  orbital_launch_attempt_count_year: number | null;
  location_launch_attempt_count_year: number | null;
  pad_launch_attempt_count_year: number | null;
  agency_launch_attempt_count_year: number | null;
  type: string;

}

// Collector State  (saved to .collect_state.json on rate-limit)

export interface CollectState {

  output_file: string;
  endpoint: string;
  next_url: string;
  page: number;
  collected: number;
  timestamp: string;

}

// Output Format Types

export interface LaunchSite {

  name: string;
  location: string;
  country_code: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  map_url: string | null;
  total_pad_launches: number;
  total_location_launches: number;
  total_location_landings: number;

}

export interface GeneralInfo {

  launch_id: string;
  launch_name: string;
  slug: string;
  date_utc: string;
  launch_time_utc: string | null;
  window_start: string | null;
  window_end: string | null;
  net_precision: string | null;
  outcome: string;
  outcome_detail: string | null;
  hold_reason: string | null;
  weather_concerns: string | null;
  launch_site: LaunchSite;
  pad_turnaround_days: number | null;
  webcast_live: boolean;
  image_url: string | null;
  mission_patch_url: string | null;
  info_url: string | null;
  video_url: string | null;
  flightclub_url: string | null;
  program: string | null;
  program_type: string | null;
  hashtag: string | null;
  orbital_launch_count_all_time: number | null;
  orbital_launch_count_ytd: number | null;
  pad_launch_count_all_time: number | null;
  agency_launch_count_all_time: number | null;
  agency_launch_count_ytd: number | null;
  last_updated: string;

}

export interface VehicleInformation {

  vehicle_name: string;
  vehicle_full_name: string | null;
  vehicle_family: string | null;
  vehicle_variant: string | null;
  vehicle_alias: string | null;
  vehicle_active: boolean;
  launch_provider: string;
  provider_type: string | null;
  provider_country: string | null;
  provider_total_launches: number;
  provider_successful_launches: number;
  provider_failed_launches: number;
  provider_consecutive_successes: number;
  manufacturer: string;
  manufacturer_country: string | null;
  engine_type: string;
  propellants: string;
  reusable: boolean;
  min_stages: number | null;
  max_stages: number | null;
  length_m: number | null;
  diameter_m: number | null;
  launch_mass_t: number | null;
  leo_capacity_kg: number | null;
  gto_capacity_kg: number | null;
  total_thrust_kn: number | null;
  launch_cost_usd: string | null;
  vehicle_total_launches: number;
  vehicle_successful_launches: number;
  vehicle_failed_launches: number;
  vehicle_successful_landings: number;
  vehicle_attempted_landings: number;
  vehicle_consecutive_successes: number;
  maiden_flight_date: string | null;
  vehicle_wiki_url: string | null;

}

export interface CrewMemberRecord {

  name: string;
  role: string;
  nationality: string | null;
  date_of_birth: string | null;
  flights_count: number;
  time_in_space: string | null;
  agency: string | null;

}

export interface MissionInformation {

  mission_name: string | null;
  mission_type: string | null;
  mission_description: string | null;
  launch_designator: string | null;
  agency_type: string | null;
  orbit_name: string | null;
  orbit_abbreviation: string | null;
  destination: string | null;
  mission_end_date: string | null;
  crew_size: number;
  crew_members: CrewMemberRecord[];

}

export interface PayloadInformation {

  payload_name: string | null;
  payload_type: string | null;
  spacecraft_name: string | null;
  spacecraft_serial: string | null;
  spacecraft_human_rated: boolean | null;
  spacecraft_crew_capacity: number | null;
  spacecraft_payload_capacity_kg: number | null;
  spacecraft_height_m: number | null;
  spacecraft_diameter_m: number | null;
  payload_reused: boolean | null;

}

export interface OrbitSpecifics {

  orbit_name: string | null;
  orbit_abbreviation: string | null;
  perigee_km: null;
  apogee_km: null;
  inclination_deg: null;

}

export interface RecoveryInformation {

  booster_serial: string | null;
  booster_flight_number: number | null;
  reused: boolean | null;
  days_since_last_flight: number | null;
  previous_mission: string | null;
  recovery_attempted: boolean;
  recovery_success: boolean | null;
  recovery_type: string | null;
  recovery_vessel: string | null;
  recovery_vessel_landings: number | null;
  recovery_location: string | null;
  downrange_distance_km: number | null;
  booster_total_flights: number | null;
  booster_successful_landings: number;
  booster_attempted_landings: number;
  booster_status: string | null;

}

export interface LaunchRecord {

  "General Info": GeneralInfo;
  "Vehicle Information": VehicleInformation;
  "Mission Information": MissionInformation;
  "Payload Information": PayloadInformation;
  "Orbit Specifics": OrbitSpecifics;
  "Recovery Information": RecoveryInformation;

}

export type OutputData = Record<string, LaunchRecord>;
