import React, { useState, useRef, useEffect, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import Webcam from "react-webcam";
import { useRouter } from 'next/router';
import {
  Button, Box, Typography, Select, MenuItem, Paper,
  FormControl, InputLabel, CircularProgress, Snackbar, Alert,
  List, ListItem, ListItemText, ListItemSecondaryAction, IconButton,
  Divider, Card, CardContent, LinearProgress, Fab
} from "@mui/material";
import {
  PlayCircleOutline, StopCircleOutlined, Delete as DeleteIcon,
  Sync as SyncIcon, Construction as ConstructionIcon,
  QrCode as QrCodeIcon
} from "@mui/icons-material";
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';

const QrScanner = () => {
  const router = useRouter();
  const [scanResult, setScanResult] = useState(null);
  const [selectedValue, setSelectedValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentUpdate, setCurrentUpdate] = useState(0);
  const [processedUsers, setProcessedUsers] = useState({});
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueue, setSyncQueue] = useState([]);
  const [lastSyncAttempt, setLastSyncAttempt] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'queued' | 'error'
  const [syncError, setSyncError] = useState(null);

  const webcamRef = useRef(null);
  const codeReader = useRef(null);
  const scanTimeout = useRef(null);

  // Hardcoded headers
  const HEADERS = ['ID', 'CodeValue', 'Name', 'Class', 'Team', 'Score'];

  // Custom theme colors
  const theme = {
    primary: '#f9d950',
    background: '#f9f5e1',
    text: '#000000',
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    codeReader.current = new BrowserMultiFormatReader();
    return () => {
      stopScanner();
      if (codeReader.current) {
        codeReader.current.reset();
        codeReader.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Check if there are codes in the URL
    if (router.query.codes) {
      const codes = router.query.codes.split(',');
      // Add each code to pending updates
      const newUpdates = codes.map(code => ({
        qrCode: code,
        selectedValue: parseInt(selectedValue, 10) || 0,
        timestamp: new Date().toISOString()
      }));
      setPendingUpdates(prev => [...prev, ...newUpdates]);
      // Clear the URL parameter
      router.replace('/scanner', undefined, { shallow: true });
    }
  }, [router.query.codes, selectedValue]);

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

  const startScanner = useCallback(async () => {
    setScanResult(null);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      stream.getTracks().forEach(track => track.stop());

      setIsScanning(true);

      scanTimeout.current = setTimeout(() => {
        if (!scanResult) {
          setError("Scanning timed out");
          stopScanner();
        }
      }, 10000);

      if (!webcamRef.current?.video) {
        setError("Camera not ready");
        return;
      }

      codeReader.current.decodeFromVideoDevice(
        undefined,
        webcamRef.current.video,
        (result, err) => {
          if (result) {
            clearTimeout(scanTimeout.current);
            setScanResult(result.getText());
            stopScanner();
          }
          if (err && !(err instanceof Error)) {
            console.error("Scan error:", err);
          }
        }
      );
    } catch (error) {
      setError("Camera access denied");
      setIsScanning(false);
    }
  }, [scanResult]);

  const stopScanner = useCallback(() => {
    clearTimeout(scanTimeout.current);
    if (codeReader.current) {
      codeReader.current.reset();
    }
    setIsScanning(false);
  }, []);

  const addToPendingUpdates = useCallback(() => {
    if (!scanResult || !selectedValue) return;

    setPendingUpdates(prev => [...prev, {
      qrCode: scanResult,
      selectedValue: parseInt(selectedValue, 10),
      timestamp: new Date().toISOString()
    }]);

    setScanResult(null);
    setSelectedValue("");
  }, [scanResult, selectedValue]);

  const removePendingUpdate = useCallback((index) => {
    setPendingUpdates(prev => prev.filter((_, i) => i !== index));
  }, []);

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

  const handleValueChange = (event) => {
    setSelectedValue(event.target.value);
  };

  const handleCloseSnackbar = () => {
    setError(null);
    setSuccess(false);
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
      backgroundColor: theme.background,
      minHeight: '100vh'
    }}>
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

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<QrCodeIcon />}
          onClick={() => router.push('/selector')}
          sx={{
            bgcolor: theme.primary,
            color: theme.text,
            '&:hover': {
              bgcolor: theme.primary,
              opacity: 0.9
            }
          }}
        >
          اختيار من القائمة
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

      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          mb: 3, 
          position: "relative",
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <Box sx={{ position: 'relative', aspectRatio: '1' }}>
          <Webcam
            ref={webcamRef}
            style={{
              width: "100%",
              display: isScanning ? "block" : "none",
              aspectRatio: "1"
            }}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }}
          />

          {!isScanning && (
            <Box sx={{
              backgroundColor: "#f5f5f5",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Typography color="text.secondary">
                الكاميرا مغلقة
              </Typography>
            </Box>
          )}

          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 220,
            height: 220,
            border: '3px solid white',
            borderRadius: 2,
          }} />
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center", mt: 2, gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<PlayCircleOutline />}
            onClick={startScanner}
            disabled={isScanning || !!scanResult}
            sx={{
              bgcolor: theme.primary,
              color: theme.text,
              '&:hover': {
                bgcolor: theme.primary,
                opacity: 0.9
              }
            }}
          >
            تشغيل
          </Button>
          <Button
            variant="contained"
            startIcon={<StopCircleOutlined />}
            onClick={stopScanner}
            disabled={!isScanning}
            sx={{
              bgcolor: theme.primary,
              color: theme.text,
              '&:hover': {
                bgcolor: theme.primary,
                opacity: 0.9
              }
            }}
          >
            إيقاف
          </Button>
        </Box>
      </Paper>

      {scanResult && (
        <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            تم مسح: {scanResult}
          </Typography>

          <FormControl fullWidth sx={{ mt: 2 }}>
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
            onClick={addToPendingUpdates}
            disabled={!selectedValue}
            fullWidth
            size="large"
            sx={{
              mt: 2,
              bgcolor: theme.primary,
              color: theme.text,
              height: 50,
              borderRadius: 2,
              '&:hover': {
                bgcolor: theme.primary,
                opacity: 0.9
              }
            }}
          >
            إضافة إلى القائمة
          </Button>
        </Paper>
      )}

      {pendingUpdates.length > 0 && (
        <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              التحديثات المعلقة ({pendingUpdates.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<SyncIcon />}
              onClick={syncUpdates}
              disabled={syncing}
              sx={{
                bgcolor: theme.primary,
                color: theme.text,
                '&:hover': {
                  bgcolor: theme.primary,
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
          <List>
            {pendingUpdates.map((update, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemText
                    primary={update.qrCode}
                    secondary={`النقاط: ${update.selectedValue} طوبة`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => removePendingUpdate(index)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < pendingUpdates.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
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

      <Fab
        color="primary"
        aria-label="add"
        onClick={() => router.push("/selector")}
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          width: 56,
          height: 56,
          backgroundColor: "white",
          "&:hover": {
            backgroundColor: "grey.100",
          },
        }}
      >
        <Image
          src="/splash.png"
          alt="Selector"
          width={32}
          height={32}
          style={{ objectFit: 'contain' }}
        />
      </Fab>
    </Box>
  );
};

export default QrScanner;
