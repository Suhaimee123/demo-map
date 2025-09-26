'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type * as LeafletNS from 'leaflet';

import HeatLayer from './components/HeatLayer';
import ClusterLayer from './components/ClusterLayer';
import FilterPanel from './components/FilterPanel';
import RouteControl from './components/RouteControl';
import { iconForType, fallbackDivIconForType } from './components/icons';

import { useStops } from '@/app/hooks/useStops';
import type { StopRow } from '@/app/types/stops';

import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';

const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];
const ROUTE_BUFFER_M = 200;

// --- div pin helpers ---
function useDivPin(color: string, text: string) {
    const L = (typeof window !== 'undefined') ? require('leaflet') as typeof import('leaflet') : null;
    return useMemo(() => {
        if (!L) return undefined;
        const size = 28;
        return L.divIcon({
            html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};
              display:flex;align-items:center;justify-content:center;color:#fff;
              font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.25)">${text}</div>`,
            className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2]
        });
    }, [L, color, text]);
}

// --- distance (point -> route polyline) ---
const R = 6371000;
const toRad = (x: number) => x * Math.PI / 180;
function toXYMeters(lat: number, lng: number, lat0: number) {
    const latRad = toRad(lat), lngRad = toRad(lng), lat0Rad = toRad(lat0);
    return { x: R * lngRad * Math.cos(lat0Rad), y: R * latRad };
}
function distPointToSegmentMeters(p: [number, number], a: [number, number], b: [number, number]) {
    const lat0 = (a[0] + b[0]) / 2;
    const P = toXYMeters(p[0], p[1], lat0);
    const A = toXYMeters(a[0], a[1], lat0);
    const B = toXYMeters(b[0], b[1], lat0);
    const ABx = B.x - A.x, ABy = B.y - A.y;
    const APx = P.x - A.x, APy = P.y - A.y;
    const ab2 = ABx * ABx + ABy * ABy;
    if (ab2 === 0) return Math.hypot(APx, APy);
    let t = (APx * ABx + APy * ABy) / ab2;
    t = Math.max(0, Math.min(1, t));
    const Cx = A.x + t * ABx, Cy = A.y + t * ABy;
    return Math.hypot(P.x - Cx, P.y - Cy);
}
function distPointToPolylineMeters(p: [number, number], line: [number, number][]) {
    if (!line || line.length < 2) return Infinity;
    let best = Infinity;
    for (let i = 0; i < line.length - 1; i++) {
        const d = distPointToSegmentMeters(p, line[i], line[i + 1]);
        if (d < best) best = d;
        if (best <= ROUTE_BUFFER_M) break;
    }
    return best;
}

export default function MapShell() {
    const [mode, setMode] = useState<'cluster' | 'heat'>('cluster');
    const [panelOpen, setPanelOpen] = useState(true);

    // filters
    const [activeKeys, setActiveKeys] = useState<string[]>(['bus', 'bts', 'boat', 'brt']);
    const [q, setQ] = useState('');

    // data
    const [points, setPoints] = useState<StopRow[]>([]);

    // route pick
    const [pickMode, setPickMode] = useState<'none' | 'start' | 'end'>('none');
    const [start, setStart] = useState<[number, number] | undefined>(undefined);
    const [end, setEnd] = useState<[number, number] | undefined>(undefined);

    // route polyline
    const [routeLine, setRouteLine] = useState<[number, number][] | null>(null);

    // icons
    const startIcon = useDivPin('#22c55e', 'S');
    const endIcon = useDivPin('#ef4444', 'E');

    // map refs
    const mapRef = useRef<LeafletNS.Map | null>(null);
    const mapWrapRef = useRef<HTMLDivElement | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // data service
    const { ready, error, runQuery } = useStops();

    const typesStr = useMemo(() => activeKeys.join(','), [activeKeys]);

    // ⭐ recompute: zoom<7 → ทั้งประเทศ, zoom>=7 → bbox.pad(0.15)
    const recompute = useCallback((delay = 120) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            if (!mapRef.current || !ready) return;

            const map = mapRef.current;
            const z = Math.round(map.getZoom());

            let bboxParam: { west: number; south: number; east: number; north: number } | undefined;
            if (z >= 7) {
                const b = map.getBounds().pad(0.15);
                bboxParam = { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() };
            }
            const list = await runQuery({
                bbox: bboxParam,               // undefined = โหลดทั้งประเทศ
                types: activeKeys as any,
                q
            });
            setPoints(list);
        }, delay) as unknown as any;
    }, [ready, runQuery, activeKeys, q]);

    const onMapReady = useCallback((map: LeafletNS.Map) => {
        mapRef.current = map;
        setTimeout(() => map.invalidateSize(), 0);
        const handler = () => recompute(120);
        map.on('moveend', handler);
        map.on('zoomend', handler);
        recompute(0);
    }, [recompute]);

    useEffect(() => { if (mapRef.current) recompute(0); }, [typesStr, q, recompute]);

    // map sizing
    useEffect(() => {
        if (!mapWrapRef.current) return;
        const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
        ro.observe(mapWrapRef.current);
        return () => ro.disconnect();
    }, []);

    // esc closes panel
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanelOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const togglePanel = () => setPanelOpen(p => !p);

    // location -> set start/end
    const onUseMyLocation = useCallback(() => {
        if (!navigator.geolocation) return alert('ไม่รองรับระบุตำแหน่ง');
        navigator.geolocation.getCurrentPosition(pos => {
            const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            if (pickMode === 'start') setStart(p);
            else if (pickMode === 'end') setEnd(p);
            mapRef.current?.flyTo(p, 16);
            setPickMode('none');
        }, () => alert('อ่านตำแหน่งไม่สำเร็จ'));
    }, [pickMode]);

    const onSwap = useCallback(() => {
        setStart(prevS => {
            const s = prevS;
            setEnd(prevE => s ? prevE ? [s[0], s[1]] : prevE : prevE);
            return (end ? [end[0], end[1]] : s);
        });
        setPickMode('none');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [end?.[0], end?.[1]]);
    const onClear = useCallback(() => { setStart(undefined); setEnd(undefined); setPickMode('none'); setRouteLine(null); }, []);

    const onResultClick = useCallback((r: { lat: number; lng: number; }) => {
        const p: [number, number] = [r.lat, r.lng];
        setEnd(p);
        mapRef.current?.flyTo(p, Math.max(16, mapRef.current.getZoom()));
        setPickMode('none');
    }, []);

    function OneClickPicker() {
        useMapEvents({
            click(e) {
                if (pickMode === 'none') return;
                const p: [number, number] = [e.latlng.lat, e.latlng.lng];
                if (pickMode === 'start') setStart(p);
                if (pickMode === 'end') setEnd(p);
                setPickMode('none');
            }
        });
        return null;
    }

    // get route from OSRM when both points exist
    useEffect(() => {
        (async () => {
            if (!start || !end) { setRouteLine(null); return; }
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                if (!res.ok) throw new Error('route http ' + res.status);
                const json = await res.json();
                const coords: [number, number][] | undefined = json?.routes?.[0]?.geometry?.coordinates;
                if (coords && coords.length) {
                    setRouteLine(coords.map(([lng, lat]: [number, number]) => [lat, lng]));
                    return;
                }
                throw new Error('no route');
            } catch {
                setRouteLine([start, end]); // fallback straight line
            }
        })();
    }, [start, end]);

    // visible points: all by default; filter by route if exists
    const visiblePoints = useMemo(() => {
        if (!routeLine || routeLine.length < 2) return points;
        return points.filter(p => distPointToPolylineMeters([p.lat, p.lng], routeLine) <= ROUTE_BUFFER_M);
    }, [points, routeLine]);

    return (
        <div style={{ position: 'relative', height: '100dvh' }}>
            {/* Toggle Panel */}
            <button
                onClick={togglePanel}
                style={{
                    position: 'absolute', zIndex: 1002, top: 3, left: 5, padding: '4px 8px',
                    borderRadius: 8, border: '1px solid #334155', background: '#111827', color: '#e5e7eb', cursor: 'pointer'
                }}
            >
                {panelOpen ? 'ซ่อนฟิลเตอร์' : 'แสดงฟิลเตอร์'}
            </button>

            {/* Panel */}
            <FilterPanel
                open={panelOpen}
                mode={mode} setMode={setMode}
                activeKeys={activeKeys} setActiveKeys={setActiveKeys}
                q={q} setQ={setQ}
                resultsCount={visiblePoints.length}
                results={visiblePoints.slice(0, 60).map(it => ({
                    id: it.id, nameTH: it.nameTH, nameEN: it.nameEN,
                    addressTH: it.addressTH, addressEN: it.addressEN,
                    lat: it.lat, lng: it.lng, type: (it.type as any) || 'unknown'
                }))}
                onResultClick={onResultClick}
                start={start} end={end}
                pickMode={pickMode} setPickMode={setPickMode}
                onUseMyLocation={onUseMyLocation}
                onSwap={onSwap}
                onClear={onClear}
                onClose={() => setPanelOpen(false)}
            />

            {/* Map */}
            <section ref={mapWrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
                <MapContainer
                    center={DEFAULT_CENTER}
                    zoom={6}               // เริ่มกว้างหน่อย เพื่อให้ซูมออกก็โหลดทั้งประเทศอยู่แล้ว
                    zoomControl={false}
                    style={{ width: '100%', height: '100%' }}
                    ref={(map) => { if (map && !mapRef.current) onMapReady(map); }}
                >
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {/* one-click set start/end */}
                    <OneClickPicker />

                    {mode === 'cluster' ? (
                        <ClusterLayer
                            points={visiblePoints.map(p => ({
                                id: p.id, lat: p.lat, lng: p.lng,
                                nameTH: p.nameTH, nameEN: p.nameEN, addressTH: p.addressTH, addressEN: p.addressEN,
                                iconType: (p.type as any) || 'unknown',
                            }))}
                            radius={60}
                            maxZoom={18}
                            getPointIcon={(t) => iconForType((t as any) || 'unknown')}
                            getPointFallbackIcon={(t) => fallbackDivIconForType((t as any) || 'unknown')}
                        />
                    ) : (
                        <HeatLayer
                            points={visiblePoints.map(p => ({ lat: p.lat, lng: p.lng, weight: 0.6 }))}
                            radius={28}
                            blur={18}
                            maxZoom={17}
                        />
                    )}

                    {/* Start / End pins */}
                    {start && <Marker position={start} icon={startIcon as any} />}
                    {end && <Marker position={end} icon={endIcon as any} />}

                    <RouteControl enabled={!!start && !!end} start={start} end={end} />
                </MapContainer>
            </section>

            {/* Status */}
            {!ready && (
                <div style={{
                    position: 'absolute', bottom: 12, left: 12, background: '#0f172a', color: '#e5e7eb',
                    padding: '6px 10px', borderRadius: 8, border: '1px solid #334155'
                }}>
                    กำลังโหลดข้อมูล…
                </div>
            )}
            {error && (
                <div style={{
                    position: 'absolute', bottom: 12, left: 12, background: '#7f1d1d', color: 'white',
                    padding: '6px 10px', borderRadius: 8, border: '1px solid #ef4444'
                }}>
                    โหลดข้อมูลล้มเหลว: {error}
                </div>
            )}
        </div>
    );
}
