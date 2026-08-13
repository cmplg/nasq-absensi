import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapViewProps {
  centerLat: number;
  centerLng: number;
  zoom?: number;
  radiusMeters?: number;
  taskTitle?: string;
  isInteractive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  userLat?: number;
  userLng?: number;
  isWithinRadius?: boolean;
  heightClass?: string;
}

export function MapView({
  centerLat,
  centerLng,
  zoom = 15,
  radiusMeters,
  taskTitle,
  isInteractive = false,
  onLocationSelect,
  userLat,
  userLng,
  isWithinRadius = true,
  heightClass = 'min-h-[220px]',
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Fix leaflet marker icon URLs
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom,
        zoomControl: true,
        dragging: isInteractive,
        touchZoom: isInteractive,
        scrollWheelZoom: isInteractive,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      if (isInteractive && onLocationSelect) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        });
      }
    } else {
      mapInstanceRef.current.setView([centerLat, centerLng], zoom);
    }

    const map = mapInstanceRef.current;

    // Primary task/office marker
    if (markerRef.current) {
      markerRef.current.setLatLng([centerLat, centerLng]);
    } else {
      markerRef.current = L.marker([centerLat, centerLng]).addTo(map);
    }

    if (taskTitle) {
      markerRef.current.bindPopup(`<b>${taskTitle}</b><br/>Pusat Titik Absen`).openPopup();
    }

    // Radius Circle
    const circleColor = isWithinRadius ? '#059669' : '#dc2626'; // Emerald 600 or Red 600
    const fillColor = isWithinRadius ? '#10b981' : '#ef4444'; // Emerald 500 or Red 500

    if (radiusMeters && radiusMeters > 0) {
      if (circleRef.current) {
        circleRef.current.setLatLng([centerLat, centerLng]);
        circleRef.current.setRadius(radiusMeters);
        circleRef.current.setStyle({
          color: circleColor,
          fillColor: fillColor,
          fillOpacity: isWithinRadius ? 0.18 : 0.28,
        });
      } else {
        circleRef.current = L.circle([centerLat, centerLng], {
          color: circleColor,
          fillColor: fillColor,
          fillOpacity: isWithinRadius ? 0.18 : 0.28,
          radius: radiusMeters,
          weight: 2,
        }).addTo(map);
      }
    } else if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }

    // User location marker
    if (userLat !== undefined && userLng !== undefined) {
      const userDotColor = isWithinRadius ? 'bg-blue-600 ring-blue-300/50' : 'bg-rose-600 ring-rose-300/50';
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `<div class="w-5 h-5 ${userDotColor} border-2 border-white rounded-full shadow-lg pulse-dot ring-4"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLat, userLng]);
        userMarkerRef.current.setIcon(userIcon);
      } else {
        userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon })
          .addTo(map)
          .bindPopup(`<b>Posisi Anda Sekarang</b><br/>${isWithinRadius ? '✅ Dalam Radius' : '⚠️ Di Luar Radius'}`);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
        userMarkerRef.current = null;
      }
    };
  }, [centerLat, centerLng, zoom, radiusMeters, taskTitle, isInteractive, userLat, userLng, isWithinRadius, onLocationSelect]);

  return (
    <div className={`relative w-full h-full ${heightClass} rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-100 shadow-inner`}>
      <div ref={mapContainerRef} className={`w-full h-full ${heightClass}`} />
      {isInteractive && (
        <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/80 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-lg shadow-md font-medium pointer-events-none">
          Klik pada peta untuk mengubah koordinat lokasi tugas
        </div>
      )}
    </div>
  );
}
