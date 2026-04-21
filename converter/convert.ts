import * as fs from 'fs';

// Type definitions
interface LaunchDataSection {
  [key: string]: any;
}

interface Launch {
  [sectionName: string]: LaunchDataSection;
}

interface SpaceflightData {
  [launchId: string]: Launch;
}

interface FlattenedRow {
  [columnName: string]: string | number | boolean | null;
}

/**
 * Convert snake_case to Title Case
 * Example: "agency_launch_count_all_time" -> "Agency Launch Count All Time"
 */
function toTitleCase(str: string): string {
  return str
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Recursively flatten nested objects, using only leaf keys converted to title case
 * Skips category/section names, only keeps the actual data keys
 */
function flattenObject(obj: any): Record<string, any> {
  const flattened: Record<string, any> = {};

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    const value = obj[key];
    const titleCaseKey = toTitleCase(key);

    if (value === null || value === undefined) {
      flattened[titleCaseKey] = value;
    } else if (Array.isArray(value)) {
      // Convert arrays to JSON string
      flattened[titleCaseKey] = JSON.stringify(value);
    } else if (typeof value === 'object') {
      // Recursively flatten nested objects without adding parent key
      Object.assign(flattened, flattenObject(value));
    } else {
      flattened[titleCaseKey] = value;
    }
  }

  return flattened;
}

/**
 * Escape CSV field values according to RFC 4180
 */
function escapeCSVField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If field contains comma, newline, or quote, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert spaceflight JSON to CSV
 */
function convertJSONtoCSV(inputFile: string, outputFile: string): void {
  console.log(`Reading ${inputFile}...`);
  const jsonContent = fs.readFileSync(inputFile, 'utf-8');

  console.log('Parsing JSON...');
  const data: SpaceflightData = JSON.parse(jsonContent);

  console.log('Processing launches...');
  const allHeaders = new Set<string>();
  const rows: FlattenedRow[] = [];

  // Process each launch
  for (const launchId in data) {
    if (!Object.prototype.hasOwnProperty.call(data, launchId)) continue;

    const launch = data[launchId];
    const flattened = flattenObject(launch);

    // Add the launch ID as the first field
    flattened['ID'] = launchId;

    // Collect all unique headers
    for (const header in flattened) {
      if (Object.prototype.hasOwnProperty.call(flattened, header)) {
        allHeaders.add(header);
      }
    }

    rows.push(flattened);
  }

  console.log(`Processed ${rows.length} launches`);

  // Sort headers with 'ID' first, then alphabetically
  const sortedHeaders = Array.from(allHeaders).sort((a, b) => {
    if (a === 'ID') return -1;
    if (b === 'ID') return 1;
    return a.localeCompare(b);
  });

  console.log(`Writing CSV with ${sortedHeaders.length} columns...`);

  // Build CSV content
  let csvContent = sortedHeaders.map(escapeCSVField).join(',') + '\n';

  for (const row of rows) {
    const values = sortedHeaders.map((header) => escapeCSVField(row[header]));
    csvContent += values.join(',') + '\n';
  }

  // Write to file
  fs.writeFileSync(outputFile, csvContent, 'utf-8');

  console.log(`\nConversion complete!`);
  console.log(`  Total launches: ${rows.length}`);
  console.log(`  Total columns: ${sortedHeaders.length}`);
  console.log(`  Output file: ${outputFile}`);
}

// Main execution
const inputFile = '../spaceflight_data.json';
const outputFile = '../spaceflight_data.csv';

try {
  convertJSONtoCSV(inputFile, outputFile);
} catch (error) {
  console.error('Error during conversion:', error);
  process.exit(1);
}
