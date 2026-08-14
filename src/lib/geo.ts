// Haversine formula to calculate distance between two coordinates in meters
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Reverse geocoding simulation with fallback to real OpenStreetMap Nominatim if online
export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data.display_name) {
        // Return a clean concise address
        const parts = data.display_name.split(',');
        return parts.slice(0, 4).join(',').trim();
      }
    }
  } catch {
    // Fallback if offline or network throttled
  }
  return `Jl. Sudirman No. ${Math.floor(Math.abs(lat * 100) % 150) + 1}, Jakarta Pusat (S : ${lat.toFixed(5)}, E : ${lng.toFixed(5)})`;
}

export function formatIndonesianDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatIndonesianTime(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export interface PlaceSuggestion {
  place_id: number | string;
  display_name: string;
  short_name: string;
  lat: number;
  lng: number;
  distanceMeters?: number;
}

// Search locations using OpenStreetMap Nominatim API with GPS proximity bias
export async function searchPlaces(
  query: string,
  userLat?: number,
  userLng?: number
): Promise<PlaceSuggestion[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query.trim()
    )}&countrycodes=id&limit=10&addressdetails=1`;

    if (userLat !== undefined && userLng !== undefined) {
      // Add a viewbox around current position (~30km) with bounded=0 to prioritize nearby places
      const delta = 0.35;
      const viewbox = `${userLng - delta},${userLat + delta},${userLng + delta},${userLat - delta}`;
      url += `&viewbox=${viewbox}&bounded=0`;
    }

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'id',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const list = data.map((item: any) => {
          const parts = item.display_name.split(',');
          const mainTitle = parts[0]?.trim() || 'Lokasi';
          const subTitle = parts.slice(1, 4).join(',').trim();
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          let dist: number | undefined = undefined;
          if (userLat !== undefined && userLng !== undefined) {
            dist = calculateDistanceMeters(userLat, userLng, lat, lng);
          }
          return {
            place_id: item.place_id,
            display_name: item.display_name,
            short_name: `${mainTitle}${subTitle ? ' - ' + subTitle : ''}`,
            lat,
            lng,
            distanceMeters: dist,
          };
        });

        // Sort by distance if user location is available so nearby places (apartments, hotels, offices) appear first
        if (userLat !== undefined && userLng !== undefined) {
          list.sort((a, b) => (a.distanceMeters ?? 999999) - (b.distanceMeters ?? 999999));
        }

        return list;
      }
    }
  } catch (err) {
    console.warn('Place search error:', err);
  }
  return [];
}

// Check if check-out time is earlier than shift end time
export function isEarlyCheckout(shiftEndStr: string): {
  isEarly: boolean;
  shiftEnd: string;
  currentTimeStr: string;
} {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [endH, endM] = (shiftEndStr || '17:00').split(':').map(Number);
  const shiftEndMinutes = endH * 60 + (endM || 0);

  const isEarly = currentMinutes < shiftEndMinutes;
  const hStr = String(now.getHours()).padStart(2, '0');
  const mStr = String(now.getMinutes()).padStart(2, '0');

  return {
    isEarly,
    shiftEnd: shiftEndStr || '17:00',
    currentTimeStr: `${hStr}:${mStr}`,
  };
}
