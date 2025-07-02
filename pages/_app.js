import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../src/theme';
import Head from 'next/head';
import '../styles/globals.css';
import Header from '../src/components/Header';
import { LoadingProvider } from '../src/CombinedApp';

export default function MyApp({ Component, pageProps }) {
  return (
    <ThemeProvider theme={theme}>
      <LoadingProvider>
        <Head>
          <title>Thanwy Attendance System</title>
          <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
          <link rel="icon" href="/icon/icon.png" />
        </Head>
        <CssBaseline />
        <Header />
        <Component {...pageProps} />
      </LoadingProvider>
    </ThemeProvider>
  );
} 