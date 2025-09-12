import PageClient from './PageClient';

// ตั้งค่าที่ต้องอยู่ฝั่งเซิร์ฟเวอร์เท่านั้น
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return <PageClient />;
}
