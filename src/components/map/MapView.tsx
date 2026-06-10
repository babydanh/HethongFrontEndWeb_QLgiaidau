'use client';

import { useState } from 'react';
// @ts-ignore
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';

interface MapViewProps {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
  popupText?: string;
}

export function MapView({ lat, lng, zoom = 14, className = '', popupText }: MapViewProps) {
  const [viewState, setViewState] = useState({
    longitude: lng,
    latitude: lat,
    zoom: zoom
  });

  return (
    <div className={`relative rounded-lg overflow-hidden border border-slate-200 ${className}`} style={{ height: '300px' }}>
      <Map
        {...viewState}
        onMove={(evt: { viewState: typeof viewState }) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiZHVjbWluaGRldjI4IiwiYSI6ImNsd3ZpM281czB6M3MybG14dHB0eHZvdGgifQ.R280oJt8g_j9XfKzGZQ4aQ'}
        scrollZoom={false}
      >
        <NavigationControl position="bottom-right" />
        <Marker longitude={lng} latitude={lat} anchor="bottom">
          <div className="relative group cursor-pointer">
            <MapPin className="w-8 h-8 text-emerald-600 fill-white drop-shadow-md" />
            {popupText && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {popupText}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
              </div>
            )}
          </div>
        </Marker>
      </Map>
    </div>
  );
}
