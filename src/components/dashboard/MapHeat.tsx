import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngExpression } from 'leaflet';
import React from 'react';
import { Hotspot } from '@/types/Post';

interface MapHeatProps {
  hotspots: Hotspot[];
}

export default function MapHeat({ hotspots }: MapHeatProps) {
  const malaysiaCenter: LatLngExpression = [4.2105, 101.9758];
  return (
    <div className="relative rounded-lg overflow-hidden shadow-lg bg-card">
      <MapContainer center={malaysiaCenter} zoom={6} className="h-[380px] w-full" scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {hotspots.map((h) => {
          const intensity = Math.min(28, Math.max(8, Math.round(h.intensity * 3)));
          const color = h.intensity > 10 ? 'hsl(var(--destructive))' : h.intensity > 5 ? 'hsl(var(--warning))' : 'hsl(var(--accent))';
          const fillOpacity = Math.min(0.85, 0.3 + h.intensity / 25);
          const center: LatLngExpression = [h.location.lat, h.location.lng];
          const radiusM = 800 * intensity; // meters
          return (
            <Circle
              key={h.key}
              center={center}
              radius={radiusM}
              pathOptions={{ color, fillColor: color, fillOpacity }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{h.location.name ?? 'Hotspot'}</p>
                  <p className="text-muted-foreground">Signal: {h.intensity.toFixed(1)}</p>
                  <ul className="mt-2 space-y-1 max-h-40 overflow-auto pr-1">
                    {h.posts.slice(-5).map((p) => (
                      <li key={p.id}>• {p.text}</li>
                    ))}
                  </ul>
                </div>
              </Popup>
            </Circle>
          );
        })}
      </MapContainer>
    </div>
  );
}
