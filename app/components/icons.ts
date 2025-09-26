'use client';
import type * as LNS from 'leaflet';

let L: typeof LNS | null = null;
if (typeof window !== 'undefined') {
    L = require('leaflet');
}

export type StopType = 'bus' | 'bts' | 'boat' | 'brt' | 'unknown';

export function inferType(iconRaw?: string): StopType {
    const s = (iconRaw || '').toLowerCase();
    if (s.includes('bts')) return 'bts';
    if (s.includes('brt')) return 'brt';
    if (s.includes('boat') || s.includes('pier') || s.includes('ferry')) return 'boat';
    if (s.includes('bus')) return 'bus';
    return 'unknown';
}

// ---- icon cache + fallback ----
const iconCache: Record<StopType, LNS.Icon | LNS.DivIcon | undefined> = {
    bus: undefined, bts: undefined, boat: undefined, brt: undefined, unknown: undefined
};

function makeDivIcon(color: string, label?: string) {
    if (!L) return undefined;
    const size = 26;
    const html =
        `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};
      display:flex;align-items:center;justify-content:center;color:#fff;
      font-weight:700;font-size:11px;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.25)">
      ${label ? label : ''}
     </div>`;
    return L.divIcon({ html, className: '', iconSize: [size, size] });
}

export function iconForType(t: StopType): LNS.Icon | LNS.DivIcon | undefined {
    if (!L) return undefined;

    // ถ้าเคยสร้างแล้ว คืนจาก cache
    if (iconCache[t]) return iconCache[t];

    // พยายามใช้ไฟล์จาก /public/icons/{type}.png
    const url = `/icons/${t}.png`;
    const tryImg = L.icon({
        iconUrl: url,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
        popupAnchor: [0, -22],
        shadowUrl: undefined,
    });

    // เราไม่สามารถตรวจ 404 ที่นี่ได้ แต่ถ้าไฟล์หาย Leaflet จะพยายามโหลดแล้วไม่แสดงภาพ
    // ดังนั้นเราจะเตรียม fallback DivIcon เผื่อผู้ใช้ไม่มีไฟล์ไอคอน
    const colorByType: Record<StopType, string> = {
        bus: '#ef4444',    // แดง
        bts: '#3b82f6',    // น้ำเงิน
        boat: '#10b981',   // เขียว
        brt: '#f59e0b',    // ส้ม
        unknown: '#6366f1' // ม่วง
    };
    const labelByType: Record<StopType, string> = {
        bus: 'B', bts: 'T', boat: '⛵', brt: 'R', unknown: '?'
    };

    // เก็บเป็น “combo” โดยให้ React-Leaflet ใช้ไฟล์ภาพก่อน
    // ถ้าไฟล์มีอยู่ => เห็นเป็นรูป png
    // ถ้าไฟล์ไม่มี => ผู้ใช้จะเห็น DivIcon หลังจากคุณเปลี่ยนไปใช้ getPointIcon แบบมี fallback (ดูใน ClusterLayer)
    // ที่ระดับ API ของ Marker เลือกอย่างใดอย่างหนึ่ง เราจะจัดการใน ClusterLayer (ถ้ารูปไม่ขึ้น ให้ใช้ DivIcon)
    iconCache[t] = tryImg;
    // เก็บ fallback ใว้ใน cache แยก (แนบเป็น property)
    (iconCache as any)[`${t}_fallback`] = makeDivIcon(colorByType[t], labelByType[t]);

    return iconCache[t];
}

// ให้เอา fallback มาคู่กัน
export function fallbackDivIconForType(t: StopType): LNS.DivIcon | undefined {
    return (iconCache as any)[`${t}_fallback`];
}
