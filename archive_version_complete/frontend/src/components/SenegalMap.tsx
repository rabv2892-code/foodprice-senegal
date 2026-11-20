import React, { useMemo, useState } from "react";
import { MapPin, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import type { GeoAnalysisResponse } from "../types";
import { formatNumber } from "../api/client";

interface SenegalMapProps {
  markets: GeoAnalysisResponse["markets"];
  unit: string;
  nationalMean?: number;
  selectedMarket: string | null;
  onSelectMarket: (market: string | null) => void;
}

// Authentic [lon, lat] outline of Senegal + The Gambia border enclave (real geographic coordinates)
const SENEGAL_OUTLINE: [number, number][] = [
  [-17.54, 14.74], [-17.45, 14.84], [-17.15, 14.95], [-16.82, 15.32], [-16.52, 15.96],
  [-16.45, 16.25], [-16.05, 16.51], [-15.65, 16.65], [-15.10, 16.68], [-14.72, 16.62],
  [-14.20, 16.56], [-13.65, 16.18], [-13.20, 15.66], [-12.75, 15.15], [-12.42, 14.88],
  [-12.18, 14.45], [-12.06, 13.85], [-11.42, 13.30], [-11.35, 12.78], [-11.65, 12.45],
  [-12.25, 12.35], [-12.88, 12.42], [-13.45, 12.64], [-14.12, 12.68], [-14.78, 12.67],
  [-15.48, 12.65], [-16.12, 12.48], [-16.75, 12.35], [-16.80, 12.62], [-16.65, 12.95],
  [-16.78, 13.12], [-16.54, 13.18], [-15.95, 13.18], [-15.20, 13.38], [-14.40, 13.48],
  [-13.80, 13.42], [-13.78, 13.62], [-14.35, 13.76], [-15.15, 13.72], [-15.92, 13.62],
  [-16.62, 13.60], [-16.74, 13.85], [-16.95, 14.18], [-17.12, 14.46], [-17.35, 14.62],
  [-17.54, 14.74],
];

const GAMBIA_ENCLAVE: [number, number][] = [
  [-16.78, 13.38], [-16.15, 13.28], [-15.35, 13.35], [-14.55, 13.46], [-13.82, 13.40],
  [-13.78, 13.58], [-14.32, 13.74], [-15.18, 13.68], [-16.02, 13.60], [-16.65, 13.56],
  [-16.78, 13.38],
];

// Geographic projection bounds
const LON_MIN = -17.85;
const LON_MAX = -11.10;
const LAT_MIN = 12.10;
const LAT_MAX = 16.90;
const SVG_W = 820;
const SVG_H = 580;

function project(lon: number, lat: number): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (SVG_W - 60) + 30;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (SVG_H - 60) + 30;
  return [x, y];
}

function toPath(coords: [number, number][]): string {
  return coords
    .map(([lon, lat], i) => {
      const [x, y] = project(lon, lat);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ") + " Z";
}

function priceColor(price: number, minP: number, maxP: number): string {
  if (maxP <= minP) return "#0EA5E9";
  const ratio = (price - minP) / (maxP - minP);
  if (ratio <= 0.35) return "#10B981"; // emerald (cheaper)
  if (ratio <= 0.68) return "#F59E0B"; // amber (median)
  return "#EF4444"; // crimson (expensive)
}

export const SenegalMap: React.FC<SenegalMapProps> = ({
  markets,
  unit,
  nationalMean,
  selectedMarket,
  onSelectMarket,
}) => {
  const [zoom, setZoom] = useState(1);
  const [hovered, setHovered] = useState<GeoAnalysisResponse["markets"][0] | null>(null);

  const { minPrice, maxPrice, maxObs } = useMemo(() => {
    const prices = markets.map((m) => m.mean).filter((v) => Number.isFinite(v));
    const obs = markets.map((m) => m.observations);
    return {
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 1,
      maxObs: obs.length ? Math.max(...obs) : 1,
    };
  }, [markets]);

  const senegalPath = useMemo(() => toPath(SENEGAL_OUTLINE), []);
  const gambiaPath = useMemo(() => toPath(GAMBIA_ENCLAVE), []);

  const activeMkt = useMemo(
    () => hovered || markets.find((m) => m.market === selectedMarket) || null,
    [hovered, markets, selectedMarket]
  );

  // Reference city coordinates purely from observed markets if present
  const keyCities = useMemo(() => {
    const names = ["Dakar", "Saint-Louis", "Touba", "Kaolack", "Tambacounda", "Ziguinchor", "Kedougou", "Matam"];
    return markets.filter((m) => names.some((n) => m.market.toLowerCase().includes(n.toLowerCase()))).slice(0, 8);
  }, [markets]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-4 text-white">
      {/* Top Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Carte géospatiale des marchés — Coordonnées GPS réelles ({markets.length} marchés)
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Chaque point est positionné exclusivement selon ses coordonnées exactes (latitude / longitude).
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.25).toFixed(2))))}
            className="rounded-lg border border-white/15 bg-white/10 p-1.5 text-slate-200 hover:bg-white/20"
            title="Zoom avant"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}
            className="rounded-lg border border-white/15 bg-white/10 p-1.5 text-slate-200 hover:bg-white/20"
            title="Zoom arrière"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              onSelectMarket(null);
            }}
            className="rounded-lg border border-white/15 bg-white/10 p-1.5 text-slate-200 hover:bg-white/20"
            title="Réinitialiser la vue"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* SVG Map Container */}
      <div className="relative overflow-auto rounded-lg border border-white/10 bg-[#071324]">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="h-[420px] w-full select-none transition-transform duration-200"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
        >
          {/* Lat/Lon subtle grid */}
          {[13, 14, 15, 16].map((lat) => {
            const [, y] = project(LON_MIN, lat);
            return (
              <g key={`lat-${lat}`}>
                <line x1={20} x2={SVG_W - 20} y1={y} y2={y} stroke="rgba(148,163,184,0.12)" strokeDasharray="4 4" />
                <text x={24} y={y - 4} fill="rgba(148,163,184,0.45)" fontSize={10} fontFamily="monospace">
                  {lat}°N
                </text>
              </g>
            );
          })}
          {[-17, -15, -13].map((lon) => {
            const [x] = project(lon, LAT_MIN);
            return (
              <g key={`lon-${lon}`}>
                <line x1={x} x2={x} y1={20} y2={SVG_H - 20} stroke="rgba(148,163,184,0.12)" strokeDasharray="4 4" />
                <text x={x + 4} y={SVG_H - 12} fill="rgba(148,163,184,0.45)" fontSize={10} fontFamily="monospace">
                  {Math.abs(lon)}°O
                </text>
              </g>
            );
          })}

          {/* Senegal polygon */}
          <path
            d={senegalPath}
            fill="#10294B"
            stroke="#38BDF8"
            strokeOpacity={0.45}
            strokeWidth={2}
          />

          {/* Gambia cutout */}
          <path
            d={gambiaPath}
            fill="#071324"
            stroke="#64748B"
            strokeOpacity={0.45}
            strokeWidth={1.2}
            strokeDasharray="3 3"
          />

          {/* Market dots */}
          {markets.map((m) => {
            const [cx, cy] = project(m.longitude, m.latitude);
            const r = 4.5 + Math.sqrt(m.observations / Math.max(1, maxObs)) * 8;
            const col = priceColor(m.mean, minPrice, maxPrice);
            const isSelected = selectedMarket === m.market;
            return (
              <g
                key={m.market}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(m)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelectMarket(isSelected ? null : m.market)}
              >
                {isSelected && (
                  <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke="#FFFFFF" strokeWidth={2} strokeOpacity={0.9} />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={col}
                  fillOpacity={0.85}
                  stroke="#060F1C"
                  strokeWidth={1.4}
                />
              </g>
            );
          })}

          {/* Subtle labels for major reference markets */}
          {keyCities.map((c) => {
            const [cx, cy] = project(c.longitude, c.latitude);
            return (
              <text
                key={`lbl-${c.market}`}
                x={cx + 8}
                y={cy + 3}
                fill="#E2E8F0"
                fontSize={10}
                fontWeight={600}
                className="pointer-events-none"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
              >
                {c.market}
              </text>
            );
          })}
        </svg>

        {/* Hover / Selection overlay card */}
        {activeMkt && (
          <div className="pointer-events-none absolute right-3 top-3 w-64 rounded-xl border border-white/15 bg-navy-950/95 p-3 shadow-elevated backdrop-blur">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-white">{activeMkt.market}</p>
                <p className="text-[11px] text-sky-300">Région : {activeMkt.region}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeMkt.gap_vs_national_pct > 0
                    ? "bg-red-500/20 text-red-300"
                    : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                {activeMkt.gap_vs_national_pct > 0 ? "+" : ""}
                {formatNumber(activeMkt.gap_vs_national_pct, 1)} % par rapport au national
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-white/10 pt-2 text-[11px]">
              <div>
                <span className="text-slate-400">Prix moyen</span>
                <p className="font-mono font-bold text-white">
                  {formatNumber(activeMkt.mean, 1)} {unit}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Dernier prix</span>
                <p className="font-mono font-bold text-emerald-300">
                  {formatNumber(activeMkt.latest_price, 1)} {unit}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Minimum / Maximum</span>
                <p className="font-mono text-slate-200">
                  {formatNumber(activeMkt.min)} / {formatNumber(activeMkt.max)}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Observations</span>
                <p className="font-mono text-slate-200">{formatNumber(activeMkt.observations)}</p>
              </div>
            </div>
            <p className="mt-2 font-mono text-[10px] text-slate-400">
              GPS : {activeMkt.latitude.toFixed(4)}°N, {activeMkt.longitude.toFixed(4)}°E
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-300">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Zones à prix modérés
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Zones intermédiaires
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-crimson-500" /> Zones à prix élevés
          </span>
        </div>
        {nationalMean !== undefined && (
          <span className="font-mono text-slate-300">
            Moyenne nationale filtrée : <strong className="text-white">{formatNumber(nationalMean, 1)} {unit}</strong>
          </span>
        )}
      </div>
    </div>
  );
};
