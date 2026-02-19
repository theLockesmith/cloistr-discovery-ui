// Country centroid coordinates [latitude, longitude]
// Used for positioning relay markers on the map

export const countryCentroids: Record<string, [number, number]> = {
  // North America
  US: [39.8283, -98.5795],
  CA: [56.1304, -106.3468],
  MX: [23.6345, -102.5528],

  // South America
  BR: [-14.2350, -51.9253],
  AR: [-38.4161, -63.6167],
  CL: [-35.6751, -71.5430],
  CO: [4.5709, -74.2973],
  VE: [6.4238, -66.5897],
  PE: [-9.1900, -75.0152],

  // Europe
  DE: [51.1657, 10.4515],
  FR: [46.2276, 2.2137],
  GB: [55.3781, -3.4360],
  UK: [55.3781, -3.4360], // Alias
  NL: [52.1326, 5.2913],
  BE: [50.5039, 4.4699],
  CH: [46.8182, 8.2275],
  AT: [47.5162, 14.5501],
  IT: [41.8719, 12.5674],
  ES: [40.4637, -3.7492],
  PT: [39.3999, -8.2245],
  PL: [51.9194, 19.1451],
  CZ: [49.8175, 15.4730],
  SE: [60.1282, 18.6435],
  NO: [60.4720, 8.4689],
  DK: [56.2639, 9.5018],
  FI: [61.9241, 25.7482],
  IE: [53.1424, -7.6921],
  RO: [45.9432, 24.9668],
  HU: [47.1625, 19.5033],
  GR: [39.0742, 21.8243],
  UA: [48.3794, 31.1656],
  RU: [61.5240, 105.3188],

  // Asia
  JP: [36.2048, 138.2529],
  CN: [35.8617, 104.1954],
  KR: [35.9078, 127.7669],
  TW: [23.6978, 120.9605],
  HK: [22.3193, 114.1694],
  SG: [1.3521, 103.8198],
  MY: [4.2105, 101.9758],
  TH: [15.8700, 100.9925],
  VN: [14.0583, 108.2772],
  PH: [12.8797, 121.7740],
  ID: [-0.7893, 113.9213],
  IN: [20.5937, 78.9629],
  PK: [30.3753, 69.3451],

  // Middle East
  IL: [31.0461, 34.8516],
  AE: [23.4241, 53.8478],
  TR: [38.9637, 35.2433],
  SA: [23.8859, 45.0792],

  // Africa
  ZA: [-30.5595, 22.9375],
  NG: [9.0820, 8.6753],
  EG: [26.8206, 30.8025],
  KE: [-0.0236, 37.9062],
  MA: [31.7917, -7.0926],

  // Oceania
  AU: [-25.2744, 133.7751],
  NZ: [-40.9006, 174.8860],

  // Unknown/default
  XX: [0, 0],
};

// Get coordinates for a country code, with fallback
export function getCountryCoordinates(code: string | undefined): [number, number] | null {
  if (!code) return null;
  const upperCode = code.toUpperCase();
  return countryCentroids[upperCode] || null;
}

// Get country name from code (basic mapping)
export const countryNames: Record<string, string> = {
  US: 'United States',
  CA: 'Canada',
  MX: 'Mexico',
  BR: 'Brazil',
  AR: 'Argentina',
  DE: 'Germany',
  FR: 'France',
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  NL: 'Netherlands',
  CH: 'Switzerland',
  AT: 'Austria',
  IT: 'Italy',
  ES: 'Spain',
  PT: 'Portugal',
  PL: 'Poland',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  IE: 'Ireland',
  RU: 'Russia',
  UA: 'Ukraine',
  JP: 'Japan',
  CN: 'China',
  KR: 'South Korea',
  TW: 'Taiwan',
  HK: 'Hong Kong',
  SG: 'Singapore',
  AU: 'Australia',
  NZ: 'New Zealand',
  IN: 'India',
  IL: 'Israel',
  AE: 'UAE',
  TR: 'Turkey',
  ZA: 'South Africa',
};

export function getCountryName(code: string | undefined): string {
  if (!code) return 'Unknown';
  const upperCode = code.toUpperCase();
  return countryNames[upperCode] || code;
}
