import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#8B1A1A', // Deep Red
      contrastText: '#fff',
    },
    secondary: {
      main: '#F9D950', // Gold
      contrastText: '#3B1F0B',
    },
    background: {
      default: '#F9F5E1', // Cream
      paper: '#FFFFFF',   // White
    },
    text: {
      primary: '#3B1F0B', // Dark Brown
      secondary: '#8B1A1A', // Deep Red
    },
    warning: {
      main: '#D97B29', // Muted Orange
    },
    info: {
      main: '#F4C6A5', // Peach
    },
  },
  typography: {
    fontFamily: 'Cairo, Tahoma, Arial, sans-serif',
  },
});

export default theme; 