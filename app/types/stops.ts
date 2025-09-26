// app/types/stops.ts
// Domain types + query shape
export type StopType = 'bus' | 'bts' | 'boat' | 'brt' | 'unknown';

export type StopRow = {
    id: string;
    nameTH: string;
    nameEN: string;
    lat: number;
    lng: number;
    addressTH?: string;
    addressEN?: string;
    icon?: string;        // raw icon (e.g. "bts.png")
    type?: StopType;      // normalized type (derived from icon)
};

export type Bounds = { west: number; south: number; east: number; north: number };

export type StopsQuery = {
    bbox?: Bounds;
    types?: StopType[];          // default: all
    q?: string;                  // fuzzy keyword (th/en/address)
    district?: string;
    postcode?: string;
    limit?: number;              // for list/preview
};

export type NearestQuery = {
    lat: number; lng: number; k?: number; withinMeters?: number;
};
