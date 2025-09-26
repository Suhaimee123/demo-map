
//app/hooks/useStops.ts
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { StopsQuery, NearestQuery, StopRow } from '@/app/types/stops';
import { StopsService } from '../data/adapters/StopsService';
import { LocalFileAdapter } from '../data/adapters/LocalFileAdapter';

export function useStops() {
    const service = useMemo(() => new StopsService(new LocalFileAdapter()), []);
    const [ready, setReady] = useState(false);
    const [error, setErr] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        service.loadAll()
            .then(() => { if (alive) setReady(true); })
            .catch((e: any) => { if (alive) setErr(e?.message || 'load failed'); });
        return () => { alive = false; };
    }, [service]);

    const runQuery = (q: StopsQuery) => service.query(q);
    const nearest = (q: NearestQuery) => service.nearest(q);

    return { service, ready, error, runQuery, nearest };
}
