// app/MapShell.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type * as LeafletNS from 'leaflet';

import HeatLayer from './components/HeatLayer';
import ClusterLayer from './components/ClusterLayer';

type StopRow = {
    id: string;
    nameTH: string;
    nameEN: string;
    lat: number;
    lng: number;
    addressTH?: string;
    addressEN?: string;
    icon?: string;
};

const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];
const TAG_CHIPS = [
    { key: 'bus', label: 'ป้ายรถเมล์' },
    { key: 'bts', label: 'BTS' },
    { key: 'boat', label: 'ท่าเรือ' },
    { key: 'brt', label: 'BRT' },
];

type Mode = 'cluster' | 'heat';

export default function MapShell() {
    const [mode, setMode] = useState<Mode>('cluster');
    const [activeKeys, setActive] = useState<string[]>(['bus', 'bts', 'boat', 'brt']);
    const [q, setQ] = useState('');
    const [points, setPoints] = useState<StopRow[]>([]);

    // map instance
    const mapRef = useRef<LeafletNS.Map | null>(null);

    // anti-spam
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const lastQueryKeyRef = useRef<string>('');
    const listenerAttachedRef = useRef<boolean>(false);

    const typesStr = useMemo(
        () => (activeKeys.length ? activeKeys : TAG_CHIPS.map(t => t.key)).join(','),
        [activeKeys]
    );

    const normalize = (n: number) => Math.round(n * 1e6) / 1e6;

    const actuallyFetch = useCallback(async () => {
        if (!mapRef.current) return;
        const b = mapRef.current.getBounds();
        const bbox = [normalize(b.getWest()), normalize(b.getSouth()), normalize(b.getEast()), normalize(b.getNorth())].join(',');
        const qTrim = q.trim();
        const key = `${bbox}|${typesStr}|${qTrim.toLowerCase()}`;

        // กันยิงซ้ำ key เดิม
        if (key === lastQueryKeyRef.current) return;
        lastQueryKeyRef.current = key;

        // ยกเลิกคำขอเก่า
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const params = new URLSearchParams();
        params.set('types', typesStr);
        if (qTrim) params.set('q', qTrim);
        params.set('bbox', bbox);

        try {
            const res = await fetch(`/api/stops?${params.toString()}`, { cache: 'no-store', signal: controller.signal });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setPoints(json?.data ?? []);
        } catch (e: any) {
            if (e?.name !== 'AbortError') console.error('fetch error', e);
        } finally {
            if (abortRef.current === controller) abortRef.current = null;
        }
    }, [q, typesStr]);

    const scheduleFetch = useCallback((delay = 250) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            debounceRef.current = null;
            actuallyFetch();
        }, delay);
    }, [actuallyFetch]);

    // attach moveend แค่ครั้งเดียว + ยิงครั้งแรกเมื่อ map พร้อม
    const onMapReady = useCallback((map: LeafletNS.Map) => {
        if (!map) return;
        mapRef.current = map;
        if (!listenerAttachedRef.current) {
            listenerAttachedRef.current = true;
            map.on('moveend', () => scheduleFetch(150));
        }
        scheduleFetch(0);
    }, [scheduleFetch]);

    // เมื่อฟิลเตอร์/ค้นหาเปลี่ยน → บังคับยิงใหม่ (reset key)
    useEffect(() => {
        if (!mapRef.current) return;
        lastQueryKeyRef.current = '';
        scheduleFetch(0);
    }, [typesStr, q, scheduleFetch]);

    // cleanup
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (abortRef.current) abortRef.current.abort();
        };
    }, []);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', height: '100dvh', position: 'relative' }}>
            {/* LEFT: Filter Panel */}
            <aside style={{ padding: 12, borderRight: '1px solid #e5e7eb', background: '#0f172a', color: 'white' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>ฟิลเตอร์</div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="ค้นหา สถานที่, ถนน"
                        style={{ flex: 1, padding: '8px 10px', border: '1px solid #334155', borderRadius: 8, background: '#111827', color: 'white' }}
                    />
                    <button
                        onClick={() => { lastQueryKeyRef.current = ''; scheduleFetch(0); }}
                        style={btnPrimary}
                    >
                        ค้นหา
                    </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {TAG_CHIPS.map(t => {
                        const active = activeKeys.includes(t.key);
                        return (
                            <button
                                key={t.key}
                                onClick={() => setActive(p => p.includes(t.key) ? p.filter(k => k !== t.key) : [...p, t.key])}
                                style={{
                                    padding: '6px 10px', borderRadius: 999, border: '1px solid #334155',
                                    background: active ? '#6366f1' : 'transparent',
                                    color: active ? 'white' : '#e5e7eb', cursor: 'pointer', fontSize: 12
                                }}
                            >
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button onClick={() => setActive(['bus', 'bts', 'boat', 'brt'])} style={{ ...btnGhost, marginRight: 6 }}>
                        เลือกทั้งหมด
                    </button>
                    <button onClick={() => setActive([])} style={btnGhost}>
                        ล้าง
                    </button>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setMode('cluster')} style={{ ...btnToggle, background: mode === 'cluster' ? '#6366f1' : '#1f2937', color: 'white' }}>
                        Cluster
                    </button>
                    <button onClick={() => setMode('heat')} style={{ ...btnToggle, background: mode === 'heat' ? '#6366f1' : '#1f2937', color: 'white' }}>
                        Heat
                    </button>
                </div>
            </aside>

            {/* RIGHT: Map */}
            <section style={{ position: 'relative' }}>
                <MapContainer
                    center={DEFAULT_CENTER}
                    zoom={11}
                    style={{ width: '100%', height: '100%' }}
                    ref={(map) => { if (map && !mapRef.current) onMapReady(map); }}
                >
                    <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {mode === 'cluster' ? (
                        <ClusterLayer
                            points={points.map(p => ({
                                id: p.id, lat: p.lat, lng: p.lng,
                                nameTH: p.nameTH, nameEN: p.nameEN, addressTH: p.addressTH, addressEN: p.addressEN
                            }))}
                            radius={60}
                            maxZoom={18}
                        />
                    ) : (
                        <HeatLayer
                            points={points.map(p => ({ lat: p.lat, lng: p.lng, weight: 0.6 }))}
                            radius={28}
                            blur={18}
                            maxZoom={17}
                        />
                    )}
                </MapContainer>
            </section>
        </div>
    );
}

const btnPrimary: React.CSSProperties = {
    padding: '8px 12px', background: '#6366f1', color: '#fff',
    borderRadius: 8, border: '1px solid #6366f1', cursor: 'pointer'
};
const btnGhost: React.CSSProperties = {
    padding: '6px 10px', background: 'transparent', color: '#e5e7eb',
    borderRadius: 8, border: '1px solid #334155', cursor: 'pointer', fontSize: 12
};
const btnToggle: React.CSSProperties = {
    padding: '8px 12px', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer'
};
