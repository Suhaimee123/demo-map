
//app/data/StopsService.ts

'use client';

import type { StopRow, StopsQuery, NearestQuery } from '@/app/types/stops';
import { StopsAdapter } from './StopsAdapter';

export class StopsService {
    constructor(private adapter: StopsAdapter) { }

    loadAll(): Promise<StopRow[]> {
        return this.adapter.loadAll();
    }

    query(q: StopsQuery): Promise<StopRow[]> {
        return this.adapter.query(q);
    }

    nearest(q: NearestQuery): Promise<StopRow[]> {
        return this.adapter.nearest(q);
    }
}
