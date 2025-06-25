import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  CircularProgress,
  Alert,
  IconButton,
  TablePagination,
  InputAdornment,
  Button,
  Snackbar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import HomeIcon from '@mui/icons-material/Home';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import Link from 'next/link';

export default function AttendanceView() {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [giftSuccess, setGiftSuccess] = useState(false);
  const [giftError, setGiftError] = useState(null);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/attendance-records');
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setHeaders(result.headers);
      setData(result.data);
    } catch (err) {
      setError('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGiftClick = async (name) => {
    try {
      const response = await fetch('/api/attendance-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) throw new Error('Failed to update gift count');
      
      setGiftSuccess(true);
      fetchData(); // Refresh data
    } catch (err) {
      setGiftError('حدث خطأ أثناء تحديث عدد الهدايا');
    }
  };

  const filteredData = data.filter(row => {
    const searchStr = searchTerm.toLowerCase();
    return Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchStr)
    );
  });

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const renderCellContent = (value, header) => {
    if (header === 'الاسم' || header === 'مجموع الحضور' || header === 'كام مره اخد هدية') {
      return value;
    }
    const isDateColumn = /[\d/]/.test(header);
    if (isDateColumn && value === '1') {
      return <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>حضر</span>;
    }
    return value || '';
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f9f5e1'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, backgroundColor: '#f9f5e1', minHeight: '100vh' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: '#f9f5e1', 
      minHeight: '100vh'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Typography variant="h4" component="h1" sx={{ color: 'primary.main' }}>
          سجل الحضور
        </Typography>
        <Link href="/" passHref>
          <IconButton 
            color="primary" 
            component="a"
            sx={{ 
              backgroundColor: 'white',
              '&:hover': { backgroundColor: '#f5f5f5' }
            }}
          >
            <HomeIcon />
          </IconButton>
        </Link>
      </Box>

      <Paper 
        sx={{ 
          width: '100%', 
          mb: 2, 
          backgroundColor: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
        }}
      >
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <TableContainer>
          <Table 
            stickyHeader 
            sx={{
              borderCollapse: 'separate',
              borderSpacing: 0,
              '& th, & td': {
                borderRight: '1px solid rgba(224, 224, 224, 1)',
                borderBottom: '1px solid rgba(224, 224, 224, 1)',
                '&:last-child': {
                  borderRight: 'none'
                }
              }
            }}
          >
            <TableHead>
              <TableRow>
                {headers.filter(header => header !== 'تواريخ_الهدايا').map((header, index) => (
                  <TableCell 
                    key={index}
                    align="center"
                    sx={{ 
                      fontWeight: 'bold',
                      backgroundColor: 'primary.main',
                      color: 'white',
                      borderBottom: '2px solid #1976d2',
                      fontSize: '0.95rem',
                      padding: '16px 8px',
                      '&:first-of-type': {
                        borderRight: 'none',
                        borderTopLeftRadius: '8px',
                      },
                      '&:last-child': {
                        borderTopRightRadius: '8px',
                      }
                    }}
                  >
                    {header}
                  </TableCell>
                ))}
                <TableCell 
                  align="center"
                  sx={{ 
                    fontWeight: 'bold',
                    backgroundColor: 'primary.main',
                    color: 'white',
                    borderBottom: '2px solid #1976d2',
                    fontSize: '0.95rem',
                    padding: '16px 8px',
                    borderTopRightRadius: '8px',
                  }}
                >
                  الإجراءات
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, rowIndex) => (
                  <TableRow 
                    key={rowIndex} 
                    hover
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.04)'
                      },
                      backgroundColor: row.consecutive_attendance >= 3 && row.has_unrewarded_consecutive 
                        ? 'rgba(46, 125, 50, 0.1)' 
                        : 'inherit'
                    }}
                  >
                    {headers.filter(header => header !== 'تواريخ_الهدايا').map((header, cellIndex) => (
                      <TableCell 
                        key={cellIndex}
                        align="center"
                        sx={{
                          color: header === 'الاسم' ? 'primary.main' : 'inherit',
                          fontWeight: header === 'الاسم' || header === 'مجموع الحضور' ? 'bold' : 'normal',
                          padding: '12px 8px',
                          fontSize: '0.9rem',
                          backgroundColor: header === 'مجموع الحضور' ? 'rgba(25, 118, 210, 0.04)' : 'inherit'
                        }}
                      >
                        {renderCellContent(row[header], header)}
                      </TableCell>
                    ))}
                    <TableCell align="center">
                      {row.consecutive_attendance >= 3 && row.has_unrewarded_consecutive && (
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CardGiftcardIcon />}
                          onClick={() => handleGiftClick(row['الاسم'])}
                          sx={{ minWidth: '120px' }}
                        >
                          تسجيل هدية
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filteredData.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="عدد الصفوف في الصفحة:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
          }
          sx={{
            borderTop: '1px solid rgba(224, 224, 224, 1)',
            backgroundColor: 'rgba(25, 118, 210, 0.02)'
          }}
        />
      </Paper>

      <Snackbar
        open={giftSuccess}
        autoHideDuration={3000}
        onClose={() => setGiftSuccess(false)}
        message="تم تحديث عدد الهدايا بنجاح"
        sx={{
          '& .MuiSnackbarContent-root': {
            backgroundColor: '#2e7d32',
            borderRadius: '8px'
          }
        }}
      />
      
      <Snackbar
        open={!!giftError}
        autoHideDuration={3000}
        onClose={() => setGiftError(null)}
      >
        <Alert 
          severity="error" 
          onClose={() => setGiftError(null)}
          sx={{
            borderRadius: '8px',
            width: '100%'
          }}
        >
          {giftError}
        </Alert>
      </Snackbar>
    </Box>
  );
} 