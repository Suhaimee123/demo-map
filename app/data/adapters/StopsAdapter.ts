//app/data/adapters/StopsAdapter.ts

import type { StopRow, StopsQuery, NearestQuery } from '@/app/types/stops';

export interface StopsAdapter {
    // load all or run query (adapter decides)
    loadAll(): Promise<StopRow[]>;
    query(params: StopsQuery): Promise<StopRow[]>;
    nearest(params: NearestQuery): Promise<StopRow[]>;
}
