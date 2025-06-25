import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper,
  CircularProgress, Alert,
  Button, FormControl, InputLabel, Select, MenuItem, Snackbar, Grid, List, ListItem, ListItemText, IconButton, Divider, LinearProgress
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncIcon from '@mui/icons-material/Sync';

const QUEUE_KEY = 'attendance_queue';

const Selector = () => {
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/codes');
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        // Remove 'الاسم' and the first date column (usually 'م')
        let dateHeaders = data.headers.filter(h => h && h !== 'الاسم');
        if (dateHeaders.length > 0) dateHeaders = dateHeaders.slice(1); // skip the first column ("م")
        setNames(data.names.filter(Boolean));
        setDates(dateHeaders);
        // Set today's date as default if it exists
        const today = new Date();
        const todayStr = today.toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        }).replace(/ /g, ' ');
        const found = dateHeaders.find(d => d.trim() === todayStr.trim());
        setSelectedDate(found || "");
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
    // Prevent duplicate in queue
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
        // Remove from queue if successful
        newQueue[i] = null;
        syncIndex.current = i + 1;
        setProgress(Math.round(((i + 1) / queue.length) * 100));
      } catch (err) {
        setSyncError(`خطأ في مزامنة الحضور: ${name} (${date}) - ${err.message}`);
        break;
      }
    }
    // Remove all successfully synced
    setQueue(newQueue.filter(Boolean));
    setSyncing(false);
    setProgress(0);
    if (!syncError) setSuccess(true);
  };

  return (
    <Box sx={{ maxWidth: 500, margin: 'auto', p: 3, backgroundColor: '#f9f5e1', minHeight: '100vh' }}>
      <Typography variant="h4" align="center" sx={{ color: 'primary.main', mb: 4 }}>
        تسجيل الحضور
      </Typography>
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
            <Button type="submit" variant="contained" color="primary" fullWidth disabled={syncing}>
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
            disabled={syncing || queue.length === 0 || !isOnline}
          >
            {syncing ? 'جاري المزامنة...' : 'مزامنة الكل'}
          </Button>
        </Box>
        {syncing && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {Math.min(syncIndex.current, queue.length)} من {queue.length}
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progress} sx={{ mb: 2, height: 8, borderRadius: 4 }} />
          </>
        )}
        <Divider sx={{ mb: 1 }} />
        {queue.length === 0 ? (
          <Typography color="text.secondary">لا توجد عناصر في قائمة الانتظار</Typography>
        ) : (
          <List>
            {queue.map((item, idx) => (
              <ListItem key={idx} secondaryAction={
                <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFromQueue(idx)}>
                  <DeleteIcon />
                </IconButton>
              }>
                <ListItemText primary={item.name} secondary={item.date} />
              </ListItem>
            ))}
          </List>
        )}
        {syncError && <Alert severity="error" sx={{ mt: 2 }}>{syncError}</Alert>}
        {!isOnline && <Alert severity="warning" sx={{ mt: 2 }}>أنت غير متصل بالإنترنت. سيتم حفظ الحضور ومزامنته عند عودة الاتصال.</Alert>}
      </Paper>
    </Box>
  );
};

export default Selector; 