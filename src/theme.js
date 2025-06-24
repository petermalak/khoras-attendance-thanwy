import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#f9d950',
    },
    text: {
      primary: '#000000',
    },
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
  },
  direction: 'rtl',
});

export default theme; 