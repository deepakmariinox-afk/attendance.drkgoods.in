import { GpsCoordinates, WorkLocation } from '../types';

/**
 * Calculates great-circle distance between two points in meters using the Haversine formula
 */
export function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Checks if current GPS point is within the work location's radius
 */
export function verifyGeofence(
  currentPos: { latitude: number; longitude: number },
  location: WorkLocation
): { isInside: boolean; distanceMeters: number; allowedRadius: number } {
  const distance = calculateDistanceInMeters(
    currentPos.latitude,
    currentPos.longitude,
    location.latitude,
    location.longitude
  );

  return {
    isInside: distance <= location.radiusMeters,
    distanceMeters: distance,
    allowedRadius: location.radiusMeters,
  };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}

/**
 * Generates a jittered coordinate within specified radius (for testing / simulation)
 */
export function getRandomPointWithinRadius(
  centerLat: number,
  centerLon: number,
  radiusMeters: number
): { latitude: number; longitude: number } {
  const r = Math.sqrt(Math.random()) * (radiusMeters * 0.7); // safely within
  const theta = Math.random() * 2 * Math.PI;

  const dy = r * Math.cos(theta);
  const dx = r * Math.sin(theta);

  const deltaLat = dy / 111111;
  const deltaLon = dx / (111111 * Math.cos((centerLat * Math.PI) / 180));

  return {
    latitude: Number((centerLat + deltaLat).toFixed(6)),
    longitude: Number((centerLon + deltaLon).toFixed(6)),
  };
}

/**
 * Generates an out-of-bounds coordinate for testing geofence validation
 */
/**
 * Generates an out-of-bounds coordinate for testing geofence validation
 */
export function getPointOutOfBounds(
  centerLat: number,
  centerLon: number,
  radiusMeters: number
): { latitude: number; longitude: number } {
  const r = radiusMeters + 350 + Math.random() * 200; // 350-550m outside
  const theta = Math.random() * 2 * Math.PI;

  const dy = r * Math.cos(theta);
  const dx = r * Math.sin(theta);

  const deltaLat = dy / 111111;
  const deltaLon = dx / (111111 * Math.cos((centerLat * Math.PI) / 180));

  return {
    latitude: Number((centerLat + deltaLat).toFixed(6)),
    longitude: Number((centerLon + deltaLon).toFixed(6)),
  };
}

const addressCache = new Map<string, string>();

/**
 * Reverse geocodes coordinates to a human-readable street address or landmark.
 * Uses OpenStreetMap Nominatim with graceful fallback and memory caching.
 */
export async function reverseGeocodeCoords(
  latitude: number,
  longitude: number
): Promise<string> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  if (addressCache.has(cacheKey)) {
    return addressCache.get(cacheKey)!;
  }

  // Pre-mapped landmarks for known office perimeters
  if (
    Math.abs(latitude - 28.5355) < 0.005 &&
    Math.abs(longitude - 77.2638) < 0.005
  ) {
    const addr = 'Plot 42, Okhla Industrial Area Phase III, New Delhi 110020, India';
    addressCache.set(cacheKey, addr);
    return addr;
  }

  if (
    Math.abs(latitude - 28.6289) < 0.005 &&
    Math.abs(longitude - 77.2065) < 0.005
  ) {
    const addr = 'Barakhamba Road, Connaught Place, New Delhi 110001, India';
    addressCache.set(cacheKey, addr);
    return addr;
  }

  if (
    Math.abs(latitude - 28.4986) < 0.005 &&
    Math.abs(longitude - 77.0878) < 0.005
  ) {
    const addr = 'DLF Phase 2, Cyber City, Gurugram, Haryana 122002, India';
    addressCache.set(cacheKey, addr);
    return addr;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'DRKGoods-AttendanceTracker/1.0',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        // Clean and shorten display name for clean UI
        const parts = data.display_name.split(',').map((p: string) => p.trim());
        const shortened = parts.slice(0, 4).join(', ');
        addressCache.set(cacheKey, shortened);
        return shortened;
      }
    }
  } catch {
    // Network or CORS fallback
  }

  // Graceful fallback format
  const fallback = `Coordinates (${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°)`;
  addressCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Returns a direct Google Maps view link for any coordinate
 */
export function getGoogleMapsUrl(latitude: number, longitude: number, label?: string): string {
  if (label) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/**
 * Returns an OpenStreetMap embed URL for iframe mini-maps
 */
export function getOpenStreetMapEmbedUrl(latitude: number, longitude: number, zoomDelta = 0.004): string {
  const minLon = longitude - zoomDelta;
  const minLat = latitude - zoomDelta;
  const maxLon = longitude + zoomDelta;
  const maxLat = latitude + zoomDelta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

/**
 * Formats lat/lng to readable geographic string (e.g. 28.535517° N, 77.263842° E)
 */
export function formatCoordinates(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(6)}° ${latDir}, ${Math.abs(longitude).toFixed(6)}° ${lonDir}`;
}
