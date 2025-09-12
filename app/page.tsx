'use client';

import { useEffect, useState } from 'react';
import MapClusterHeat, { PointFeature } from './components/MapClusterHeat';
import GoogleMapClusterHeatOptimized from './components/GoogleMapClusterHeat';

export default function Page() {
  const [engine, setEngine] = useState<'leaflet' | 'google'>('google');
  const [points, setPoints] = useState<PointFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const apiKey = process.env.NEXT_PUBLIC_GMAPS_KEY as string;

  // โหลดสำหรับ Leaflet (ถ้าจะโชว์ Leaflet)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/province-data', { cache: 'no-store' }); // ของเดิมคุณ
        const json = await res.json();
        setPoints(json.data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setEngine('leaflet')} style={{ padding: '6px 12px' }}>
          Leaflet
        </button>
        <button onClick={() => setEngine('google')} style={{ padding: '6px 12px' }}>
          Google Maps
        </button>
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
        <GoogleMapClusterHeatOptimized
          // ถ้าจำเป็นต้องใช้ /api/province-data ชั่วคราว ให้ตั้ง useBbox={false}
          center={{ lat: 13.7563, lng: 100.5018 }}
          zoom={11}
          height={560}
        />
      )}
    </main>
  );
}
