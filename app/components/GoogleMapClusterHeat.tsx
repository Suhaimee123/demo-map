'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

type Point = {
    lat: number;
    lng: number;
    weight?: number;
    popupHtml?: string;
};

type Props = {
    height?: number | string;
    defaultMode?: 'cluster' | 'heat';
    center?: google.maps.LatLngLiteral;
    zoom?: number;
};

export default function GoogleMapClusterHeat({

    height = 560,
    defaultMode = 'cluster',
    center = { lat: 13.7563, lng: 100.5018 },
    zoom = 11,
}: Props) {
    const apiKey = process.env.NEXT_PUBLIC_GMAPS_KEY as string;

    const mapRef = useRef<HTMLDivElement | null>(null);
    const [mode, setMode] = useState<'cluster' | 'heat'>(defaultMode);

    useEffect(() => {
        let map: google.maps.Map | null = null;
        let clusterer: MarkerClusterer | null = null;
        let markers: google.maps.marker.AdvancedMarkerElement[] = [];
        let heat: google.maps.visualization.HeatmapLayer | null = null;

        const loader = new Loader({
            apiKey,
            version: 'weekly',
        });

        (async () => {
            await loader.load();

            // โหลดไลบรารีที่ต้องใช้ตามโหมด
            const { Map } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;
            const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;

            map = new Map(mapRef.current as HTMLDivElement, {
                center,
                zoom,
                mapId: 'DEMO_MAP_ID', // optional ถ้ามี MapID
            });

            // ดึงข้อมูลจาก API
            const res = await fetch('/api/province-data', { cache: 'no-store' });
            const json = await res.json();
            const points: Point[] = json?.data ?? [];

            // เตรียม AdvancedMarkers
            markers = points.map((p) => {
                const marker = new AdvancedMarkerElement({
                    position: { lat: p.lat, lng: p.lng },
                    map: mode === 'cluster' ? map! : undefined, // โหมด cluster จะให้แผนที่กับคลัสเตอร์จัดการ
                });

                if (p.popupHtml) {
                    const infowindow = new google.maps.InfoWindow({ content: p.popupHtml });
                    marker.addListener('click', () => infowindow.open({ map: map!, anchor: marker }));
                }
                return marker;
            });

            // โหมด Cluster
            if (mode === 'cluster') {
                clusterer = new MarkerClusterer({ markers, map: map! });
            }

            // โหมด Heatmap (ต้องการ visualization library)
            if (mode === 'heat') {
                const { HeatmapLayer } = (await google.maps.importLibrary(
                    'visualization'
                )) as google.maps.VisualizationLibrary;

                const heatData = points.map((p) => ({
                    location: new google.maps.LatLng(p.lat, p.lng),
                    weight: p.weight ?? 0.8,
                }));

                heat = new HeatmapLayer({
                    data: heatData as any,
                    radius: 28,
                    opacity: 0.6,
                    dissipating: true,
                });
                heat.setMap(map!);
            }

            // cleanup เมื่อ unmount หรือสลับโหมด
            return () => {
                clusterer?.clearMarkers();
                heat?.setMap(null);
                markers.forEach((m) => (m.map = null));
            };
        })();

        return () => {
            // จะถูกเรียกเมื่อคอมโพเนนต์ unmount
        };
    }, [apiKey, center, zoom, mode]);

    return (
        <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button
                    onClick={() => setMode('cluster')}
                    style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        background: mode === 'cluster' ? '#003398' : '#fff',
                        color: mode === 'cluster' ? '#fff' : '#111827',
                        cursor: 'pointer',
                    }}
                >
                    Cluster
                </button>
                <button
                    onClick={() => setMode('heat')}
                    style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        background: mode === 'heat' ? '#003398' : '#fff',
                        color: mode === 'heat' ? '#fff' : '#111827',
                        cursor: 'pointer',
                    }}
                >
                    Heatmap
                </button>
            </div>
            <div ref={mapRef} style={{ width: '100%', height }} />
        </div>
    );
}
