
//app/data/adapters/LocalFileAdapter.ts

'use client';

import Fuse from 'fuse.js';
import type { StopRow, StopsQuery, NearestQuery, StopType } from '@/app/types/stops';

function inferType(iconRaw?: string): StopType {
    const s = (iconRaw || '').toLowerCase();
    if (s.includes('bts')) return 'bts';
    if (s.includes('brt')) return 'brt';
    if (s.includes('boat') || s.includes('pier') || s.includes('ferry')) return 'boat';
    if (s.includes('bus')) return 'bus';
    return 'unknown';
}

function parseNamtang(text: string): StopRow[] {
    const lines = text.split(/\r?\n/).filter(Boolean);
    const rows: StopRow[] = [];
    for (const ln of lines) {
        const cols = ln.match(/'([^']*)'/g)?.map(s => s.slice(1, -1)) ?? [];
        if (cols.length < 14) continue;
        const lat = Number(cols[3]); const lng = Number(cols[4]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        rows.push({
            id: cols[0],
            nameTH: cols[1],
            nameEN: cols[2],
            lat, lng,
            addressTH: cols[6] || '',
            addressEN: cols[7] || '',
            icon: cols[13] || '',
        });
    }
    // normalize type once
    rows.forEach(r => r.type = inferType(r.icon));
    return rows;
}

function haversine(a: [number, number], b: [number, number]) {
    const R = 6371e3, toRad = (x: number) => x * Math.PI / 180;
    const dLat = toRad(b[0] - a[0]), dLon = toRad(b[1] - a[1]);
    const aa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(aa)); // meters
}

export class LocalFileAdapter {
    private all: StopRow[] = [];
    private fuse: Fuse<StopRow> | null = null;
    private loaded = false;

    async loadAll(): Promise<StopRow[]> {
        if (this.loaded) return this.all;
        const res = await fetch('/data/namtang-stop.txt', { cache: 'force-cache' });
        if (!res.ok) throw new Error(`Load failed: HTTP ${res.status}`);
        const text = await res.text();
        this.all = parseNamtang(text);
        this.fuse = new Fuse(this.all, {
            includeScore: true,
            threshold: 0.35,
            keys: [
                { name: 'nameTH', weight: 0.5 },
                { name: 'nameEN', weight: 0.4 },
                { name: 'addressTH', weight: 0.3 },
                { name: 'addressEN', weight: 0.3 },
            ],
        });
        this.loaded = true;
        return this.all;
    }

    async query(params: StopsQuery): Promise<StopRow[]> {
        await this.loadAll();
        const { bbox, types, q, district, postcode, limit } = params;
        const tset = new Set((types && types.length ? types : ['bus', 'bts', 'boat', 'brt']).map(s => s.toLowerCase()));

        let base = this.all.filter(r => {
            if (tset.size && !tset.has((r.type || 'unknown').toLowerCase())) return false;
            if (bbox) {
                if (r.lng < bbox.west || r.lng > bbox.east || r.lat < bbox.south || r.lat > bbox.north) return false;
            }
            if (district?.trim()) {
                const d = district.trim().toLowerCase();
                const adr = `${r.addressTH || ''} ${r.addressEN || ''}`.toLowerCase();
                if (!adr.includes(d)) return false;
            }
            if (postcode?.trim()) {
                const pc = postcode.trim();
                const adr = `${r.addressTH || ''} ${r.addressEN || ''}`;
                if (!adr.includes(pc)) return false;
            }
            return true;
        });

        // fuzzy (ถ้ามี q/district/postcode)
        const qStr = [q, district, postcode].filter(Boolean).join(' ').trim();
        if (qStr && this.fuse) {
            const ids = new Set(base.map(b => b.id));
            base = this.fuse.search(qStr).map(r => r.item).filter(it => ids.has(it.id));
        }

        return typeof limit === 'number' ? base.slice(0, Math.max(0, limit)) : base;
    }

    async nearest({ lat, lng, k = 10, withinMeters }: NearestQuery): Promise<StopRow[]> {
        await this.loadAll();
        const me: [number, number] = [lat, lng];
        const ranked = this.all
            .map(r => ({ r, d: haversine(me, [r.lat, r.lng]) }))
            .sort((a, b) => a.d - b.d)
            .filter(x => withinMeters ? x.d <= withinMeters : true)
            .slice(0, k)
            .map(x => x.r);
        return ranked;
    }
}

// ให้ตรงกับ interface
export type { LocalFileAdapter as DefaultStopsAdapter };
