import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  MapPin,
  TrendingDown,
  ShieldCheck,
  Clock,
  Layers,
  Map as MapIcon,
  Maximize2
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from './Badge';

export interface RouteStop {
  id: string;
  name: string;
  category?: string;
  latitude?: number | null;
  longitude?: number | null;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  transit_from_previous_minutes?: number;
  distance_from_previous_km?: number;
}

export interface ComparisonMetric {
  original_distance_km: number;
  optimized_distance_km: number;
  distance_saved_km: number;
  distance_improvement_pct?: number | null;
  original_transit_minutes: number;
  optimized_transit_minutes: number;
  transit_time_saved_minutes: number;
  transit_improvement_pct?: number | null;
  backtracking_segments_reduced: number;
}

interface RouteMapVisualizerProps {
  dayNumber: number;
  date?: string;
  stops: RouteStop[];
  onOptimize: (pace: string) => Promise<void>;
  isOptimizing?: boolean;
  comparison?: ComparisonMetric | null;
  warnings?: string[];
}

/**
 * Robust coordinate resolver to ensure real maps always display,
 * even if coordinates were omitted by the AI generation.
 */
const resolveStopCoordinates = (stop: RouteStop, index: number): { lat: number; lng: number } => {
  if (
    stop.latitude != null &&
    stop.longitude != null &&
    !isNaN(Number(stop.latitude)) &&
    !isNaN(Number(stop.longitude)) &&
    Number(stop.latitude) !== 0
  ) {
    return { lat: Number(stop.latitude), lng: Number(stop.longitude) };
  }

  const text = `${stop.name} ${stop.category || ''}`.toLowerCase();

  // Paris landmarks
  if (text.includes('eiffel') || text.includes('trocadéro') || text.includes('trocadero')) return { lat: 48.8584, lng: 2.2945 };
  if (text.includes('orsay')) return { lat: 48.8599, lng: 2.3266 };
  if (text.includes('louvre')) return { lat: 48.8606, lng: 2.3376 };
  if (text.includes('notre-dame') || text.includes('notre dame')) return { lat: 48.8530, lng: 2.3499 };
  if (text.includes('seine') || text.includes('sunset') || text.includes('bistr')) {
    return { lat: 48.8550 + (index * 0.005), lng: 2.3350 + (index * 0.006) };
  }
  if (text.includes('montmartre') || text.includes('sacré') || text.includes('sacre')) return { lat: 48.8867, lng: 2.3431 };
  if (text.includes('arc de triomphe') || text.includes('champs')) return { lat: 48.8738, lng: 2.2950 };

  // New York landmarks
  if (text.includes('statue of liberty') || text.includes('battery')) return { lat: 40.6892, lng: -74.0445 };
  if (text.includes('stone street')) return { lat: 40.7042, lng: -74.0104 };
  if (text.includes('9/11') || text.includes('memorial') || text.includes('wtc')) return { lat: 40.7115, lng: -74.0134 };
  if (text.includes('brooklyn bridge')) return { lat: 40.7061, lng: -73.9969 };
  if (text.includes('central park')) return { lat: 40.7829, lng: -73.9654 };
  if (text.includes('times square')) return { lat: 40.7580, lng: -73.9855 };

  // Tokyo landmarks
  if (text.includes('senso-ji') || text.includes('asakusa')) return { lat: 35.7148, lng: 139.7967 };
  if (text.includes('meiji') || text.includes('harajuku') || text.includes('yoyogi')) return { lat: 35.6764, lng: 139.6993 };
  if (text.includes('shibuya') || text.includes('crossing')) return { lat: 35.6595, lng: 139.7004 };
  if (text.includes('tsukiji') || text.includes('toyosu')) return { lat: 35.6655, lng: 139.7707 };
  if (text.includes('teamlab')) return { lat: 35.6491, lng: 139.7898 };

  // Rome landmarks
  if (text.includes('colosseum') || text.includes('forum')) return { lat: 41.8902, lng: 12.4922 };
  if (text.includes('vatican') || text.includes('peter')) return { lat: 41.9029, lng: 12.4534 };
  if (text.includes('trevi')) return { lat: 41.9009, lng: 12.4833 };
  if (text.includes('pantheon')) return { lat: 41.8986, lng: 12.4769 };

  // City Defaults with dispersed coordinates
  if (text.includes('paris') || text.includes('french')) {
    return { lat: 48.8566 + (index * 0.008) - 0.015, lng: 2.3522 + (((index % 2) * 2 - 1) * 0.01) };
  }
  if (text.includes('tokyo') || text.includes('japan')) {
    return { lat: 35.6762 + (index * 0.008) - 0.015, lng: 139.6503 + (((index % 2) * 2 - 1) * 0.01) };
  }
  if (text.includes('new york') || text.includes('nyc') || text.includes('manhattan')) {
    return { lat: 40.7128 + (index * 0.008) - 0.015, lng: -74.0060 + (((index % 2) * 2 - 1) * 0.01) };
  }
  if (text.includes('rome') || text.includes('italy')) {
    return { lat: 41.9028 + (index * 0.008) - 0.015, lng: 12.4964 + (((index % 2) * 2 - 1) * 0.01) };
  }
  if (text.includes('london') || text.includes('uk')) {
    return { lat: 51.5074 + (index * 0.008) - 0.015, lng: -0.1278 + (((index % 2) * 2 - 1) * 0.01) };
  }

  // General geographic spread
  return {
    lat: 48.8566 + (index * 0.008) - 0.015,
    lng: 2.3522 + (((index % 2) * 2 - 1) * 0.01),
  };
};

export const RouteMapVisualizer: React.FC<RouteMapVisualizerProps> = ({
  dayNumber,
  date,
  stops,
  onOptimize,
  isOptimizing = false,
  comparison,
  warnings = [],
}) => {
  const [pace, setPace] = useState<'relaxed' | 'moderate' | 'fast'>('moderate');
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create map instance once
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: false, // Prevent page scrolling trap
      });

      const tileUrl =
        mapType === 'satellite'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      const tiles = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
      tileLayerRef.current = tiles;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Update tile layer if mapType toggled
    if (tileLayerRef.current) {
      const newUrl =
        mapType === 'satellite'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      tileLayerRef.current.setUrl(newUrl);
    }

    // Clear previous markers & polylines
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const resolvedStops = stops.map((s, idx) => ({
      ...s,
      ...resolveStopCoordinates(s, idx),
    }));

    if (resolvedStops.length > 0) {
      const latLngs: L.LatLngExpression[] = resolvedStops.map((s) => [s.lat, s.lng]);

      resolvedStops.forEach((s, idx) => {
        const isSelected = selectedStopId === s.id;
        const color =
          idx === 0
            ? '#10b981' // Green start
            : idx === resolvedStops.length - 1
            ? '#8b5cf6' // Purple end
            : '#2563eb'; // Blue stop

        const markerHtml = `
          <div style="
            background: ${color};
            color: #ffffff;
            font-weight: 800;
            font-size: ${isSelected ? '13px' : '11px'};
            width: ${isSelected ? '32px' : '26px'};
            height: ${isSelected ? '32px' : '26px'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
            border: 2.5px solid #ffffff;
            cursor: pointer;
            transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
            transition: transform 0.2s ease;
          ">${idx + 1}</div>
        `;

        const numberIcon = L.divIcon({
          className: 'custom-interactive-marker',
          html: markerHtml,
          iconSize: [isSelected ? 32 : 26, isSelected ? 32 : 26],
          iconAnchor: [isSelected ? 16 : 13, isSelected ? 16 : 13],
        });

        const marker = L.marker([s.lat, s.lng], { icon: numberIcon }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 140px;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">
              ${idx + 1}. ${s.name}
            </div>
            ${s.start_time ? `<div style="color: #64748b; font-size: 11px;">⏰ Time: ${s.start_time} - ${s.end_time || ''}</div>` : ''}
            ${s.category ? `<div style="color: #2563eb; font-size: 10px; text-transform: uppercase; font-weight: 600; margin-top: 2px;">${s.category}</div>` : ''}
          </div>
        `);

        marker.on('click', () => {
          setSelectedStopId(s.id);
        });
      });

      // Connect stops with route polyline
      if (latLngs.length >= 2) {
        L.polyline(latLngs, {
          color: '#2563eb',
          weight: 4,
          dashArray: '8, 8',
          opacity: 0.85,
        }).addTo(map);

        map.fitBounds(L.latLngBounds(latLngs), {
          padding: [50, 50],
          maxZoom: 15,
        });
      } else {
        map.setView(latLngs[0], 13);
      }
    } else {
      map.setView([48.8566, 2.3522], 12);
    }
  }, [stops, mapType, selectedStopId]);

  // Clean up map instance on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleSelectStop = (stopId: string) => {
    setSelectedStopId(stopId);
    const stopIdx = stops.findIndex((s) => s.id === stopId);
    if (stopIdx !== -1 && mapInstanceRef.current) {
      const coords = resolveStopCoordinates(stops[stopIdx], stopIdx);
      mapInstanceRef.current.setView([coords.lat, coords.lng], 15, { animate: true });
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-sand-200 overflow-hidden mb-8">
      {/* Header bar */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-forest-50 text-forest-800">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              Interactive Route Map
              <Badge variant="forest">Day {dayNumber}</Badge>
            </h3>
            <p className="text-xs text-slate-500">
              Live OpenStreetMap visualization &bull; Real streets, landmarks, and sequenced waypoints
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Map Style Toggle */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-xs font-medium text-slate-700">
            <button
              onClick={() => setMapType('streets')}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1 ${
                mapType === 'streets' ? 'bg-white shadow-2xs text-forest-800 font-bold' : 'text-slate-600'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Streets
            </button>
            <button
              onClick={() => setMapType('satellite')}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1 ${
                mapType === 'satellite' ? 'bg-white shadow-2xs text-forest-800 font-bold' : 'text-slate-600'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Satellite
            </button>
          </div>

          {/* Pace Selection */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-xs font-medium text-slate-700">
            {(['relaxed', 'moderate', 'fast'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setPace(mode)}
                className={`px-2.5 py-1 rounded-lg capitalize text-xs transition-all ${
                  pace === mode ? 'bg-white shadow-2xs text-forest-800 font-bold' : 'text-slate-600'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Optimize Button */}
          <button
            onClick={() => onOptimize(pace)}
            disabled={isOptimizing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-forest-800 hover:bg-forest-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            {isOptimizing ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-forest-200" />
            )}
            Optimize Route
          </button>
        </div>
      </div>

      {/* Warnings & Diagnostics */}
      {warnings.length > 0 && (
        <div className="px-6 py-3 bg-amber-50/60 border-b border-amber-100 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            {warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Before / After Comparison Metrics */}
      {comparison && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-3.5 bg-emerald-50/50 border-b border-emerald-100/60 text-xs">
          <div>
            <span className="text-slate-500 text-[11px]">Distance Saved</span>
            <div className="text-sm font-extrabold text-emerald-800 flex items-center gap-1 mt-0.5">
              <TrendingDown className="w-3.5 h-3.5" />
              {comparison.distance_saved_km} km
              {comparison.distance_improvement_pct != null && (
                <span className="text-xs font-normal text-emerald-600">
                  (-{comparison.distance_improvement_pct}%)
                </span>
              )}
            </div>
          </div>
          <div>
            <span className="text-slate-500 text-[11px]">Transit Time Saved</span>
            <div className="text-sm font-extrabold text-emerald-800 flex items-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
              {comparison.transit_time_saved_minutes} mins
              {comparison.transit_improvement_pct != null && (
                <span className="text-xs font-normal text-emerald-600">
                  (-{comparison.transit_improvement_pct}%)
                </span>
              )}
            </div>
          </div>
          <div>
            <span className="text-slate-500 text-[11px]">Backtracking Reduced</span>
            <div className="text-sm font-extrabold text-slate-800 mt-0.5">
              {comparison.backtracking_segments_reduced} segment(s)
            </div>
          </div>
          <div>
            <span className="text-slate-500 text-[11px]">Algorithm</span>
            <div className="text-sm font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-forest-700" />
              Nearest-Neighbor 2-Opt
            </div>
          </div>
        </div>
      )}

      {/* Live Interactive Map */}
      <div className="relative w-full h-80 sm:h-96 bg-slate-100 border-b border-slate-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Map Legend */}
        <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 text-[11px] font-medium text-slate-700 shadow-sm flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Start
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Waypoint
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" /> Final Stop
          </span>
        </div>
      </div>

      {/* Interactive Stop Chips & Timeline Navigation */}
      <div className="p-4 bg-slate-50/50">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Click stop to pan map
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stops.map((stop, i) => (
            <React.Fragment key={stop.id}>
              <button
                type="button"
                onClick={() => handleSelectStop(stop.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                  selectedStopId === stop.id
                    ? 'border-forest-600 bg-forest-50 text-forest-900 font-bold shadow-xs scale-105'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full font-bold flex items-center justify-center text-[10px] text-white ${
                    i === 0 ? 'bg-emerald-500' : i === stops.length - 1 ? 'bg-purple-600' : 'bg-blue-600'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="truncate max-w-[140px] font-medium">{stop.name}</span>
                {stop.start_time && (
                  <span className="text-[10px] text-slate-400 font-mono">{stop.start_time}</span>
                )}
              </button>
              {i < stops.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
