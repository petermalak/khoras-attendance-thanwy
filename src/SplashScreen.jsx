import Image from 'next/image';

export default function SplashScreen() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fff' }}>
      <Image src="/splash.png" alt="Splash" width={300} height={300} />
    </div>
  );
} 