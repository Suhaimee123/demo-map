'use client';
import React from 'react';

export type Mode = 'cluster' | 'heat';
export type SearchResult = {
    id: string; nameTH?: string; nameEN?: string; addressTH?: string; addressEN?: string;
    lat: number; lng: number; type: string;
};

export default function FilterPanel({
    open, floating = true,
    mode, setMode,
    activeKeys, setActiveKeys,
    q, setQ,
    resultsCount, results, onResultClick,
    // routing
    start, end,
    pickMode, setPickMode,         // 'none' | 'start' | 'end'
    onUseMyLocation, onSwap, onClear,
    onClose
}: {
    open: boolean; floating?: boolean;
    mode: Mode; setMode: (m: Mode) => void;
    activeKeys: string[]; setActiveKeys: (keys: string[]) => void;
    q: string; setQ: (v: string) => void;
    resultsCount?: number; results?: SearchResult[]; onResultClick?: (r: SearchResult) => void;
    start?: [number, number]; end?: [number, number];
    pickMode: 'none' | 'start' | 'end'; setPickMode: (m: 'none' | 'start' | 'end') => void;
    onUseMyLocation: () => void; onSwap: () => void; onClear: () => void;
    onClose?: () => void;
}) {
    if (!open) return null;

    const btn = (primary = false): React.CSSProperties => ({
        padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
        border: '1px solid ' + (primary ? '#6366f1' : '#334155'),
        background: primary ? '#6366f1' : 'transparent',
        color: primary ? '#fff' : '#e5e7eb'
    });
    const chip = (active: boolean): React.CSSProperties => ({
        padding: '6px 10px', borderRadius: 999, border: '1px solid #334155',
        background: active ? '#6366f1' : 'transparent',
        color: active ? 'white' : '#e5e7eb', cursor: 'pointer', fontSize: 12
    });
    const input: React.CSSProperties = {
        padding: '8px 10px', border: '1px solid #334155', borderRadius: 8, background: '#111827', color: 'white'
    };
    const section: React.CSSProperties = { display: 'grid', gap: 8 };
    const title: React.CSSProperties = { fontWeight: 700, fontSize: 13 };

    const setOnly = (k: string) => setActiveKeys([k]);
    const setAll = () => setActiveKeys(['bus', 'bts', 'boat', 'brt']);

    const fmt = (v?: [number, number]) => v ? `${v[0].toFixed(5)}, ${v[1].toFixed(5)}` : '—';

    return (
        <aside
            style={{
                position: floating ? 'absolute' : 'relative',
                top: floating ? 1 : undefined, left: floating ? 1 : undefined, zIndex: 1001,
                width: 340, padding: 12, display: 'grid', gap: 10,
                background: '#0f172a', color: 'white',
                border: '1px solid rgba(255,255,255,.08)', borderRadius: 12,
                boxShadow: '0 10px 30px rgba(0,0,0,.35)',
            }}
        >
            {/* {onClose && (
                <button onClick={onClose} style={{ position: 'absolute', top: 3, right: 9, ...btn(false), padding: '4px 8px' }}>
                    ปิด
                </button>
            )} */}

            {/* Search */}
            <div style={section}>
                <div style={title}>ค้นหา</div>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="ชื่อไทย/อังกฤษ หรือที่อยู่" style={input} />
            </div>

            {/* Types */}
            <div style={section}>
                <div style={title}>ประเภท</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {['bus', 'bts', 'boat', 'brt'].map(k => {
                        const active = activeKeys.includes(k);
                        return <button key={k} style={chip(active)}
                            onClick={() => setActiveKeys(active ? activeKeys.filter(x => x !== k) : [...activeKeys, k])}>
                            {k.toUpperCase()}
                        </button>;
                    })}
                    <button style={btn(false)} onClick={setAll}>ทั้งหมด</button>
                </div>
            </div>

            {/* Routing super simple */}
            <div style={section}>
                <div style={title}>นำทาง</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                        style={{ ...btn(true), borderColor: pickMode === 'start' ? '#fff' : '#6366f1' }}
                        onClick={() => setPickMode(pickMode === 'start' ? 'none' : 'start')}
                        title="คลิกแล้วไปจิ้มบนแผนที่ 1 ครั้งเพื่อกำหนด Start"
                    >
                        {pickMode === 'start' ? 'กำลังเลือก Start (คลิกแผนที่)' : 'Pick Start'}
                    </button>
                    <button
                        style={{ ...btn(true), borderColor: pickMode === 'end' ? '#fff' : '#6366f1' }}
                        onClick={() => setPickMode(pickMode === 'end' ? 'none' : 'end')}
                        title="คลิกแล้วไปจิ้มบนแผนที่ 1 ครั้งเพื่อกำหนด End"
                    >
                        {pickMode === 'end' ? 'กำลังเลือก End (คลิกแผนที่)' : 'Pick End'}
                    </button>
                    <button style={btn(false)} onClick={onUseMyLocation}>Use My Location</button>
                    <button style={btn(false)} onClick={onSwap}>Swap</button>
                    <button style={btn(false)} onClick={onClear}>Clear</button>
                </div>
                <div style={{ fontSize: 12, opacity: .85 }}>
                    Start: <b>{fmt(start)}</b> &nbsp; | &nbsp; End: <b>{fmt(end)}</b><br />
                    เคล็ดลับ: คลิก “Pick Start/End” แล้วจิ้มบนแผนที่ 1 ครั้ง (คลิกผลลัพธ์ด้านล่าง = ตั้ง End)
                </div>
            </div>

            {/* Results */}
            <div style={section}>
                <div style={{ fontSize: 12, opacity: .8 }}>ผลลัพธ์: <b>{resultsCount ?? 0}</b> จุด</div>
                {!!results?.length && (
                    <div style={{ maxHeight: 240, overflow: 'auto', borderTop: '1px solid #334155', paddingTop: 8 }}>
                        {results.slice(0, 60).map(r => (
                            <div key={r.id}
                                onClick={() => onResultClick && onResultClick(r)}
                                style={{ padding: '6px 8px', borderRadius: 8, cursor: 'pointer', border: '1px solid transparent' }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = '#334155')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                            >
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.nameTH || r.nameEN}</div>
                                <div style={{ fontSize: 12, opacity: .8 }}>{r.addressTH || r.addressEN}</div>
                                <div style={{ fontSize: 11, opacity: .65 }}>ชนิด: {r.type}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Mode */}
            <div style={section}>
                <div style={title}>โหมดแสดงผล</div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setMode('cluster')} style={btn(mode === 'cluster')}>Cluster</button>
                    <button onClick={() => setMode('heat')} style={btn(mode === 'heat')}>Heat</button>
                </div>
            </div>
        </aside>
    );
}
