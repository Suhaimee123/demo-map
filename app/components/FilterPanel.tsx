//components/FilterPanel.tsx

'use client';

import React from 'react';

export type Tag = { key: string; label: string };
export type Mode = 'cluster' | 'heat';

export default function FilterPanel({
    open,
    tags,
    activeKeys,
    onToggleKey,
    onSelectAll,
    onClear,
    mode,
    setMode,
    q,
    setQ,
    onSearch,
    onClose,
    floating = false, // ✅ โหมดลอยบนแผนที่
}: {
    open: boolean;
    tags: Tag[];
    activeKeys: string[];
    onToggleKey: (key: string) => void;
    onSelectAll: () => void;
    onClear: () => void;
    mode: Mode;
    setMode: (m: Mode) => void;
    q: string;
    setQ: (v: string) => void;
    onSearch: () => void;
    onClose?: () => void;
    floating?: boolean;
}) {
    if (!open) return null;

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

    const baseStyle: React.CSSProperties = {
        padding: 12,
        background: '#0f172a',
        color: 'white',
        height: 'auto',
        width: 360,
        border: floating ? '1px solid rgba(255,255,255,.08)' : '1px solid #e5e7eb',
        borderRadius: floating ? 12 : 0,
        boxShadow: floating ? '0 10px 30px rgba(0,0,0,.35)' : 'none',
    };

    return (
        <aside
            style={{
                ...baseStyle,
                position: floating ? 'absolute' : 'relative',
                top: floating ? 12 : undefined,

                zIndex: 1001,
                marginTop: 50,
            }}
        >

            <div style={{ fontWeight: 700, marginBottom: 8 }}>ฟิลเตอร์</div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="ค้นหา สถานที่, ถนน"
                    style={{ flex: 1, padding: '8px 10px', border: '1px solid #334155', borderRadius: 8, background: '#111827', color: 'white' }}
                />
                <button onClick={onSearch} style={btnPrimary}>ค้นหา</button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {tags.map(t => {
                    const active = activeKeys.includes(t.key);
                    return (
                        <button
                            key={t.key}
                            onClick={() => onToggleKey(t.key)}
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
                <button onClick={onSelectAll} style={{ ...btnGhost, marginRight: 6 }}>เลือกทั้งหมด</button>
                <button onClick={onClear} style={btnGhost}>ล้าง</button>
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
    );
}
