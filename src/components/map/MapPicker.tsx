'use client';

import { useState, useCallback, useRef } from 'react';
// @ts-ignore
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';

interface MapPickerProps {
  defaultLat?: number;
  defaultLng?: number;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}

export function MapPicker({ defaultLat = 21.028511, defaultLng = 105.804817, onChange, className = '' }: MapPickerProps) {
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    defaultLat && defaultLng ? { lat: defaultLat, lng: defaultLng } : null
  );

  const [viewState, setViewState] = useState({
    longitude: defaultLng || 105.804817,
    latitude: defaultLat || 21.028511,
    zoom: 13
  });

  const onMapClick = useCallback((evt: { lngLat: { lat: number; lng: number } }) => {
    const lat = evt.lngLat.lat;
    const lng = evt.lngLat.lng;
    setMarker({ lat, lng });
    onChange(lat, lng);
  }, [onChange]);

  return (
    <div className={`relative rounded-lg overflow-hidden border border-slate-200 ${className}`} style={{ height: '300px' }}>
      <Map
        {...viewState}
        onMove={(evt: { viewState: typeof viewState }) => setViewState(evt.viewState)}
        onClick={onMapClick}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiZHVjbWluaGRldjI4IiwiYSI6ImNsd3ZpM281czB6M3MybG14dHB0eHZvdGgifQ.R280oJt8g_j9XfKzGZQ4aQ'} // Fallback demo token
        cursor="crosshair"
      >
        <NavigationControl position="bottom-right" />
        {marker && (
          <Marker longitude={marker.lng} latitude={marker.lat} anchor="bottom">
            <MapPin className="w-8 h-8 text-rose-500 fill-white" />
          </Marker>
        )}
      </Map>
      <div className="absolute top-2 left-2 bg-white px-3 py-2 rounded-md shadow-sm text-sm font-medium text-slate-700 pointer-events-none">
        Click trên bản đồ để ghim vị trí
      </div>
    </div>
  );
}

