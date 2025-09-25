// app/components/ClusterLayer.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Marker, Tooltip, CircleMarker, useMapEvents } from 'react-leaflet';
import type * as LNS from 'leaflet';
import Supercluster from 'supercluster';

let L: typeof LNS | null = null;
if (typeof window !== 'undefined') { L = require('leaflet'); }

export type ClusterPoint = {
    id: string; lat: number; lng: number;
    nameTH?: string; nameEN?: string; addressTH?: string; addressEN?: string;
};

type GeoJSONPoint = GeoJSON.Feature<GeoJSON.Point, any>;
type ClusterFeature = GeoJSONPoint & {
    properties: {
        cluster?: boolean; cluster_id?: number; point_count?: number; point_count_abbreviated?: number;
        id?: string; nameTH?: string; nameEN?: string; addressTH?: string; addressEN?: string;
    }
};

export default function ClusterLayer({ points, radius = 60, maxZoom = 18 }: {
    points: ClusterPoint[]; radius?: number; maxZoom?: number;
}) {
    const [clusters, setClusters] = useState<ClusterFeature[]>([]);
    const indexRef = useRef<Supercluster | null>(null);
    const mapRef = useRef<LNS.Map | null>(null);

    const features: GeoJSONPoint[] = useMemo(() => points.map(p => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { id: p.id, nameTH: p.nameTH, nameEN: p.nameEN, addressTH: p.addressTH, addressEN: p.addressEN }
    })), [points]);

    useEffect(() => {
        const idx = new Supercluster({ radius, maxZoom }); idx.load(features);
        indexRef.current = idx; if (mapRef.current) updateClusters(mapRef.current);
    }, [features, radius, maxZoom]);

    function Binder() {
        const map = useMapEvents({
            load() { mapRef.current = map; updateClusters(map); },
            moveend() { updateClusters(map); },
        }); return null;
    }

    function updateClusters(map: LNS.Map) {
        const b = map.getBounds(); const z = Math.round(map.getZoom());
        const bbox: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
        const idx = indexRef.current; if (!idx) return;
        setClusters(idx.getClusters(bbox, z) as unknown as ClusterFeature[]);
    }

    function onClusterClick(lat: number, lng: number, id: number) {
        const idx = indexRef.current, map = mapRef.current; if (!idx || !map) return;
        const nextZoom = Math.min(idx.getClusterExpansionZoom(id), 20);
        map.setView([lat, lng], nextZoom, { animate: true });
    }

    function icon(count: number) {
        if (!L) return undefined;
        const size = count < 10 ? 34 : count < 100 ? 40 : 48;
        const bg = count < 10 ? '#4ade80' : count < 100 ? '#60a5fa' : '#fb923c';
        return L.divIcon({
            html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${bg};color:#111;font-weight:700;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.25)">${count}</div>`,
            className: '', iconSize: [size, size]
        });
    }

    return (
        <>
            <Binder />
            {clusters.map((f, i) => {
                const [lng, lat] = f.geometry.coordinates as [number, number];
                if (f.properties.cluster) {
                    const id = f.properties.cluster_id!, count = f.properties.point_count || 0;
                    return <Marker key={`c-${id}`} position={[lat, lng]} icon={icon(count)} eventHandlers={{ click: () => onClusterClick(lat, lng, id) }} />;
                }
                return (
                    <CircleMarker key={`p-${f.properties.id || i}`} center={[lat, lng]} radius={4} pathOptions={{ weight: 1 }}>
                        <Tooltip>
                            <div style={{ fontSize: 12 }}>
                                <b>{f.properties.nameTH || f.properties.nameEN}</b><br />
                                <small>{f.properties.addressTH || ''}</small>
                            </div>
                        </Tooltip>
                    </CircleMarker>
                );
            })}
        </>
    );
}
