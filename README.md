# Spaceflight Visualizer

A data collection and visualization project for spaceflight launches, powered by The Space Devs' Launch Library 2 (LL2) API.

## Data Source

**API:** Launch Library 2 (LL2) - [ll.thespacedevs.com/2.2.0](https://ll.thespacedevs.com/2.2.0)

The LL2 API provides comprehensive, real-time data about space launches, vehicles, agencies, and related missions. Data is collected and aggregated from multiple authoritative sources including space agencies, launch providers, and aerospace databases.

For practical use, this requires an API key (set via `LL2_API_KEY` environment variable). Rate limiting applies; without a key the collector includes automatic retry logic with exponential backoff.

## Data Structure

The collected data is stored in `spaceflight_data.json` as a nested object where each key represents a launch record (e.g., `Launch_0001`, `Launch_0002`, etc.). Each launch record contains six major categories of information:

### General Info

| Attribute | Type | Description |
|-----------|------|-------------|
| `launch_id` | string | Unique identifier for the launch (UUID) |
| `launch_name` | string | Human-readable name of the launch (vehicle \| mission) |
| `slug` | string | URL-friendly identifier for the launch |
| `date_utc` | string | Launch date in MM/DD/YYYY format (UTC) |
| `launch_time_utc` | string | Launch time in HH:MM:SS UTC format |
| `window_start` | string | Start of launch window in MM/DD/YYYY format |
| `window_end` | string | End of launch window in MM/DD/YYYY format |
| `net_precision` | string \| null | Precision level of NET (No Earlier Than) prediction |
| `outcome` | string | Launch outcome (e.g., "Success", "Failure", "Partial Failure") |
| `outcome_detail` | string \| null | Additional details about the launch outcome |
| `hold_reason` | string | Reason for launch holds, if any |
| `weather_concerns` | string \| null | Weather-related concerns affecting the launch |
| `launch_site.name` | string | Launch pad identifier |
| `launch_site.location` | string | Launch facility location and country |
| `launch_site.country_code` | string | ISO 3-letter country code |
| `launch_site.timezone` | string | Timezone of the launch site |
| `launch_site.latitude` | number \| null | Geographic latitude coordinate |
| `launch_site.longitude` | number \| null | Geographic longitude coordinate |
| `launch_site.map_url` | string \| null | Google Maps URL for the location |
| `launch_site.total_pad_launches` | number | Total launches from this specific pad |
| `launch_site.total_location_launches` | number | Total launches from this location/facility |
| `launch_site.total_location_landings` | number | Total landings at this location |
| `pad_turnaround_days` | number \| null | Days between successive launches at the same pad |
| `webcast_live` | boolean | Whether a live webcast is available |
| `image_url` | string \| null | URL to launch image/photo |
| `mission_patch_url` | string \| null | URL to mission patch image |
| `info_url` | string \| null | URL to additional information |
| `video_url` | string \| null | URL to video (typically YouTube) |
| `flightclub_url` | string \| null | URL to Flight Club tracking page |
| `program` | string \| null | Space program name (e.g., "Artemis", "Starlink") |
| `program_type` | string \| null | Type of program |
| `hashtag` | string \| null | Associated social media hashtag |
| `orbital_launch_count_all_time` | number \| null | All-time orbital launch count for this provider |
| `orbital_launch_count_ytd` | number \| null | Orbital launch count year-to-date for this provider |
| `pad_launch_count_all_time` | number \| null | All-time launch count for this specific pad |
| `agency_launch_count_all_time` | number \| null | All-time launch count for this agency |
| `agency_launch_count_ytd` | number \| null | Year-to-date launch count for this agency |
| `last_updated` | string | ISO 8601 timestamp of last data update |

### Vehicle Information

| Attribute | Type | Description |
|-----------|------|-------------|
| `vehicle_name` | string | Short name of the launch vehicle/rocket |
| `vehicle_full_name` | string \| null | Complete name of the launch vehicle |
| `vehicle_family` | string \| null | Rocket family designation (e.g., "Falcon", "Atlas", "Soyuz") |
| `vehicle_variant` | string \| null | Specific variant of the vehicle |
| `vehicle_alias` | string \| null | Alternative names for the vehicle |
| `vehicle_active` | boolean | Whether the vehicle is currently in active service |
| `launch_provider` | string | Organization providing the launch service |
| `provider_type` | string \| null | Type of provider (e.g., "Government", "Commercial") |
| `provider_country` | string \| null | ISO 3-letter country code of the provider |
| `provider_total_launches` | number | Total launch attempts by this provider |
| `provider_successful_launches` | number | Successful launches by this provider |
| `provider_failed_launches` | number | Failed launches by this provider |
| `provider_consecutive_successes` | number | Current streak of consecutive successful launches |
| `manufacturer` | string | Company that built/manufactured the rocket |
| `manufacturer_country` | string \| null | ISO 3-letter country code of manufacturer |
| `engine_type` | string | Engine model/designation (e.g., "Merlin", "RD-107") |
| `propellants` | string | Propellant combination used (e.g., "RP-1/LOX", "Methane/LOX") |
| `reusable` | boolean | Whether the vehicle/booster is reusable |
| `min_stages` | number \| null | Minimum number of stages |
| `max_stages` | number \| null | Maximum number of stages |
| `length_m` | number \| null | Vehicle length in meters |
| `diameter_m` | number \| null | Vehicle diameter in meters |
| `launch_mass_t` | number \| null | Launch mass in metric tons |
| `leo_capacity_kg` | number \| null | Low Earth Orbit payload capacity in kg |
| `gto_capacity_kg` | number \| null | Geostationary Transfer Orbit payload capacity in kg |
| `total_thrust_kn` | number \| null | Total thrust in kilonewtons |
| `launch_cost_usd` | string \| null | Estimated launch cost in USD |
| `vehicle_total_launches` | number | Total launches of this vehicle model |
| `vehicle_successful_launches` | number | Successful launches of this vehicle model |
| `vehicle_failed_launches` | number | Failed launches of this vehicle model |
| `vehicle_successful_landings` | number | Successful booster recoveries |
| `vehicle_attempted_landings` | number | Attempted booster recoveries |
| `vehicle_consecutive_successes` | number | Current consecutive success streak for this vehicle |
| `maiden_flight_date` | string \| null | Date of first flight in MM/DD/YYYY format |
| `vehicle_wiki_url` | string \| null | URL to Wikipedia or reference documentation |

### Mission Information

| Attribute | Type | Description |
|-----------|------|-------------|
| `mission_name` | string \| null | Name of the space mission |
| `mission_type` | string \| null | Type of mission (e.g., "ISS Resupply", "Reconnaissance", "Test Flight") |
| `mission_description` | string \| null | Detailed description of mission objectives |
| `launch_designator` | string \| null | Official launch designator code |
| `agency_type` | string \| null | Type of agency running the mission |
| `orbit_name` | string \| null | Target orbital regime (e.g., "Low Earth Orbit", "Geostationary") |
| `orbit_abbreviation` | string \| null | Orbital abbreviation (e.g., "LEO", "GEO", "Sun-Synchronous") |
| `destination` | string \| null | Mission destination or target |
| `mission_end_date` | string \| null | Expected or actual mission end date |
| `crew_size` | number | Number of crew members on the mission |
| `crew_members` | array | Array of crew member objects with properties: |
| `crew_members[].name` | string | Astronaut/cosmonaut name |
| `crew_members[].role` | string | Role on the mission (e.g., "Commander", "Pilot", "Mission Specialist") |
| `crew_members[].nationality` | string \| null | Astronaut's nationality |
| `crew_members[].date_of_birth` | string \| null | DOB in MM/DD/YYYY format |
| `crew_members[].flights_count` | number | Number of spaceflights for this astronaut |
| `crew_members[].time_in_space` | string \| null | Total time spent in space |
| `crew_members[].agency` | string \| null | Space agency affiliation |

### Payload Information

| Attribute | Type | Description |
|-----------|------|-------------|
| `payload_name` | string \| null | Name of the primary payload |
| `payload_type` | string \| null | Type of payload (e.g., "Satellite", "Spacecraft", "Cargo") |
| `spacecraft_name` | string \| null | Name of any crewed/uncrewed spacecraft |
| `spacecraft_serial` | string \| null | Serial number of the spacecraft |
| `spacecraft_human_rated` | boolean \| null | Whether the spacecraft is certified for human spaceflight |
| `spacecraft_crew_capacity` | number \| null | Maximum crew capacity |
| `spacecraft_payload_capacity_kg` | number \| null | Payload carrying capacity in kg |
| `spacecraft_height_m` | number \| null | Spacecraft height in meters |
| `spacecraft_diameter_m` | number \| null | Spacecraft diameter in meters |
| `payload_reused` | boolean \| null | Whether the payload has flown previously |

### Orbit Specifics

| Attribute | Type | Description |
|-----------|------|-------------|
| `orbit_name` | string \| null | Name of the target orbit |
| `orbit_abbreviation` | string \| null | Standard abbreviation for the orbit type |
| `perigee_km` | number \| null | Orbital perigee (closest point to Earth) in km |
| `apogee_km` | number \| null | Orbital apogee (farthest point from Earth) in km |
| `inclination_deg` | number \| null | Orbital inclination in degrees |

### Recovery Information

| Attribute | Type | Description |
|-----------|------|-------------|
| `booster_serial` | string \| null | Serial number of the booster stage |
| `booster_flight_number` | number \| null | Flight number for this booster |
| `reused` | boolean \| null | Whether this booster has been reused |
| `days_since_last_flight` | number \| null | Days elapsed since previous flight |
| `previous_mission` | string \| null | Name/identifier of the previous mission |
| `recovery_attempted` | boolean | Whether booster recovery was attempted |
| `recovery_success` | boolean \| null | Whether booster recovery was successful |
| `recovery_type` | string \| null | Method of recovery (e.g., "ASDS", "Parachute", "Net Capture") |
| `recovery_vessel` | string \| null | Name of recovery vessel (for drone ships: "ASDS") |
| `recovery_vessel_landings` | number \| null | Total landings achieved by this recovery vessel |
| `recovery_location` | string \| null | Geographic location of recovery |
| `downrange_distance_km` | number \| null | Distance of booster downrange in km |
| `booster_total_flights` | number \| null | Total number of flights for this booster |
| `booster_successful_landings` | number | Number of successful booster landings |
| `booster_attempted_landings` | number | Number of booster landing attempts |
| `booster_status` | string \| null | Current status of the booster |

## Running the Collector

```bash
cd parser

bun install # Install dependencies

bun run collect # Collect launches (default behavior)

bun run collect:full # OR collect with custom limit

bun run collect:recent # OR collect recent launches only
```
