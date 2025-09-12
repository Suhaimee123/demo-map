import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

type Row = {
    id_depart: string;
    Ministry: string;
    Address: string;
    Department: string;
    Agency: string;
    dcode: string;
    dname: string;
    Lat: string;
    Long: string;
};

export async function GET() {
    const filePath = path.join(process.cwd(), 'public', 'health_facilities_th.csv'); // <- ชื่อไฟล์
    const csv = fs.readFileSync(filePath, 'utf8');

    const parsed = Papa.parse<Row>(csv, { header: true, skipEmptyLines: true });
    const points = (parsed.data || [])
        .map((r) => {
            const lat = Number(r.Lat);
            const lng = Number(r.Long);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            // กำหนด weight สำหรับ Heatmap (คงที่ 0.8; ปรับได้จาก query ถ้าต้องการ)
            const weight = 0.8;

            const popupHtml = `
        <div style="max-width:260px">
          <b>${r.Ministry}</b><br/>
          ${r.Address}<br/>
          กระทรวง: ${r.Department || '-'}<br/>
          หน่วยงาน: ${r.Agency || '-'}<br/>
        </div>
      `;

            return { lat, lng, weight, popupHtml };
        })
        .filter(Boolean);

    return NextResponse.json({ data: points });
}
