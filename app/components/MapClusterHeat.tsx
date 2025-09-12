'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type * as LeafletNS from 'leaflet';

// CSS ของ Leaflet/Plugins (โหลดบน client)
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// ปลั๊กอิน JS (ไม่มี type อย่างเป็นทางการ จึงเป็น any)
import 'leaflet.markercluster';
import 'leaflet.heat';

let L: typeof LeafletNS | null = null;
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    L = require('leaflet');
}

// แก้ไอคอน Marker ไม่แสดงใน Next.js
function fixLeafletIcon() {
    if (!L) return;
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    const iconRetina = require('leaflet/dist/images/marker-icon-2x.png');
    const icon = require('leaflet/dist/images/marker-icon.png');
    const shadow = require('leaflet/dist/images/marker-shadow.png');
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: iconRetina.default || iconRetina,
        iconUrl: icon.default || icon,
        shadowUrl: shadow.default || shadow,
    });
}

export type PointFeature = {
    lat: number;
    lng: number;
    weight?: number;       // 0..1 สำหรับ heat
    popupHtml?: string;    // เนื้อหา popup ตอนคลิก marker
};

type MapMode = 'cluster' | 'heat';

export interface MapClusterHeatProps {
    points: PointFeature[];
    initialCenter?: [number, number];
    initialZoom?: number;
    heatRadius?: number;   // พิกเซล
    heatBlur?: number;
    maxZoom?: number;
    height?: number | string;
    className?: string;
    defaultMode?: MapMode;
}

/** คอมโพเนนต์หลัก */
export default function MapClusterHeat({
    points,
    initialCenter = [13.736717, 100.523186],
    initialZoom = 6,
    heatRadius = 25,
    heatBlur = 15,
    maxZoom = 19,
    height = 520,
    className,
    defaultMode = 'cluster',
}: MapClusterHeatProps) {
    const [mode, setMode] = useState<MapMode>(defaultMode);

    useEffect(() => {
        fixLeafletIcon();
    }, []);

    return (
        <div className={className} style={{ width: '100%' }}>
            {/* Toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button
                    onClick={() => setMode('cluster')}
                    style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        background: mode === 'cluster' ? '#003398' : '#fff',
                        color: mode === 'cluster' ? '#fff' : '#111827',
                        cursor: 'pointer'
                    }}
                >
                    Cluster Map
                </button>
                <button
                    onClick={() => setMode('heat')}
                    style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        background: mode === 'heat' ? '#003398' : '#fff',
                        color: mode === 'heat' ? '#fff' : '#111827',
                        cursor: 'pointer'
                    }}
                >
                    Heatmap
                </button>
            </div>

            <div style={{ width: '100%', height }}>
                <MapContainer
                    center={initialCenter}
                    zoom={initialZoom}
                    style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }}
                >
                    <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maxZoom={maxZoom}
                    />

                    {mode === 'cluster' ? (
                        <ClusterLayer points={points} />
                    ) : (
                        <HeatLayer points={points} radius={heatRadius} blur={heatBlur} />
                    )}
                </MapContainer>
            </div>
        </div>
    );
}

/* ------------ Cluster Layer (imperative via useMap) ------------ */
function ClusterLayer({ points }: { points: PointFeature[] }) {
    const map = useMap();
    const clusterRef = useRef<any>(null);

    useEffect(() => {
        if (!L || !map) return;

        // @ts-ignore
        const clusterGroup = L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 50,
            spiderfyOnEveryZoom: false,
        });

        points.forEach((p) => {
            const m = L!.marker([p.lat, p.lng]);
            if (p.popupHtml) m.bindPopup(p.popupHtml, { maxWidth: 280 });
            clusterGroup.addLayer(m);
        });

        clusterGroup.addTo(map);
        clusterRef.current = clusterGroup;

        return () => {
            if (clusterRef.current) map.removeLayer(clusterRef.current);
        };
    }, [map, points]);

    return null;
}

/* -------------------- Heat Layer (imperative) ------------------- */
function HeatLayer({
    points,
    radius = 25,
    blur = 15,
}: {
    points: PointFeature[];
    radius?: number;
    blur?: number;
}) {
    const map = useMap();
    const heatRef = useRef<any>(null);

    useEffect(() => {
        if (!L || !map) return;

        const heatData = points.map((p) => [p.lat, p.lng, p.weight ?? 0.6]) as [
            number,
            number,
            number
        ][];

        // @ts-ignore
        const heat = (L as any).heatLayer(heatData, { radius, blur, maxZoom: 17 });
        heat.addTo(map);
        heatRef.current = heat;

        return () => {
            if (heatRef.current) map.removeLayer(heatRef.current);
        };
    }, [map, points, radius, blur]);

    return null;
}
