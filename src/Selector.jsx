import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper,
  CircularProgress, Alert,
  Button, TextField,
  List, ListItem, ListItemText,
  ListItemSecondaryAction, IconButton,
  Divider, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem,
  Grid, Snackbar,
  InputAdornment,
  Tooltip,
  Fab,
  LinearProgress,
  Autocomplete
} from '@mui/material';
import { useRouter } from 'next/router';
import { 
  Delete as DeleteIcon, 
  Construction as ConstructionIcon, 
  Add as AddIcon,
  Sync as SyncIcon,
  QrCodeScanner as QrCodeIcon,
  ListAlt as ListAltIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';

const Selector = () => {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);
  const [selectedValue, setSelectedValue] = useState("");
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentUpdate, setCurrentUpdate] = useState(0);
  const [processedUsers, setProcessedUsers] = useState({});
  const [headers, setHeaders] = useState(null);
  const [headersLastUpdated, setHeadersLastUpdated] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueue, setSyncQueue] = useState([]);
  const [lastSyncAttempt, setLastSyncAttempt] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'queued' | 'error'
  const [syncError, setSyncError] = useState(null);
  const router = useRouter();

  // Hardcoded headers
  const HEADERS = ['ID', 'CodeValue', 'Name', 'Class', 'Team', 'Score'];

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const response = await fetch("/api/codes");
        if (!response.ok) {
          throw new Error("Failed to fetch codes");
        }
        const data = await response.json();
        console.log('Fetched codes:', data); // Debug log
        if (Array.isArray(data)) {
          setCodes(data);
        } else {
          console.error('Invalid data format received:', data);
          setCodes([]);
        }
      } catch (error) {
        console.error("Error fetching codes:", error);
        setError("حدث خطأ أثناء جلب الأكواد");
        setCodes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCodes();
  }, []);

  // Initialize online status after mount
  useEffect(() => {
    setIsOnline(navigator.onLine);
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (syncQueue.length > 0) {
        handleSyncQueue();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue]);

  // Function to get headers with caching
  const getHeadersWithCache = async () => {
    // Check if we have valid cached headers (less than 5 minutes old)
    if (headers && headersLastUpdated) {
      const cacheAge = new Date() - new Date(headersLastUpdated);
      if (cacheAge < 5 * 60 * 1000) { // 5 minutes
        return headers;
      }
    }

    // If no valid cache, fetch headers
    try {
      const response = await fetch('/api/headers/');
      if (!response.ok) {
        throw new Error('Failed to fetch headers');
      }
      const data = await response.json();
      
      // Update cache
      setHeaders(data);
      setHeadersLastUpdated(new Date().toISOString());
      
      return data;
    } catch (error) {
      console.error('Error fetching headers:', error);
      return null;
    }
  };

  // Filter codes based on search query
  const filteredCodes = codes.filter(code => {
    const searchLower = searchQuery.toLowerCase();
    return (
      code.code.toLowerCase().includes(searchLower) ||
      code.name.toLowerCase().includes(searchLower) ||
      code.class.toLowerCase().includes(searchLower)
    );
  });

  // Check if a code is already selected
  const isCodeSelected = (code) => {
    return pendingUpdates.some(update => update.qrCode === code.code);
  };

  const handleCodeChange = (event, newValue) => {
    setSelectedCode(newValue);
  };

  const handleValueChange = (event) => {
    setSelectedValue(event.target.value);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleAddCode = () => {
    if (selectedCode && selectedValue && !isCodeSelected(selectedCode)) {
      setPendingUpdates(prev => [...prev, {
        qrCode: selectedCode.code,
        selectedValue: parseInt(selectedValue, 10),
        timestamp: new Date().toISOString()
      }]);
      setSelectedCode(null);
      setSelectedValue("");
    }
  };

  const handleRemoveCode = (codeToRemove) => {
    setPendingUpdates(prev => prev.filter(update => update.qrCode !== codeToRemove));
  };

  const handleCloseSnackbar = () => {
    setError(null);
    setSuccess(false);
  };

  const handleSyncQueue = async () => {
    if (!isOnline || syncQueue.length === 0) return;

    setSyncing(true);
    setProgress(0);
    setCurrentUpdate(0);
    setProcessedUsers({});

    try {
      // Process each update in the queue
      for (let i = 0; i < syncQueue.length; i++) {
        const update = syncQueue[i];
        setCurrentUpdate(i + 1);
        setProgress((i / syncQueue.length) * 100);

        const response = await fetch('/api/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            updates: [{
              qrCode: update.qrCode,
              selectedValue: update.selectedValue
            }]
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to submit score');
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || 'Failed to submit score');
        }

        // Update processed users cache
        setProcessedUsers(prev => ({
          ...prev,
          [update.qrCode]: {
            ...result.data,
            lastUpdated: new Date().toISOString()
          }
        }));
      }

      // All updates processed successfully
      setSuccess(true);
      setSyncQueue([]);
      setProcessedUsers({});
      setProgress(100);
      setCurrentUpdate(0);
      setSyncStatus('idle');
    } catch (error) {
      console.error('Error syncing updates:', error);
      setSyncError(error.message);
      setSyncStatus('error');
      // Keep failed updates in queue
      setSyncQueue(prev => prev.slice(currentUpdate));
    } finally {
      setSyncing(false);
    }
  };

  const syncUpdates = async () => {
    if (pendingUpdates.length === 0) return;

    if (!isOnline) {
      setSyncQueue(prev => [...prev, ...pendingUpdates]);
      setSyncStatus('queued');
      setPendingUpdates([]);
      return;
    }

    setSyncing(true);
    setProgress(0);
    setCurrentUpdate(0);
    setProcessedUsers({});

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updates: pendingUpdates.map(update => ({
            qrCode: update.qrCode,
            selectedValue: update.selectedValue
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit score');
      }

      const result = await response.json();
      
      if (result.success) {
        setSuccess(true);
        setPendingUpdates([]);
        setProcessedUsers({});
        setProgress(100);
        setCurrentUpdate(0);
        setSyncStatus('idle');
      } else {
        throw new Error(result.message || 'Failed to submit score');
      }
    } catch (error) {
      console.error('Error syncing updates:', error);
      setSyncError(error.message);
      setSyncStatus('error');
      setSyncQueue(prev => [...prev, ...pendingUpdates]);
      setPendingUpdates([]);
    } finally {
      setSyncing(false);
    }
  };

  // Function to get user data (either from cache or API)
  const getUserData = async (qrCode) => {
    // Check cache first
    const cachedData = processedUsers[qrCode];
    if (cachedData) {
      // Check if cache is still valid (less than 5 minutes old)
      const cacheAge = new Date() - new Date(cachedData.lastUpdated);
      if (cacheAge < 5 * 60 * 1000) { // 5 minutes
        return cachedData;
      }
    }

    // If not in cache or cache expired, fetch from API
    try {
      const response = await fetch(`/api/user/${qrCode}/`);
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      const data = await response.json();
      
      // Update cache
      setProcessedUsers(prev => ({
        ...prev,
        [qrCode]: {
          ...data,
          lastUpdated: new Date().toISOString()
        }
      }));
      
      return data;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  const buildInfoRow = (label, value, isBold = false) => (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      py: 1,
      '& > *': {
        fontWeight: isBold ? 'bold' : 'normal',
        fontSize: '1rem'
      }
    }}>
      <Typography>{label}</Typography>
      <Typography>{value}</Typography>
    </Box>
  );

  return (
    <Box sx={{ 
      maxWidth: 800, 
      margin: "auto", 
      p: 3,
      backgroundColor: '#f9f5e1',
      minHeight: '100vh',
      position: 'relative'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<QrCodeIcon />}
          onClick={() => router.push('/scanner')}
          sx={{
            bgcolor: '#2e7d32',
            color: '#fff',
            '&:hover': {
              bgcolor: '#2e7d32',
              opacity: 0.9
            }
          }}
        >
          ماسح QR
        </Button>
      </Box>

      {syncing && (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: 'white',
            borderRadius: 2,
            border: '1px solid rgba(46, 125, 50, 0.1)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" color="text.secondary" sx={{ flex: 1 }}>
              جاري المعالجة
            </Typography>
            <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 'bold' }}>
              {currentUpdate} من {pendingUpdates.length}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ 
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(46, 125, 50, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#2e7d32',
                borderRadius: 4,
                transition: 'transform 0.4s linear'
              }
            }}
          />
          <Typography 
            variant="body2" 
            color="text.secondary" 
            align="center" 
            sx={{ mt: 1 }}
          >
            {Math.round(progress)}%
          </Typography>
        </Paper>
      )}

      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom 
        align="center" 
        sx={{ color: '#2e7d32', mb: 4 }}
      >
        إضافة النقاط
      </Typography>

      {/* Network Status and Error Messages */}
      <AnimatePresence>
        {syncError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert 
              severity="error" 
              onClose={() => setSyncError(null)}
              sx={{ mb: 2 }}
            >
              {syncError}
            </Alert>
          </motion.div>
        )}
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert 
              severity="warning" 
              sx={{ mb: 2 }}
            >
              أنت غير متصل بالإنترنت. سيتم حفظ التحديثات وتنفيذها عند عودة الاتصال.
            </Alert>
          </motion.div>
        )}
        {syncStatus === 'queued' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert 
              severity="info" 
              sx={{ mb: 2 }}
            >
              لديك {syncQueue.length} تحديثات في الانتظار. سيتم تنفيذها عند عودة الاتصال.
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              backgroundColor: 'white',
              height: '100%'
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2,
                color: '#000000',
                fontWeight: 'bold'
              }}
            >
              إضافة كود جديد
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            ) : (
              <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <Autocomplete
                    value={selectedCode}
                    onChange={handleCodeChange}
                    options={codes.filter(code => !isCodeSelected(code))}
                    getOptionLabel={(option) => `${option.code}`}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="اختر الكود"
                        sx={{ textAlign: "right" }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body1">
                            {option.code}
                          </Typography>
                        </Box>
                      </li>
                    )}
                    isOptionEqualToValue={(option, value) => option.code === value.code}
                    noOptionsText="لا توجد نتائج"
                    loadingText="جاري التحميل..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: 'rgba(0, 0, 0, 0.23)',
                        },
                        '&:hover fieldset': {
                          borderColor: '#f9d950',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#f9d950',
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: '#f9d950',
                      },
                    }}
                  />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>اختيار النقاط</InputLabel>
                  <Select
                    value={selectedValue}
                    onChange={handleValueChange}
                    label="اختيار النقاط"
                    sx={{
                      bgcolor: 'white',
                      borderRadius: 2
                    }}
                  >
                    <MenuItem value="50">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ConstructionIcon sx={{ color: 'yellow' }} />
                        <Typography>حضور اول ١٠ دقايق = ٥٠ طوبة</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="25">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ConstructionIcon sx={{ color: 'yellow' }} />
                        <Typography>حضور تاني ١٠ دقايق = ٢٥ طوبة</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="10">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ConstructionIcon sx={{ color: 'yellow' }} />
                        <Typography>مشاركة في الموضوع = ١٠ طوبات</Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  onClick={handleAddCode}
                  disabled={!selectedCode || !selectedValue}
                  fullWidth
                  startIcon={<AddIcon />}
                  sx={{
                    bgcolor: '#f9d950',
                    color: '#000000',
                    '&:hover': {
                      bgcolor: '#f9d950',
                      opacity: 0.9
                    }
                  }}
                >
                  إضافة إلى القائمة
                </Button>
              </>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              backgroundColor: 'white',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#000000',
                  fontWeight: 'bold'
                }}
              >
                الكودات المختارة ({pendingUpdates.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<SyncIcon />}
                onClick={syncUpdates}
                disabled={syncing || pendingUpdates.length === 0}
                sx={{
                  bgcolor: '#f9d950',
                  color: '#000000',
                  '&:hover': {
                    bgcolor: '#f9d950',
                    opacity: 0.9
                  }
                }}
              >
                {syncing ? (
                  <>
                    <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                    جاري المزامنة...
                  </>
                ) : !isOnline ? (
                  'حفظ في الانتظار'
                ) : (
                  'مزامنة الكل'
                )}
              </Button>
            </Box>

            {pendingUpdates.length === 0 ? (
              <Box 
                sx={{ 
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary'
                }}
              >
                <Typography>لا توجد كودات مختارة</Typography>
              </Box>
            ) : (
              <>
                <List sx={{ flex: 1, overflow: 'auto' }}>
                  {pendingUpdates.map((update, index) => (
                    <React.Fragment key={update.qrCode}>
                      <ListItem>
                        <ListItemText 
                          primary={update.qrCode}
                          secondary={`النقاط: ${update.selectedValue} طوبة`}
                          primaryTypographyProps={{
                            dir: 'rtl',
                            sx: { fontWeight: 'medium' }
                          }}
                          secondaryTypographyProps={{
                            dir: 'rtl'
                          }}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => handleRemoveCode(update.qrCode)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < pendingUpdates.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {apiResponse && (
        <Card sx={{ mt: 3, borderRadius: 2 }}>
          <CardContent>
            <Typography 
              variant="h6" 
              align="center" 
              sx={{ 
                color: 'success.main',
                fontWeight: 'bold',
                mb: 2
              }}
            >
              تم تسجيل النقاط بنجاح
            </Typography>
            {buildInfoRow("الاسم:", apiResponse.data.name)}
            {buildInfoRow("الفصل:", apiResponse.data.class)}
            {buildInfoRow("الفريق:", apiResponse.data.team)}
            <Divider sx={{ my: 2 }} />
            {buildInfoRow("النقاط السابقة:", `${apiResponse.data.oldScore} طوبة`, true)}
            {buildInfoRow("النقاط الجديدة:", `${apiResponse.data.newScore} طوبة`, true)}
            <Typography 
              align="center" 
              sx={{ 
                mt: 2,
                color: 'primary.main',
                fontWeight: 'bold'
              }}
            >
              تم إضافة {apiResponse.data.pointsAdded} طوبة
            </Typography>
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={!!error || success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={success ? "success" : "error"}
          sx={{ width: "100%" }}
        >
          {success ? "تم حفظ جميع التحديثات بنجاح!" : error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Selector; 