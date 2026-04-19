# Spaceflight Visualizer

## Goal

Visualize spaceflight data in Tableau Desktop to explore launch history, mission success, vehicle performance, and orbital characteristics.

## Data Overview

`Spaceflight_Data.csv` contains comprehensive historical spaceflight mission records spanning from 1957 to present. The dataset includes 41 columns organized into the following categories:

### Launch Information (9 columns)

| Field | Description |
|-------|-------------|
| launch_tag | Unique mission identifier code |
| launch_date | Date of launch (YYYY-MM-DD format) |
| launch_success | Boolean flag indicating launch success |
| launch_site | Launch facility name/code |
| launch_pad | Specific launch pad designation |
| launch_lat | Latitude coordinate of launch site |
| launch_lon | Longitude coordinate of launch site |
| platform | Launch platform type (e.g., ground, sea, air) |
| flight_id | Flight/mission identifier |

### Vehicle Information (8 columns)

| Field | Description |
|-------|-------------|
| vehicle_name | Name of the launch vehicle |
| provider | Aerospace company or organization operating vehicle |
| vehicle_country | Country of vehicle origin/manufacture |
| engine_type | Engine model and specifications |
| propellant_1 | Primary propellant type (e.g., RP-1, LOX, solid fuel) |
| propellant_2 | Secondary propellant type (if applicable) |
| reusable_first_stage | Boolean flag for first-stage reusability |
| lv_state | Country state code for launch vehicle |

### Mission Information (6 columns)

| Field | Description |
|-------|-------------|
| mission_name | Primary mission designation |
| mission_type | Category of mission (e.g., commercial, government, experimental) |
| mission_description | Detailed description of mission objectives |
| ll2_mission_name | Alternative/secondary mission name designation |
| launch_agency | Government or private agency directing the launch |
| flight_id | Unique flight identification number |

### Payload Information (4 columns)

| Field | Description |
|-------|-------------|
| payload_name | Name of satellite or payload |
| sat_owner | Organization owning the payload/satellite |
| sat_state | Country where payload is registered |
| ll2_location | Alternative location designation |

### Orbital Parameters (5 columns)

| Field | Description |
|-------|-------------|
| orbit_class | Classification of orbital destination (e.g., LEO, GEO, escape) |
| orbit_name | Specific orbital designation or type |
| perigee_km | Closest point to Earth in orbit (kilometers) |
| apogee_km | Farthest point from Earth in orbit (kilometers) |
| inclination_deg | Angle of orbit relative to Earth's equator (degrees) |

### Booster Recovery Information (6 columns)

| Field | Description |
|-------|-------------|
| booster_serial | Unique identifier/serial number of booster |
| booster_flight_number | Number of times this booster has flown |
| booster_reused | Boolean flag indicating booster reuse |
| recovery_attempted | Boolean flag for recovery attempt |
| recovery_success | Boolean flag for successful recovery |
| recovery_type | Method of recovery (e.g., parachute, ocean, drone) |
| recovery_vessel | Ship or platform used in recovery operation |

### Data Quality Flags (3 columns)

| Field | Description |
|-------|-------------|
| has_orbital_params | Boolean flag indicating orbital parameter data availability |
| has_recovery_data | Boolean flag indicating recovery data availability |
| data_complete | Boolean flag indicating record completeness |

## Files

- `Spaceflight_Data.csv` - Complete spaceflight dataset with 41 columns
- `build_data.py` - Data processing/preparation script
- `README.md` - This file