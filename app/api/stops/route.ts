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

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const q = (searchParams.get('q') || '').trim().toLowerCase();
        const typesParam = (searchParams.get('types') || '').trim(); // "bus,bts,boat,brt"
        const bboxParam = (searchParams.get('bbox') || '').trim(); // "west,south,east,north"

        const types = typesParam ? typesParam.split(',').map(s => s.trim()) : ['bus', 'bts', 'boat', 'brt'];
        const bbox = (() => {
            if (!bboxParam) return null;
            const p = bboxParam.split(',').map(Number);
            if (p.length === 4 && p.every(Number.isFinite)) {
                const [west, south, east, north] = p; return { west, south, east, north };
            }
            return null;
        })();

        const filePath = path.join(process.cwd(), 'public', 'data', 'namtang-stop.txt');
        const text = await fs.readFile(filePath, 'utf8');
        const all = parseNamtangFile(text);

        const filtered = all.filter(r => {
            const icon = (r.icon || '').toLowerCase();
            const typeMatch =
                (types.includes('bus') && /bus/.test(icon)) ||
                (types.includes('bts') && /bts/.test(icon)) ||
                (types.includes('boat') && /boat/.test(icon)) ||
                (types.includes('brt') && /brt/.test(icon));
            if (!typeMatch) return false;

            if (q) {
                const hay = `${r.nameTH} ${r.nameEN} ${r.addressTH || ''} ${r.addressEN || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (bbox) {
                if (r.lng < bbox.west || r.lng > bbox.east || r.lat < bbox.south || r.lat > bbox.north) return false;
            }
            return true;
        });

        return Response.json({ ok: true, count: filtered.length, data: filtered }, { headers: { 'Cache-Control': 'no-store' } });
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
            id: cols[0], nameTH: cols[1], nameEN: cols[2],
            lat, lng, addressTH: cols[6] || '', addressEN: cols[7] || '', icon: cols[13] || '',
        });
    }
    return rows;
}
