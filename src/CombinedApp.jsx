import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Box, Typography, Paper,
  CircularProgress, Alert,
  Button, FormControl, InputLabel, Select, MenuItem, Snackbar, Grid, List, ListItem, ListItemText, IconButton, Divider, LinearProgress, Fade
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncIcon from '@mui/icons-material/Sync';
import VisibilityIcon from '@mui/icons-material/Visibility';

const QUEUE_KEY = 'attendance_queue';

export default function CombinedApp() {
  // Splash screen state
  const [showSplash, setShowSplash] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Selector states
  const [names, setNames] = useState([]);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedName, setSelectedName] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [success, setSuccess] = useState(false);
  const [queue, setQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const syncIndex = useRef(0);
  const [progress, setProgress] = useState(0);

  // Splash screen timer effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dataLoaded) {
        setShowSplash(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [dataLoaded]);

  // Load queue from localStorage
  useEffect(() => {
    const savedQueue = localStorage.getItem(QUEUE_KEY);
    if (savedQueue) setQueue(JSON.parse(savedQueue));
  }, []);

  // Persist queue to localStorage
  useEffect(() => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }, [queue]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/codes');
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        let dateHeaders = data.headers.filter(h => h && h !== 'الاسم');
        if (dateHeaders.length > 0) dateHeaders = dateHeaders.slice(1);
        setNames(data.names.filter(Boolean));
        setDates(dateHeaders);
        const today = new Date();
        const todayStr = today.toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        }).replace(/ /g, ' ');
        const found = dateHeaders.find(d => d.trim() === todayStr.trim());
        setSelectedDate(found || "");
        setDataLoaded(true);
      } catch (err) {
        setError('حدث خطأ أثناء جلب البيانات');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedName || !selectedDate) {
      setError('يرجى اختيار الاسم والتاريخ');
      return;
    }
    setError(null);
    if (queue.some(q => q.name === selectedName && q.date === selectedDate)) {
      setError('هذا الحضور موجود بالفعل في قائمة الانتظار');
      return;
    }
    setQueue(prev => [...prev, { name: selectedName, date: selectedDate }]);
    setSuccess(true);
    setSelectedName("");
    setSelectedDate("");
  };

  const handleRemoveFromQueue = (idx) => {
    setQueue(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSync = async () => {
    if (queue.length === 0) return;
    setSyncing(true);
    setSyncError(null);
    setProgress(0);
    syncIndex.current = 0;
    let newQueue = [...queue];
    for (let i = 0; i < queue.length; i++) {
      const { name, date } = queue[i];
      try {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, date })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'فشل تسجيل الحضور');
        }
        newQueue[i] = null;
        syncIndex.current = i + 1;
        setProgress(Math.round(((i + 1) / queue.length) * 100));
      } catch (err) {
        setSyncError(`خطأ في مزامنة الحضور: ${name} (${date}) - ${err.message}`);
        break;
      }
    }
    setQueue(newQueue.filter(Boolean));
    setSyncing(false);
    setProgress(0);
    if (!syncError) setSuccess(true);
  };

  return (
    <Fade in={true}>
      <Box sx={{ 
        minHeight: '100vh',
        backgroundColor: '#f9f5e1',
        transition: 'opacity 0.5s ease-in-out'
      }}>
        {showSplash ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            background: '#fff'
          }}>
            <Image src="/splash.png" alt="Splash" width={300} height={300} priority />
            <Box sx={{ mt: 3 }}>
              <CircularProgress size={24} />
            </Box>
          </Box>
        ) : (
          <Box sx={{ maxWidth: 500, margin: 'auto', p: 3 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 4 
            }}>
              <Typography variant="h4" sx={{ color: 'primary.main' }}>
                تسجيل الحضور
              </Typography>
              <Link href="/attendance-view" passHref>
                <IconButton 
                  color="primary" 
                  component="a"
                  sx={{ 
                    backgroundColor: 'white',
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}
                >
                  <VisibilityIcon />
                </IconButton>
              </Link>
            </Box>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 2, backgroundColor: 'white', mb: 3 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <form onSubmit={handleSubmit}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <Autocomplete
                      options={names}
                      value={selectedName}
                      onChange={(e, newValue) => setSelectedName(newValue || "")}
                      renderInput={(params) => <TextField {...params} label="الاسم" />}
                      isOptionEqualToValue={(option, value) => option === value}
                      noOptionsText="لا توجد نتائج"
                    />
                  </FormControl>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>التاريخ</InputLabel>
                    <Select
                      value={selectedDate}
                      label="التاريخ"
                      onChange={e => setSelectedDate(e.target.value)}
                    >
                      {dates.map((date, idx) => (
                        <MenuItem key={idx} value={date}>{date}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary" 
                    fullWidth 
                    disabled={syncing}
                  >
                    إضافة إلى قائمة الانتظار
                  </Button>
                </form>
              )}
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              <Snackbar
                open={success}
                autoHideDuration={3000}
                onClose={() => setSuccess(false)}
                message="تمت الإضافة إلى قائمة الانتظار أو تم المزامنة بنجاح"
              />
            </Paper>

            <Paper elevation={2} sx={{ p: 2, borderRadius: 2, backgroundColor: 'white', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" sx={{ flex: 1 }}>
                  قائمة الانتظار ({queue.length})
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SyncIcon />}
                  onClick={handleSync}
                  disabled={queue.length === 0 || syncing || !isOnline}
                >
                  مزامنة
                </Button>
              </Box>
              {syncing && (
                <Box sx={{ width: '100%', mb: 2 }}>
                  <LinearProgress variant="determinate" value={progress} />
                </Box>
              )}
              {syncError && (
                <Alert severity="error" sx={{ mb: 2 }}>{syncError}</Alert>
              )}
              {!isOnline && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  أنت غير متصل بالإنترنت. سيتم حفظ التغييرات محليًا حتى تتصل مرة أخرى.
                </Alert>
              )}
              <List>
                {queue.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <ListItem
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleRemoveFromQueue(idx)}
                          disabled={syncing}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText 
                        primary={item.name}
                        secondary={item.date}
                      />
                    </ListItem>
                    {idx < queue.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Box>
        )}
      </Box>
    </Fade>
  );
}