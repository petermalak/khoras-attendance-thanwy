import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Card,
  CardContent,
  Grid,
  Fade,
  Zoom,
  Slide,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Pagination,
  Chip,
  Stack,
  Button,
  Tooltip,
  Avatar,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  Checkbox,
} from '@mui/material';
import {
  Search as SearchIcon,
  Sort as SortIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  School as SchoolIcon,
  Groups as GroupsIcon,
  EmojiEvents as TrophyIcon,
  Person as PersonIcon,
  Score as ScoreIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Numbers as NumbersIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

const ITEMS_PER_PAGE = 10;

// Define theme colors
const theme = {
  primary: '#f9d950',
  secondary: '#f9f5e1',
  success: '#4caf50',
  info: '#2196f3',
  warning: '#ff9800',
  error: '#f44336',
  text: {
    primary: '#000000',
    secondary: '#666666',
  },
  background: {
    default: '#f9f5e1',
    paper: '#ffffff',
  },
};

const ScoresView = () => {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('score');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [viewMode, setViewMode] = useState('list');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchScores();
  }, []);

  const fetchScores = async () => {
    try {
      const response = await fetch('/api/scores');
      const data = await response.json();
      setScores(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching scores:', error);
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortField(key);
    setSortDirection(prevDirection => prevDirection === 'asc' ? 'desc' : 'asc');
  };

  const handleFilterChange = (filterType, value) => {
    if (filterType === 'class') {
      setSelectedClass(value);
    } else if (filterType === 'team') {
      setSelectedTeam(value);
    }
    setSearchTerm('');
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedClass('');
    setSelectedTeam('');
    setSearchTerm('');
    setPage(1);
  };

  const filteredAndSortedScores = scores
    .filter(user => {
      const matchesSearch = searchTerm === '' || 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.team.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClass = !selectedClass || user.class === selectedClass;
      const matchesTeam = !selectedTeam || user.team === selectedTeam;

      return matchesSearch && matchesClass && matchesTeam;
    })
    .sort((a, b) => {
      if (sortField === 'score') {
        return sortDirection === 'asc' ? a.score - b.score : b.score - a.score;
      }
      const aValue = a[sortField]?.toLowerCase() || '';
      const bValue = b[sortField]?.toLowerCase() || '';
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });

  // Get unique classes and teams for filters
  const uniqueClasses = [...new Set(scores.map(user => user.class))].filter(Boolean);
  const uniqueTeams = [...new Set(scores.map(user => user.team))].filter(Boolean);

  const paginatedScores = filteredAndSortedScores.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredAndSortedScores.length / ITEMS_PER_PAGE);

  const getScoreColor = (score) => {
    if (score >= 100) return theme.success;
    if (score >= 50) return theme.info;
    if (score >= 25) return theme.warning;
    return theme.error;
  };

  const getScoreIcon = (score) => {
    if (score >= 100) return <TrophyIcon sx={{ color: theme.success }} />;
    if (score >= 50) return <TrendingUpIcon sx={{ color: theme.info }} />;
    if (score >= 25) return <TrendingUpIcon sx={{ color: theme.warning }} />;
    return <TrendingDownIcon sx={{ color: theme.error }} />;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      { bg: theme.primary, text: '#ffffff' },
      { bg: theme.success, text: '#ffffff' },
      { bg: theme.info, text: '#ffffff' },
      { bg: theme.warning, text: '#ffffff' },
      { bg: '#9c27b0', text: '#ffffff' },
      { bg: '#e91e63', text: '#ffffff' },
      { bg: '#00bcd4', text: '#ffffff' },
      { bg: '#795548', text: '#ffffff' },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleRefresh = async () => {
    await fetchScores();
  };

  const handleRowClick = (userId) => {
    setExpandedRow(expandedRow === userId ? null : userId);
  };

  const handleRowSelect = (userId) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedRows(newSelected);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'نظام النقاط',
        text: 'تحقق من نقاط الطلاب!',
        url: window.location.href,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleExport = () => {
    const data = paginatedScores.map(user => ({
      name: user.name,
      class: user.class,
      team: user.team,
      score: user.score,
    }));
    
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scores.csv';
    a.click();
  };

  const SortButton = ({ column, label, icon }) => {
    const isActive = sortField === column;
    const color = isActive ? theme.primary : theme.text.secondary;

    return (
      <Box
        onClick={() => handleSort(column)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          p: 1.5,
          borderRadius: 1,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          '&:hover': {
            backgroundColor: theme.secondary,
            '& .sort-icon': {
              transform: 'scale(1.1) rotate(5deg)',
            },
          },
          ...(isActive && {
            backgroundColor: theme.secondary,
            fontWeight: 'bold',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '2px',
              backgroundColor: theme.primary,
              transform: 'scaleX(1)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            },
          }),
        }}
      >
        <Box
          className="sort-icon"
          sx={{
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            color,
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="body1"
          sx={{
            fontWeight: isActive ? 'bold' : 'normal',
            color,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {label}
        </Typography>
        {isActive && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: theme.primary,
              ml: 0.5,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: sortDirection === 'asc' ? 'rotate(0deg)' : 'rotate(180deg)',
            }}
          >
            <TrendingUpIcon fontSize="small" />
          </Box>
        )}
      </Box>
    );
  };

  const StatCard = ({ title, value, icon, delay }) => (
    <Zoom in={true} style={{ transitionDelay: `${delay}ms` }}>
      <Card
        sx={{
          backgroundColor: theme.primary,
          color: theme.text.primary,
          borderRadius: 2,
          height: '100%',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'scale(1.02)',
          },
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {icon}
            <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
              {title}
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {value}
          </Typography>
        </CardContent>
      </Card>
    </Zoom>
  );

  const MobileFilters = () => (
    <Slide direction="down" in={showMobileFilters}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: theme.background.paper,
          p: 2,
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          maxHeight: '100vh',
          overflowY: 'auto',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">الفلاتر</Typography>
          <IconButton onClick={() => setShowMobileFilters(false)}>
            <ExpandLessIcon />
          </IconButton>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="بحث عن مستخدم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: theme.primary }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>الفصل</InputLabel>
              <Select
                value={selectedClass}
                onChange={(e) => handleFilterChange('class', e.target.value)}
                label="الفصل"
                startAdornment={
                  <InputAdornment position="start">
                    <SchoolIcon sx={{ color: theme.primary }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="">الكل</MenuItem>
                {Array.from(new Set(scores.map((score) => score.class))).map((cls) => (
                  <MenuItem key={cls} value={cls}>
                    {cls}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>الفريق</InputLabel>
              <Select
                value={selectedTeam}
                onChange={(e) => handleFilterChange('team', e.target.value)}
                label="الفريق"
                startAdornment={
                  <InputAdornment position="start">
                    <GroupsIcon sx={{ color: theme.primary }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="">الكل</MenuItem>
                {Array.from(new Set(scores.map((score) => score.team))).map((team) => (
                  <MenuItem key={team} value={team}>
                    {team}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              sx={{
                borderColor: theme.primary,
                color: theme.text.primary,
                '&:hover': {
                  borderColor: theme.primary,
                  backgroundColor: theme.secondary,
                },
              }}
            >
              مسح الفلاتر
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Slide>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: theme.background.default,
        py: 4,
        px: { xs: 2, md: 4 },
      }}
    >
      <Fade in={true}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              color: theme.text.primary,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <TrophyIcon sx={{ color: theme.primary, fontSize: 40 }} />
            نظام النقاط
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="تحديث البيانات">
              <IconButton
                onClick={handleRefresh}
                sx={{
                  color: theme.primary,
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'rotate(180deg)',
                    backgroundColor: theme.secondary,
                  },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Fade>

      {/* Mobile Filters Button */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={() => setShowMobileFilters(true)}
          sx={{
            borderColor: theme.primary,
            color: theme.text.primary,
            '&:hover': {
              borderColor: theme.primary,
              backgroundColor: theme.secondary,
            },
          }}
        >
          الفلاتر
        </Button>
      </Box>

      <MobileFilters />

      <AnimatePresence>
        {showMobileFilters && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <Drawer
              anchor="right"
              open={showMobileFilters}
              onClose={() => setShowMobileFilters(false)}
              PaperProps={{
                sx: {
                  width: '100%',
                  maxWidth: 300,
                  p: 2,
                  backgroundColor: theme.background,
                },
              }}
            >
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterIcon />
                  تصفية النتائج
                </Typography>
                <TextField
                  fullWidth
                  size="small"
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
                  sx={{ mb: 2 }}
                />
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>الفصل</InputLabel>
                  <Select
                    value={selectedClass}
                    onChange={(e) => handleFilterChange('class', e.target.value)}
                    label="الفصل"
                  >
                    <MenuItem value="">الكل</MenuItem>
                    {Array.from(new Set(scores.map((score) => score.class))).map((cls) => (
                      <MenuItem key={cls} value={cls}>
                        {cls}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>الفريق</InputLabel>
                  <Select
                    value={selectedTeam}
                    onChange={(e) => handleFilterChange('team', e.target.value)}
                    label="الفريق"
                  >
                    <MenuItem value="">الكل</MenuItem>
                    {Array.from(new Set(scores.map((score) => score.team))).map((team) => (
                      <MenuItem key={team} value={team}>
                        {team}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedClass('');
                    setSelectedTeam('');
                  }}
                  startIcon={<ClearIcon />}
                >
                  مسح التصفية
                </Button>
              </Box>
            </Drawer>
          </motion.div>
        )}
      </AnimatePresence>

      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 2,
          backgroundColor: theme.background.paper,
          mb: 4,
        }}
      >
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="ابحث عن اسم، كود، فصل، أو فريق..."
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
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>الفصل</InputLabel>
              <Select
                value={selectedClass}
                onChange={(e) => handleFilterChange('class', e.target.value)}
                label="الفصل"
              >
                <MenuItem value="">الكل</MenuItem>
                {uniqueClasses.map((className) => (
                  <MenuItem key={className} value={className}>
                    {className}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>الفريق</InputLabel>
              <Select
                value={selectedTeam}
                onChange={(e) => handleFilterChange('team', e.target.value)}
                label="الفريق"
              >
                <MenuItem value="">الكل</MenuItem>
                {uniqueTeams.map((team) => (
                  <MenuItem key={team} value={team}>
                    {team}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={clearFilters}
              startIcon={<ClearIcon />}
            >
              مسح الفلاتر
            </Button>
          </Grid>
        </Grid>

        {Object.values({ class: selectedClass, team: selectedTeam }).some(Boolean) && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            {selectedClass && (
              <Chip
                icon={<SchoolIcon />}
                label={`الفصل: ${selectedClass}`}
                onDelete={() => handleFilterChange('class', '')}
                sx={{ backgroundColor: theme.secondary }}
              />
            )}
            {selectedTeam && (
              <Chip
                icon={<GroupsIcon />}
                label={`الفريق: ${selectedTeam}`}
                onDelete={() => handleFilterChange('team', '')}
                sx={{ backgroundColor: theme.secondary }}
              />
            )}
          </Stack>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress sx={{ color: theme.primary }} />
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : filteredAndSortedScores.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography>لا توجد نتائج</Typography>
          </Box>
        ) : viewMode === 'list' ? (
          <Paper 
            sx={{ 
              width: '100%', 
              overflow: 'hidden',
              borderRadius: 2,
              boxShadow: 3,
              margin: '0 auto'
            }}
          >
            <TableContainer sx={{ 
              maxHeight: 'calc(100vh - 300px)', 
              overflowX: isMobile ? 'auto' : 'visible',
              width: '100%',
              minHeight: isMobile ? undefined : 1000
            }}>
              <Table stickyHeader size={isMobile ? "small" : "medium"} sx={{ width: '100%' }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f9f5e1' }}>
                    <TableCell align="center" sx={{ borderBottom: '2px solid #f9d950', padding: isMobile ? '8px' : '16px 24px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Typography variant={isMobile ? "body2" : "h6"} fontWeight="bold">الاسم</Typography>
                        <SortButton column="name" label="الاسم" icon={<PersonIcon />} />
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ borderBottom: '2px solid #f9d950', padding: isMobile ? '8px' : '16px 24px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Typography variant={isMobile ? "body2" : "h6"} fontWeight="bold">الفصل</Typography>
                        <SortButton column="class" label="الفصل" icon={<SchoolIcon />} />
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ borderBottom: '2px solid #f9d950', padding: isMobile ? '8px' : '16px 24px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Typography variant={isMobile ? "body2" : "h6"} fontWeight="bold">الفريق</Typography>
                        <SortButton column="team" label="الفريق" icon={<GroupsIcon />} />
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ borderBottom: '2px solid #f9d950', padding: isMobile ? '8px' : '16px 24px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Typography variant={isMobile ? "body2" : "h6"} fontWeight="bold">النقاط</Typography>
                        <SortButton column="score" label="النقاط" icon={<ScoreIcon />} />
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedScores.map((user, index) => (
                    <TableRow
                      key={user.id}
                      hover
                      onClick={() => handleRowClick(user.id)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9f5e1',
                        '&:last-child td, &:last-child th': { border: 0 },
                        '& td': {
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: isMobile ? '0.875rem' : '1.1rem',
                          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                          padding: isMobile ? '8px' : '16px 24px'
                        },
                        '&:hover': {
                          backgroundColor: '#f9d95020'
                        }
                      }}
                    >
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                          <Avatar
                            sx={{
                              bgcolor: getAvatarColor(user.name).bg,
                              color: getAvatarColor(user.name).text,
                              width: isMobile ? 28 : 40,
                              height: isMobile ? 28 : 40,
                              fontSize: isMobile ? '0.75rem' : '1rem',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            {getInitials(user.name)}
                          </Avatar>
                          <Typography 
                            noWrap 
                            variant={isMobile ? "body2" : "body1"} 
                            fontWeight="medium"
                            sx={{ fontSize: isMobile ? '0.875rem' : '1.1rem' }}
                          >
                            {user.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={user.class}
                          size={isMobile ? "small" : "medium"}
                          sx={{
                            backgroundColor: '#f9d95020',
                            color: '#000000',
                            fontWeight: 'medium',
                            maxWidth: '100%',
                            fontSize: isMobile ? '0.875rem' : '1rem',
                            height: isMobile ? 24 : 32,
                            '& .MuiChip-label': {
                              px: isMobile ? 1 : 2
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={user.team}
                          size={isMobile ? "small" : "medium"}
                          sx={{
                            backgroundColor: '#f9d95020',
                            color: '#000000',
                            fontWeight: 'medium',
                            maxWidth: '100%',
                            fontSize: isMobile ? '0.875rem' : '1rem',
                            height: isMobile ? 24 : 32,
                            '& .MuiChip-label': {
                              px: isMobile ? 1 : 2
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                          {getScoreIcon(user.score)}
                          <Typography
                            variant={isMobile ? "body2" : "body1"}
                            sx={{
                              color: getScoreColor(user.score),
                              fontWeight: 'bold',
                              fontSize: isMobile ? '1rem' : '1.5rem'
                            }}
                          >
                            {user.score}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {paginatedScores.map((score) => (
              <Grid item xs={12} sm={6} md={4} key={score.id}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar
                      src={score.avatar}
                      alt={score.name}
                      sx={{
                        width: 48,
                        height: 48,
                        backgroundColor: getAvatarColor(score.name).bg,
                      }}
                    >
                      {score.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{score.name}</Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          icon={<SchoolIcon />}
                          label={score.class}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(25, 118, 210, 0.1)',
                            color: theme.primary,
                          }}
                        />
                        <Chip
                          icon={<GroupsIcon />}
                          label={score.team}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(46, 125, 50, 0.1)',
                            color: theme.success,
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Typography
                      variant="h4"
                      sx={{
                        color: getScoreColor(score.score),
                        fontWeight: 'bold',
                      }}
                    >
                      {score.score}
                    </Typography>
                    {score.score >= 50 ? (
                      <TrendingUpIcon sx={{ color: theme.success, fontSize: 32 }} />
                    ) : (
                      <TrendingDownIcon sx={{ color: theme.error, fontSize: 32 }} />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {new Date(score.date).toLocaleDateString('ar-SA')}
                  </Typography>
                  <Typography variant="body2">{score.details}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Team Scores Bar Chart - Separate Component */}
      {(() => {
        // Group scores by team, excluding entries without team names
        const teamScores = scores
          .filter(user => user.team && user.team.trim() !== '')
          .reduce((acc, user) => {
            if (!acc[user.team]) {
              acc[user.team] = 0;
            }
            acc[user.team] += user.score;
            return acc;
          }, {});

        const chartData = {
          labels: Object.keys(teamScores),
          datasets: [
            {
              label: 'إجمالي النقاط',
              data: Object.values(teamScores),
              backgroundColor: [
                '#f9d950',
                '#4caf50',
                '#2196f3',
                '#ff9800',
                '#9c27b0',
                '#e91e63',
                '#00bcd4',
                '#795548',
                '#607d8b',
                '#ff5722',
              ],
              borderColor: [
                '#f9d950',
                '#4caf50',
                '#2196f3',
                '#ff9800',
                '#9c27b0',
                '#e91e63',
                '#00bcd4',
                '#795548',
                '#607d8b',
                '#ff5722',
              ],
              borderWidth: 2,
              borderRadius: 8,
              borderSkipped: false,
            },
          ],
        };

        const chartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            title: {
              display: true,
              text: 'إجمالي النقاط حسب الفريق',
              font: {
                size: 16,
                weight: 'bold',
              },
              color: '#000000',
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#ffffff',
              bodyColor: '#ffffff',
              borderColor: '#f9d950',
              borderWidth: 1,
              cornerRadius: 8,
              displayColors: false,
              callbacks: {
                label: function(context) {
                  return `النقاط: ${context.parsed.y}`;
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)',
              },
              ticks: {
                color: '#000000',
                font: {
                  weight: 'bold',
                },
              },
              title: {
                display: true,
                text: 'النقاط',
                color: '#000000',
                font: {
                  weight: 'bold',
                },
              },
            },
            x: {
              grid: {
                color: 'rgba(0, 0, 0, 0.1)',
              },
              ticks: {
                color: '#000000',
                font: {
                  weight: 'bold',
                },
              },
              title: {
                display: true,
                text: 'الفريق',
                color: '#000000',
                font: {
                  weight: 'bold',
                },
              },
            },
          },
        };

        return Object.keys(teamScores).length > 0 ? (
          <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 2,
              backgroundColor: theme.background.paper,
              mb: 4,
              mt: 4,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <BarChartIcon sx={{ color: theme.primary, fontSize: 30 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.text.primary }}>
                إحصائيات الفرق
              </Typography>
            </Box>
            <Box sx={{ height: 400, width: '100%' }}>
              <Bar data={chartData} options={chartOptions} />
            </Box>
          </Paper>
        ) : null;
      })()}

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(e, value) => setPage(value)}
          color="primary"
          size={isMobile ? "small" : "medium"}
          showFirstButton
          showLastButton
          sx={{
            '& .MuiPaginationItem-root': {
              color: '#000000',
            },
            '& .Mui-selected': {
              backgroundColor: '#f9d950',
              color: '#000000',
              '&:hover': {
                backgroundColor: '#f9d95080',
              }
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default ScoresView; 