// app/PageClient.tsx
'use client';

import dynamic from 'next/dynamic';

// โหลดตัวแผนที่แบบ client-only ป้องกัน SSR แตะ window
const MapShell = dynamic(() => import('./MapShell'), { ssr: false });

export default function PageClient() {
    return <MapShell />;
}
