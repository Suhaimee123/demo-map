'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
const MapClusterHeat = dynamic(() => import('./components/MapClusterHeat'), { ssr: false });
const GoogleMapClusterHeat = dynamic(() => import('./components/GoogleMapClusterHeat'), { ssr: false });
import type { PointFeature } from './components/MapClusterHeat';

export default function PageClient() {
    const [engine, setEngine] = useState<'leaflet' | 'google'>('google');
    const [points, setPoints] = useState<PointFeature[]>([]);
    const [loading, setLoading] = useState(engine === 'leaflet');

    useEffect(() => {
        if (engine !== 'leaflet') { setLoading(false); return; }
        setLoading(true);
        (async () => {
            try {
                const res = await fetch('/api/province-data', { cache: 'no-store' });
                const json = await res.json();
                setPoints(json.data ?? []);
            } finally { setLoading(false); }
        })();
    }, [engine]);

    return (
        <main style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button onClick={() => setEngine('leaflet')} style={{ padding: '6px 12px' }}>Leaflet</button>
                <button onClick={() => setEngine('google')} style={{ padding: '6px 12px' }}>Google Maps</button>
            </div>

            {engine === 'leaflet' ? (
                loading ? <div>กำลังโหลด...</div> : (
                    <MapClusterHeat
                        points={points}
                        initialCenter={[13.7563, 100.5018]}
                        initialZoom={11}
                        heatRadius={28}
                        heatBlur={18}
                        height={560}
                        defaultMode="cluster"
                    />
                )
            ) : (
                <GoogleMapClusterHeat
                    center={{ lat: 13.7563, lng: 100.5018 }}
                    zoom={11}
                    height={560}
                />
            )}
        </main>
    );
}
