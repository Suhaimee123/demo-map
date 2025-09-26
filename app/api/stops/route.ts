// app/api/stops/route.ts
import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

type StopRow = {
    id: string; nameTH: string; nameEN: string;
    lat: number; lng: number;
    addressTH?: string; addressEN?: string;
    icon?: string;
};

// ===== in-memory cache =====
let _cache: { mtimeMs: number; rows: StopRow[] } | null = null;

async function loadStopsOnce(): Promise<StopRow[]> {
    const filePath = path.join(process.cwd(), 'public', 'data', 'namtang-stop.txt');
    const stat = await fs.stat(filePath);
    if (_cache && _cache.mtimeMs === stat.mtimeMs) return _cache.rows;
    const text = await fs.readFile(filePath, 'utf8');
    const rows = parseNamtangFile(text);
    _cache = { mtimeMs: stat.mtimeMs, rows };
    return rows;
}

function inferType(iconRaw: string): 'bus' | 'bts' | 'boat' | 'brt' | 'unknown' {
    const s = (iconRaw || '').toLowerCase();
    if (s.includes('bts')) return 'bts';
    if (s.includes('brt')) return 'brt';
    if (s.includes('boat') || s.includes('pier') || s.includes('ferry')) return 'boat';
    if (s.includes('bus')) return 'bus';
    return 'unknown';
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const q = (searchParams.get('q') || '').trim().toLowerCase();

        const typesRaw = searchParams.get('types');
        let types: string[];
        if (typesRaw === null) {
            types = ['bus', 'bts', 'boat', 'brt'];     // ไม่ส่งมาเลย → ดีฟอลต์ทั้งหมด
        } else if (typesRaw.trim() === '') {
            types = [];                                 // ส่งมาเป็นค่าว่าง → ไม่เอาสักประเภท
        } else {
            types = typesRaw.split(',').map(s => s.trim().toLowerCase());
        }

        const bboxParam = (searchParams.get('bbox') || '').trim();
        const bbox = (() => {
            if (!bboxParam) return null;
            const p = bboxParam.split(',').map(Number);
            if (p.length === 4 && p.every(Number.isFinite)) {
                const [west, south, east, north] = p;
                const pad = 1e-6;
                return { west: west - pad, south: south - pad, east: east + pad, north: north + pad };
            }
            return null;
        })();

        const all = await loadStopsOnce();

        const filtered = all.filter(r => {
            if (types.length === 0) return false;
            const t = inferType(r.icon || '');
            if (!types.includes(t)) return false;

            if (q) {
                const hay = `${r.nameTH} ${r.nameEN} ${r.addressTH || ''} ${r.addressEN || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }

            if (bbox) {
                if (r.lng < bbox.west || r.lng > bbox.east || r.lat < bbox.south || r.lat > bbox.north) return false;
            }
            return true;
        });

        return Response.json(
            { ok: true, count: filtered.length, data: filtered },
            { headers: { 'Cache-Control': 'no-store' } }
        );
    } catch (e: any) {
        return Response.json({ ok: false, error: e?.message || 'unknown error' }, { status: 500 });
    }
}

function parseNamtangFile(text: string): StopRow[] {
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
    return rows;
}
