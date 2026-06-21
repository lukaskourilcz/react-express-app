import { useState } from 'react';
import { Box, Tabs, Tab, Button, Typography } from '@mui/material';
import DevQuestions from './DevQuestions';
import DevReports from './DevReports';
import DevLogs from './DevLogs';
import DevSettings from './DevSettings';

/** The signed-in /dev shell: a header with a lock button and Questions/Settings tabs. */
export default function DevConsole({ onLock }: { onLock: () => void }) {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ width: '90%', maxWidth: 1700, mx: 'auto', px: { xs: 1.5, sm: 2 }, py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          Dev console
        </Typography>
        <Button variant="outlined" size="small" onClick={onLock}>
          Lock
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab label="Questions" />
        <Tab label="Flags" />
        <Tab label="Logs" />
        <Tab label="Settings" />
      </Tabs>

      {tab === 0 ? (
        <DevQuestions />
      ) : tab === 1 ? (
        <DevReports />
      ) : tab === 2 ? (
        <DevLogs />
      ) : (
        <DevSettings />
      )}
    </Box>
  );
}
