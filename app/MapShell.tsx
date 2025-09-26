'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type * as LeafletNS from 'leaflet';

import HeatLayer from './components/HeatLayer';
import ClusterLayer from './components/ClusterLayer';
import FilterPanel, { type Tag, type Mode } from './components/FilterPanel';

import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';

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
const TAG_CHIPS: Tag[] = [
    { key: 'bus', label: 'ป้ายรถเมล์' },
    { key: 'bts', label: 'BTS' },
    { key: 'boat', label: 'ท่าเรือ' },
    { key: 'brt', label: 'BRT' },
];

export default function MapShell() {
    const [mode, setMode] = useState<Mode>('cluster');
    const [activeKeys, setActive] = useState<string[]>(['bus', 'bts', 'boat', 'brt']);
    const [q, setQ] = useState('');
    const [points, setPoints] = useState<StopRow[]>([]);
    const [panelOpen, setPanelOpen] = useState<boolean>(true);

    const mapRef = useRef<LeafletNS.Map | null>(null);
    const mapWrapRef = useRef<HTMLDivElement | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const lastQueryKeyRef = useRef<string>('');
    const listenerAttachedRef = useRef<boolean>(false);

    const typesStr = useMemo(() => activeKeys.join(','), [activeKeys]);
    const normalize = (n: number) => Math.round(n * 1e6) / 1e6;

    const actuallyFetch = useCallback(async () => {
        if (!mapRef.current) return;
        const b = mapRef.current.getBounds();
        const bbox = [
            normalize(b.getWest()),
            normalize(b.getSouth()),
            normalize(b.getEast()),
            normalize(b.getNorth()),
        ].join(',');
        const qTrim = q.trim();
        const key = `${bbox}|${typesStr}|${qTrim.toLowerCase()}`;
        if (key === lastQueryKeyRef.current) return;
        lastQueryKeyRef.current = key;

        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const params = new URLSearchParams();
        if (activeKeys.length > 0) params.set('types', typesStr); else params.set('types', '');
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
    }, [q, typesStr, activeKeys.length]);

    const scheduleFetch = useCallback((delay = 250) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            debounceRef.current = null;
            actuallyFetch();
        }, delay);
    }, [actuallyFetch]);

    const onMapReady = useCallback((map: LeafletNS.Map) => {
        if (!map) return;
        mapRef.current = map;
        setTimeout(() => map.invalidateSize(), 0);
        if (!listenerAttachedRef.current) {
            listenerAttachedRef.current = true;
            const handler = () => scheduleFetch(120);
            map.on('moveend', handler);
            map.on('zoomend', handler);
        }
        scheduleFetch(0);
    }, [scheduleFetch]);

    useEffect(() => {
        if (!mapRef.current) return;
        lastQueryKeyRef.current = '';
        scheduleFetch(0);
    }, [typesStr, q, scheduleFetch]);

    // invalidate เมื่อ container เปลี่ยนขนาด
    useEffect(() => {
        if (!mapWrapRef.current) return;
        const ro = new ResizeObserver(() => {
            const m = mapRef.current;
            if (m) m.invalidateSize();
        });
        ro.observe(mapWrapRef.current);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        // ปิด panel ด้วยปุ่ม Escape แต่ไม่บังการลากแผนที่
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanelOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (abortRef.current) abortRef.current.abort();
        };
    }, []);

    const ALL_KEYS = useMemo(() => TAG_CHIPS.map(t => t.key), []);
    const handleChipClick = useCallback((key: string) => {
        setActive(prev => {
            const isActive = prev.includes(key);
            const isAllSelected = prev.length === ALL_KEYS.length && ALL_KEYS.every(k => prev.includes(k));
            if (!isActive && isAllSelected) return [key];
            return isActive ? prev.filter(k => k !== key) : [...prev, key];
        });
    }, [ALL_KEYS]);

    const togglePanel = () => setPanelOpen(p => !p);

    return (
        <div style={{ position: 'relative', height: '100dvh' }}>
            {/* ปุ่ม Toggle ลอย */}
            <button
                onClick={togglePanel}
                style={{
                    position: 'absolute', zIndex: 1002, top: 12,
                    padding: '8px 12px', borderRadius: 8, border: '1px solid #334155',
                    background: '#111827', color: '#e5e7eb', cursor: 'pointer'
                }}
                aria-label="Toggle filter panel"
            >
                {panelOpen ? 'ซ่อนฟิลเตอร์' : 'แสดงฟิลเตอร์'}
            </button>

            {/* ✅ แผงฟิลเตอร์ลอย แต่ไม่มี backdrop มาบัง map */}
            <FilterPanel
                open={panelOpen}
                floating
                tags={TAG_CHIPS}
                activeKeys={activeKeys}
                onToggleKey={handleChipClick}
                onSelectAll={() => setActive(['bus', 'bts', 'boat', 'brt'])}
                onClear={() => setActive([])}
                mode={mode}
                setMode={setMode}
                q={q}
                setQ={setQ}
                onSearch={() => { lastQueryKeyRef.current = ''; scheduleFetch(0); }}
                onClose={() => setPanelOpen(false)}
            />

            {/* แผนที่ */}
            <section ref={mapWrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
                <MapContainer
                    center={DEFAULT_CENTER}
                    zoom={11}
                    zoomControl={false}
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
