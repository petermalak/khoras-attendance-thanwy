import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="ar" dir="rtl">
      <Head>
        <link rel="icon" href="/icon/icon.png" />
        <link rel="apple-touch-icon" href="/icon/icon.png" />
        <meta name="theme-color" content="#f9d950" />
        <meta name="description" content="Thanwy Scoring System" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
} 