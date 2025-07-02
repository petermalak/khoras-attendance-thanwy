import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLoading } from '../CombinedApp';

const navLinks = [
  { name: 'الصفحة الرئيسية', href: '/' },
  { name: 'عرض الحضور', href: '/attendance-view' },
  { name: 'عرض الافتقاد', href: '/iftikad-view' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef();
  const { loading: globalLoading } = useLoading();
  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);
  // Trap focus in menu
  useEffect(() => {
    if (!open) return;
    const focusable = menuRef.current?.querySelectorAll('a,button');
    if (!focusable?.length) return;
    const first = focusable[0], last = focusable[focusable.length-1];
    function trap(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', trap);
    first.focus();
    return () => document.removeEventListener('keydown', trap);
  }, [open]);
  return (
    <header style={{
      width: '100%',
      background: 'transparent',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'none',
    }}>
      {globalLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: 4,
          background: 'linear-gradient(90deg, #eab368 0%, #8c1d19 100%)',
          animation: 'header-progress-bar 1.2s linear infinite',
          zIndex: 2000,
        }} />
      )}
      <nav style={{
        maxWidth: 1100,
        margin: '1.5rem auto 0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 1.5rem',
        borderRadius: 18,
        background: '#8c1d19',
        boxShadow: '0 4px 24px #44271c22',
        minHeight: 64,
        position: 'relative',
      }}>
        <Link href="/" legacyBehavior>
          <a style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: '#fdfcfa', fontWeight: 900, fontSize: '1.25rem', letterSpacing: 1, fontFamily: "'Tajawal', 'Cairo', 'Segoe UI', 'Arial', 'sans-serif'" }} aria-label="الصفحة الرئيسية">
            <Image src="/icon/icon.png" alt="شعار" width={40} height={40} style={{ borderRadius: 10, background: '#fff', boxShadow: '0 2px 8px #44271c22' }} />
            <span style={{marginRight: 4}}>نظام الحضور والافتقاد</span>
          </a>
        </Link>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: '#fdfcfa',
            fontSize: 32,
            cursor: 'pointer',
            marginRight: 8,
            transition: 'color 0.2s',
          }}
          className="header-hamburger"
          aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={open}
        >
          {open ? '×' : '☰'}
        </button>
        <ul
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            listStyle: 'none',
            margin: 0,
            padding: 0,
            fontSize: '1.08rem',
            fontWeight: 600,
            direction: 'rtl',
            transition: 'all 0.3s',
          }}
          className="header-nav"
        >
          {navLinks.map(link => (
            <li key={link.href} style={{ position: 'relative' }}>
              <Link href={link.href} legacyBehavior>
                <a
                  style={{
                    color: '#fdfcfa',
                    textDecoration: 'none',
                    padding: '8px 0',
                    borderBottom: '2.5px solid transparent',
                    borderRadius: 4,
                    transition: 'color 0.18s, border 0.18s, background 0.18s',
                    display: 'inline-block',
                  }}
                  onMouseOver={e => { e.currentTarget.style.color = '#eab368'; e.currentTarget.style.background = '#44271c11'; }}
                  onMouseOut={e => { e.currentTarget.style.color = '#fdfcfa'; e.currentTarget.style.background = 'transparent'; }}
                  tabIndex={0}
                >
                  {link.name}
                </a>
              </Link>
            </li>
          ))}
        </ul>
        {/* Mobile overlay menu */}
        {open && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(68,39,28,0.18)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            transition: 'background 0.3s',
          }}>
            <div ref={menuRef} style={{
              marginTop: 24,
              background: '#fff',
              borderRadius: 18,
              boxShadow: '0 8px 32px #44271c33',
              minWidth: 260,
              maxWidth: 340,
              width: '90vw',
              padding: '2rem 1.5rem 1.5rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              animation: 'slideDownMenu 0.35s cubic-bezier(.4,1.6,.6,1)'
            }}>
              <button onClick={() => setOpen(false)} aria-label="إغلاق القائمة" style={{ position: 'absolute', top: 12, left: 12, background: 'none', border: 'none', color: '#8c1d19', fontSize: 32, cursor: 'pointer', fontWeight: 700, lineHeight: 1 }} tabIndex={0}>×</button>
              <Link href="/" legacyBehavior>
                <a onClick={()=>setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#8c1d19', fontWeight: 900, fontSize: '1.15rem', marginBottom: 24 }} tabIndex={0}>
                  <Image src="/icon/icon.png" alt="شعار" width={36} height={36} style={{ borderRadius: 8, background: '#fff', boxShadow: '0 2px 8px #44271c22' }} />
                  <span>نظام الحضور والافتقاد</span>
                </a>
              </Link>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, width: '100%' }}>
                {navLinks.map(link => (
                  <li key={link.href} style={{ marginBottom: 12 }}>
                    <Link href={link.href} legacyBehavior>
                      <a
                        onClick={()=>setOpen(false)}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '14px 0',
                          borderRadius: 8,
                          color: '#8c1d19',
                          background: '#fdfcfa',
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '1.08rem',
                          textDecoration: 'none',
                          boxShadow: '0 1px 4px #eab36822',
                          border: '2px solid transparent',
                          transition: 'background 0.18s, color 0.18s, border 0.18s',
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = '#eab36822'; e.currentTarget.style.color = '#44271c'; e.currentTarget.style.border = '2px solid #eab368'; }}
                        onMouseOut={e => { e.currentTarget.style.background = '#fdfcfa'; e.currentTarget.style.color = '#8c1d19'; e.currentTarget.style.border = '2px solid transparent'; }}
                        tabIndex={0}
                      >
                        {link.name}
                      </a>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </nav>
      <div style={{height: 8}}></div>
      <div style={{maxWidth: 1100, margin: '0 auto', borderBottom: '1.5px solid #eab36822', borderRadius: 12}}></div>
      <style jsx global>{`
        @media (max-width: 700px) {
          .header-nav {
            display: none !important;
          }
          .header-hamburger {
            display: block !important;
          }
          nav {
            justify-content: center !important;
          }
        }
        @keyframes slideDownMenu {
          0% { opacity: 0; transform: translateY(-40px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes header-progress-bar {
          0% { left: -100%; width: 100%; }
          50% { left: 0; width: 100%; }
          100% { left: 100%; width: 10%; }
        }
      `}</style>
    </header>
  );
} 