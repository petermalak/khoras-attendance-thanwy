import React, { useState } from 'react';
import Link from 'next/link';

const navLinks = [
  { name: 'الصفحة الرئيسية', href: '/' },
  { name: 'عرض الحضور', href: '/attendance-view' },
  { name: 'عرض الافتقاد', href: '/iftikad-view' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header style={{
      width: '100%',
      background: '#8c1d19',
      color: '#fdfcfa',
      boxShadow: '0 2px 8px #44271c22',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <nav style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 1.5rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ fontWeight: 900, fontSize: '1.3rem', letterSpacing: 1, fontFamily: "'Tajawal', 'Cairo', 'Segoe UI', 'Arial', 'sans-serif'" }}>
          نظام الحضور والافتقاد
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: '#fdfcfa',
            fontSize: 28,
            cursor: 'pointer',
            marginRight: 8,
          }}
          className="header-hamburger"
          aria-label="فتح القائمة"
        >
          ☰
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
          }}
          className="header-nav"
        >
          {navLinks.map(link => (
            <li key={link.href}>
              <Link href={link.href} legacyBehavior>
                <a style={{ color: '#fdfcfa', textDecoration: 'none', padding: '8px 0', borderBottom: '2px solid transparent', transition: 'border 0.2s' }}>
                  {link.name}
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <style jsx global>{`
        @media (max-width: 700px) {
          .header-nav {
            display: ${open ? 'flex' : 'none'} !important;
            flex-direction: column;
            gap: 0;
            background: #8c1d19 !important;
            position: absolute;
            top: 56px;
            right: 0;
            left: 0;
            z-index: 100;
            box-shadow: 0 2px 8px #44271c22;
          }
          .header-nav li {
            border-bottom: 1px solid #9b7152;
            text-align: center;
          }
          .header-hamburger {
            display: block !important;
          }
        }
      `}</style>
    </header>
  );
} 