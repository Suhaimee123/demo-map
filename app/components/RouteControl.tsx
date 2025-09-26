// app/components/RouteControl.tsx
'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type * as LNS from 'leaflet';

let L: typeof LNS | null = null;
if (typeof window !== 'undefined') {
    L = require('leaflet');
    require('leaflet-routing-machine'); // ใช้ OSRM demo server
}

export default function RouteControl({
    start, end, enabled,
}: {
    start?: [number, number];
    end?: [number, number];
    enabled?: boolean;
}) {
    const map = useMap();

    useEffect(() => {
        if (!L || !map || !enabled || !start || !end) return;

        const ctrl = (L as any).Routing.control({
            waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
            routeWhileDragging: false,
            show: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            showAlternatives: true,
        }).addTo(map);

        return () => {
            try { map.removeControl(ctrl); } catch { }
        };
    }, [map, enabled, start?.[0], start?.[1], end?.[0], end?.[1]]);

    return null;
}
