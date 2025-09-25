// app/components/HeatLayer.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type * as LNS from 'leaflet';
import 'leaflet.heat'; // เพิ่ม L.heatLayer

let L: typeof LNS | null = null;
if (typeof window !== 'undefined') { L = require('leaflet'); }

export type HeatPoint = { lat: number; lng: number; weight?: number };

export default function HeatLayer({
    points, radius = 25, blur = 15, maxZoom = 17,
}: { points: HeatPoint[]; radius?: number; blur?: number; maxZoom?: number; }) {
    const map = useMap(); const layerRef = useRef<any>(null);

    useEffect(() => {
        if (!L || !map) return;
        const heatData = points.map(p => [p.lat, p.lng, p.weight ?? 0.6]) as [number, number, number][];
        const heat = (L as any).heatLayer(heatData, { radius, blur, maxZoom }).addTo(map);
        layerRef.current = heat;
        return () => { if (layerRef.current) map.removeLayer(layerRef.current); };
    }, [map, points, radius, blur, maxZoom]);

    return null;
}
