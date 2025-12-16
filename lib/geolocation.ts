// IP Geolocation utility using free ip-api.com service

export interface GeoLocation {
  country: string;
  countryCode: string;
  city?: string;
  region?: string;
}

// Cache to avoid repeated API calls for same IP
const geoCache = new Map<string, GeoLocation>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const cacheTimestamps = new Map<string, number>();

/**
 * Get country information from IP address
 * Uses ip-api.com free service (no API key required)
 * Rate limit: 45 requests per minute
 */
export async function getCountryFromIP(
  ip: string,
): Promise<GeoLocation | null> {
  // Skip for localhost/private IPs
  if (
    !ip ||
    ip === "unknown" ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  ) {
    return { country: "Local", countryCode: "XX" };
  }

  // Check cache
  const cached = geoCache.get(ip);
  const cachedTime = cacheTimestamps.get(ip);

  if (cached && cachedTime && Date.now() - cachedTime < CACHE_TTL) {
    return cached;
  }

  try {
    // Use ip-api.com (free, no API key required)
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName`,
      { signal: AbortSignal.timeout(3000) },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status !== "success") {
      return null;
    }

    const geoInfo: GeoLocation = {
      country: data.country || "Unknown",
      countryCode: data.countryCode || "XX",
      city: data.city,
      region: data.regionName,
    };

    // Cache the result
    geoCache.set(ip, geoInfo);
    cacheTimestamps.set(ip, Date.now());

    return geoInfo;
  } catch {
    // Silently fail - geolocation is not critical
    return null;
  }
}

/**
 * Get country flag emoji from country code
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2 || countryCode === "XX") {
    return "";
  }

  // Convert country code to flag emoji
  // Each letter is converted to its regional indicator symbol
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

/**
 * Country code to name mapping for common countries
 */
export const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  SA: "Saudi Arabia",
  AE: "UAE",
  EG: "Egypt",
  PK: "Pakistan",
  IN: "India",
  BD: "Bangladesh",
  MY: "Malaysia",
  ID: "Indonesia",
  TR: "Turkey",
  NG: "Nigeria",
  ZA: "South Africa",
  KE: "Kenya",
  MA: "Morocco",
  TN: "Tunisia",
  DZ: "Algeria",
  JO: "Jordan",
  KW: "Kuwait",
  QA: "Qatar",
  BH: "Bahrain",
  OM: "Oman",
  YE: "Yemen",
  IQ: "Iraq",
  SY: "Syria",
  LB: "Lebanon",
  PS: "Palestine",
  XX: "Unknown",
};
