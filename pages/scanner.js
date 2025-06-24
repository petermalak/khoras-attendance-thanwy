import dynamic from 'next/dynamic';

const QrScanner = dynamic(() => import('../src/QrScanner'), { ssr: false });

export default function Scanner() {
  return <QrScanner />;
} 