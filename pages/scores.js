import dynamic from 'next/dynamic';

const ScoresView = dynamic(() => import('../src/ScoresView'), { ssr: false });

export default function Scores() {
  return <ScoresView />;
} 