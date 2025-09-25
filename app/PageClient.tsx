'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
const MapClusterHeat = dynamic(() => import('./components/MapClusterHeat'), { ssr: false });
// ลบ GoogleMapClusterHeat ถ้าไม่ได้ใช้

import type { PointFeature } from './components/MapClusterHeat';

export default function PageClient() {
    const [points, setPoints] = useState<PointFeature[]>([]);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        (async () => {
            try {
                const res = await fetch('/api/province-data', {
                    cache: 'no-store',
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (isMounted) setPoints(json.data ?? []);
            } catch (err: any) {
                if (err?.name !== 'AbortError') {
                    console.error('Failed to load /api/province-data:', err);
                }
            }
        })();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, []);

    return (
        <main style={{ padding: 16 }}>
            <MapClusterHeat
                points={points}
                initialCenter={[13.7563, 100.5018]}
                initialZoom={11}
                heatRadius={28}
                heatBlur={18}
                height={560}
                defaultMode="cluster"
            />
        </main>
    );
}
