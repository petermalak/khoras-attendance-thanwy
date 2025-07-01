import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#8c1d19', // Logo Deep Red
      contrastText: '#fdfcfa', // Logo Off-White
    },
    secondary: {
      main: '#eab368', // Logo Gold
      contrastText: '#44271c', // Logo Brown
    },
    background: {
      default: '#fdfcfa', // Logo Off-White
      paper: '#fff',
    },
    text: {
      primary: '#44271c', // Logo Brown
      secondary: '#8c1d19', // Logo Deep Red
    },
    warning: {
      main: '#eab368', // Logo Gold
    },
    info: {
      main: '#9b7152', // Logo Tan
    },
  },
  typography: {
    fontFamily: 'Cairo, Tahoma, Arial, sans-serif',
  },
});

export default theme; 