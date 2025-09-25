'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
const MapClusterHeat = dynamic(() => import('./components/MapClusterHeat'), { ssr: false });
import type { PointFeature } from './components/MapClusterHeat';

export default function PageClient() {
    const [points, setPoints] = useState<PointFeature[]>([]);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();
        (async () => {
            try {
                const res = await fetch('/api/province-data', { cache: 'no-store', signal: controller.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (isMounted) setPoints(json.data ?? []);
            } catch (e: any) {
                if (e?.name !== 'AbortError') console.error(e);
            }
        })();
        return () => { isMounted = false; controller.abort(); };
    }, []);

    // padding 16+16 = 32px => หักออกจากความสูงหน้าจอ
    return (
        <main style={{ padding: 16 }}>
            <div style={{ height: 'calc(100dvh - 32px)' }}>
                <MapClusterHeat
                    points={points}
                    initialCenter={[13.7563, 100.5018]}
                    initialZoom={11}
                    heatRadius={28}
                    heatBlur={18}
                    height="100dvh"
                    defaultMode="cluster"
                />
            </div>
        </main>
    );
}
