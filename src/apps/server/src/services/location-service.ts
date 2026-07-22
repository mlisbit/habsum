import type { LocationOption, LocationTypeaheadResponse } from '@habsum/types/common/location';

const LOCATIONS: readonly LocationOption[] = [
  { id: 'us-fl-tampa', name: 'Tampa, FL, USA' },
  { id: 'ca-on-toronto', name: 'Toronto, ON, Canada' },
  { id: 'us-ca-san-francisco', name: 'San Francisco, CA, USA' },
  { id: 'us-ny-new-york', name: 'New York, NY, USA' },
  { id: 'us-ca-los-angeles', name: 'Los Angeles, CA, USA' },
  { id: 'us-il-chicago', name: 'Chicago, IL, USA' },
  { id: 'us-tx-houston', name: 'Houston, TX, USA' },
  { id: 'us-az-phoenix', name: 'Phoenix, AZ, USA' },
  { id: 'us-pa-philadelphia', name: 'Philadelphia, PA, USA' },
  { id: 'us-tx-san-antonio', name: 'San Antonio, TX, USA' },
  { id: 'us-ca-san-diego', name: 'San Diego, CA, USA' },
  { id: 'us-tx-dallas', name: 'Dallas, TX, USA' },
  { id: 'us-tx-austin', name: 'Austin, TX, USA' },
  { id: 'us-fl-miami', name: 'Miami, FL, USA' },
  { id: 'us-wa-seattle', name: 'Seattle, WA, USA' },
  { id: 'us-ma-boston', name: 'Boston, MA, USA' },
  { id: 'us-co-denver', name: 'Denver, CO, USA' },
  { id: 'ca-bc-vancouver', name: 'Vancouver, BC, Canada' },
  { id: 'ca-qc-montreal', name: 'Montreal, QC, Canada' },
  { id: 'ca-ab-calgary', name: 'Calgary, AB, Canada' },
  { id: 'ca-on-ottawa', name: 'Ottawa, ON, Canada' },
  { id: 'ca-ab-edmonton', name: 'Edmonton, AB, Canada' },
  { id: 'ca-qc-quebec-city', name: 'Quebec City, QC, Canada' },
  { id: 'ca-mb-winnipeg', name: 'Winnipeg, MB, Canada' },
  { id: 'ca-ns-halifax', name: 'Halifax, NS, Canada' },
];

const MAX_RESULTS = 10;

function normalizeSearchTerm(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

export class LocationService {
  /**
   * Searches the built-in location list. This deliberately remains asynchronous so callers can
   * switch to a remote data source later without changing the component contract.
   */
  async locationTypeahead(query = ''): Promise<LocationTypeaheadResponse> {
    const normalizedQuery = normalizeSearchTerm(query);
    return LOCATIONS.filter(
      (location) =>
        normalizedQuery === '' || normalizeSearchTerm(location.name).includes(normalizedQuery),
    ).slice(0, MAX_RESULTS);
  }

  getLocation(id: string): LocationOption | null {
    return LOCATIONS.find((location) => location.id === id) ?? null;
  }
}
