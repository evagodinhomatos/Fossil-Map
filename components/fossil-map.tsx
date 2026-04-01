"use client";

import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  FossilRecord,
  FossilSite,
  MapBounds,
  MapMode,
  ThemeMode,
} from "@/lib/types";

type FossilMapProps = {
  sites: FossilSite[];
  allFilteredFossils: FossilRecord[];
  onBoundsChange: (bounds: MapBounds) => void;
  onSiteSelect: (site: FossilSite) => void;
  mapMode: MapMode;
  themeMode: ThemeMode;
};

const fallbackCenter: [number, number] = [20, 0];

function toBounds(map: L.Map): MapBounds {
  const bounds = map.getBounds();
  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  };
}

function MapViewport({
  allFilteredFossils,
  onBoundsChange,
}: Pick<FossilMapProps, "allFilteredFossils" | "onBoundsChange">) {
  const map = useMap();

  useMapEvents({
    moveend() {
      onBoundsChange(toBounds(map));
    },
    zoomend() {
      onBoundsChange(toBounds(map));
    },
  });

  useEffect(() => {
    if (allFilteredFossils.length === 0) {
      map.setView(fallbackCenter, 2);
      onBoundsChange(toBounds(map));
      return;
    }

    const bounds = L.latLngBounds(
      allFilteredFossils.map((fossil) => [fossil.lat, fossil.lng] as [number, number]),
    );
    map.fitBounds(bounds.pad(0.2), { maxZoom: 6 });
    map.invalidateSize();
    onBoundsChange(toBounds(map));
  }, [allFilteredFossils, map, onBoundsChange]);

  return null;
}

export function FossilMap({
  sites,
  allFilteredFossils,
  onBoundsChange,
  onSiteSelect,
  mapMode,
  themeMode,
}: FossilMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [mapKey] = useState(() => `fossil-map-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <MapContainer
      key={mapKey}
      center={fallbackCenter}
      zoom={2}
      minZoom={2}
      preferCanvas
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url={
          themeMode === "dark"
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        }
      />

      <MapViewport
        allFilteredFossils={allFilteredFossils}
        onBoundsChange={onBoundsChange}
      />

      {sites.map((site) => {
        const isHeatmap = mapMode === "heatmap";
        const siteStrength = Math.min(1, site.fossils.length / 18);
        const radius = isHeatmap
          ? Math.min(34, 12 + Math.sqrt(site.fossils.length) * 3)
          : Math.min(16, 5 + Math.log2(site.fossils.length));

        return (
          <CircleMarker
            key={site.id}
            center={[site.lat, site.lng]}
            radius={radius}
            eventHandlers={{
              click: () => onSiteSelect(site),
            }}
            pathOptions={{
              color: isHeatmap ? "#ffcf7d" : "#84411f",
              weight: isHeatmap ? 0 : 1,
              fillColor: isHeatmap
                ? `rgba(255, ${Math.round(150 - siteStrength * 80)}, 58, 1)`
                : "#c46f3a",
              fillOpacity: isHeatmap ? 0.18 + siteStrength * 0.35 : 0.75,
            }}
          />
        );
      })}
    </MapContainer>
  );
}
