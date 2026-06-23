"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { detectPostalKind, normalizeCanadian, regionFromCanadianPostal } from "@/lib/postal";

// Interactive location picker for signup + account screens.
//   • Leaflet via CDN (no npm install, no API key)
//   • OpenStreetMap tiles (free, attribution required)
//   • Nominatim reverse-geocoding (free, 1 req/sec rate limit — fine
//     at signup volumes)
//
// The picker is "soft" — users can also enter address/postal manually
// and the map updates from those values. The map is the verification
// surface ("yes, that pin is where I live") but not the only way in.

// Minimal Leaflet typings — avoids pulling in @types/leaflet as a
// dep just for the few methods we touch. The real Leaflet runtime is
// loaded from CDN at first use.
type LatLng = { lat: number; lng: number };
type LeafletMarker = {
  setLatLng(pos: [number, number]): void;
  getLatLng(): LatLng;
  on(event: string, handler: () => void): void;
  addTo(map: LeafletMap): LeafletMarker;
};
type LeafletMap = {
  setView(pos: [number, number], zoom: number): void;
  on(event: string, handler: (e: { latlng: LatLng }) => void): void;
};
type LeafletGlobal = {
  map(el: HTMLElement, options: { center: [number, number]; zoom: number; scrollWheelZoom: boolean }): LeafletMap;
  marker(pos: [number, number], options: { draggable: boolean }): LeafletMarker;
  tileLayer(url: string, options: { attribution: string; maxZoom: number }): { addTo(m: LeafletMap): void };
};
declare global {
  interface Window {
    L?: LeafletGlobal;
  }
}

const DEFAULT_CENTER: [number, number] = [43.6532, -79.3832]; // Toronto
const DEFAULT_ZOOM = 4;
const PINNED_ZOOM = 16;

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

export type LocationValue = {
  postalCode: string;
  city: string;
  region: string; // ISO 3166-2, e.g. "CA-ON"
  latitude: number | null;
  longitude: number | null;
};

const inputClass =
  "w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors";

export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // Inject Leaflet CSS once on mount (Next's <Script> handles the JS).
  useEffect(() => {
    if (document.querySelector(`link[href="${LEAFLET_CSS}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
  }, []);

  // Initialise the map once Leaflet script + DOM are ready.
  useEffect(() => {
    if (!scriptReady || !mapEl.current || !window.L) return;
    if (mapRef.current) return; // already initialised

    const L = window.L;
    const map = L.map(mapEl.current, {
      center: value.latitude && value.longitude ? [value.latitude, value.longitude] : DEFAULT_CENTER,
      zoom: value.latitude && value.longitude ? PINNED_ZOOM : DEFAULT_ZOOM,
      scrollWheelZoom: false, // less surprising inside a scrolling form
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (value.latitude && value.longitude) {
      markerRef.current = L.marker([value.latitude, value.longitude], { draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current!.getLatLng();
        reverseGeocode(ll.lat, ll.lng);
      });
    }

    map.on("click", (e) => {
      placePin(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    // Init runs once when the Leaflet script is ready. placePin/reverseGeocode
    // are stable component functions and value.* is read only for the initial
    // center; adding them would re-initialise the map on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady]);

  // When the parent's lat/lng changes (e.g. from address geocode),
  // move the pin to match.
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    if (value.latitude == null || value.longitude == null) return;
    const L = window.L;
    const pos: [number, number] = [value.latitude, value.longitude];
    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
    } else {
      markerRef.current = L.marker(pos, { draggable: true }).addTo(mapRef.current);
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current!.getLatLng();
        reverseGeocode(ll.lat, ll.lng);
      });
    }
    mapRef.current.setView(pos, PINNED_ZOOM);
    // Only react to external lat/lng changes; reverseGeocode is a stable
    // component function used inside the drag handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.latitude, value.longitude]);

  function placePin(lat: number, lng: number) {
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current!.getLatLng();
        reverseGeocode(ll.lat, ll.lng);
      });
    }
    reverseGeocode(lat, lng);
  }

  // Use OSM Nominatim (free, 1 req/sec). At signup volume this is fine;
  // for higher-volume surfaces we'd swap in a paid geocoder.
  async function reverseGeocode(lat: number, lng: number) {
    setReverseLoading(true);
    setHint(null);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("nominatim non-200");
      const data = await res.json();
      const a = data.address ?? {};
      const postcode: string = a.postcode ?? "";
      const city: string = a.city ?? a.town ?? a.village ?? a.suburb ?? "";
      const province: string = a.state ?? "";
      const country: string = a.country_code ? (a.country_code as string).toUpperCase() : "";
      const region = inferRegionCode(postcode, province, country);
      onChange({
        ...value,
        latitude: lat,
        longitude: lng,
        postalCode: postcode ? (detectPostalKind(postcode) === "ca" ? normalizeCanadian(postcode) : postcode) : value.postalCode,
        city: city || value.city,
        region: region || value.region,
      });
      setHint("Address detected from map. Edit any field if it's wrong.");
    } catch {
      onChange({ ...value, latitude: lat, longitude: lng });
      setHint("Couldn't auto-fill the address. Enter it below manually.");
    } finally {
      setReverseLoading(false);
    }
  }

  function updatePostal(raw: string) {
    const inferred = regionFromCanadianPostal(raw);
    onChange({
      ...value,
      postalCode: raw,
      region: inferred ?? value.region,
    });
  }

  return (
    <div className="space-y-3">
      <Script
        src={LEAFLET_JS}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div
          ref={mapEl}
          className="w-full bg-muted/40"
          style={{ height: "240px" }}
          aria-label="Location map — tap to drop a pin at your address"
        />
        <p className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border bg-muted/20">
          {reverseLoading
            ? "Looking up address…"
            : value.latitude
            ? "Pin placed. Drag to fine-tune, or edit fields below."
            : "Tap on the map to mark your location, or fill the fields below."}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block sm:col-span-1">
          <span className="block text-sm font-medium text-foreground mb-1.5">Postal code</span>
          <input
            type="text"
            value={value.postalCode}
            onChange={(e) => updatePostal(e.target.value)}
            placeholder="M5V 3A8"
            maxLength={10}
            autoCapitalize="characters"
            className={`${inputClass} font-mono uppercase`}
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="block text-sm font-medium text-foreground mb-1.5">City</span>
          <input
            type="text"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            placeholder="Toronto"
            maxLength={80}
            className={inputClass}
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="block text-sm font-medium text-foreground mb-1.5">Region</span>
          <select
            value={value.region}
            onChange={(e) => onChange({ ...value, region: e.target.value })}
            className={inputClass}
          >
            <option value="CA-ON">Ontario</option>
            <option value="CA-QC">Québec</option>
            <option value="CA-BC">British Columbia</option>
            <option value="CA-AB">Alberta</option>
            <option value="CA-MB">Manitoba</option>
            <option value="CA-SK">Saskatchewan</option>
            <option value="CA-NS">Nova Scotia</option>
            <option value="CA-NB">New Brunswick</option>
            <option value="CA-NL">Newfoundland &amp; Labrador</option>
            <option value="CA-PE">Prince Edward Island</option>
            <option value="CA-YT">Yukon</option>
            <option value="CA-NT">Northwest Territories</option>
            <option value="CA-NU">Nunavut</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
      </div>

      {hint && (
        <p className="text-xs text-muted-foreground" role="status">
          {hint}
        </p>
      )}
    </div>
  );
}

function inferRegionCode(postcode: string, province: string, country: string): string | null {
  if (postcode && detectPostalKind(postcode) === "ca") {
    const r = regionFromCanadianPostal(postcode);
    if (r) return r;
  }
  if (country === "CA") {
    const p = province.toLowerCase();
    if (p.includes("ontario")) return "CA-ON";
    if (p.includes("québec") || p.includes("quebec")) return "CA-QC";
    if (p.includes("british columbia")) return "CA-BC";
    if (p.includes("alberta")) return "CA-AB";
    if (p.includes("manitoba")) return "CA-MB";
    if (p.includes("saskatchewan")) return "CA-SK";
    if (p.includes("nova scotia")) return "CA-NS";
    if (p.includes("new brunswick")) return "CA-NB";
    if (p.includes("newfoundland")) return "CA-NL";
    if (p.includes("prince edward")) return "CA-PE";
    if (p.includes("yukon")) return "CA-YT";
    if (p.includes("northwest")) return "CA-NT";
    if (p.includes("nunavut")) return "CA-NU";
  }
  return null;
}
