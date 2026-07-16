import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { useIsMobile } from '../../lib/useMediaQuery';
import DevQuestions from './DevQuestions';
import DevTriage from './DevTriage';
import DevReports from './DevReports';
import DevLogs from './DevLogs';
import DevSettings from './DevSettings';

type Tab = 'questions' | 'triage' | 'flags' | 'logs' | 'settings';

/** The signed-in /dev shell: a header with a lock button and Questions/Settings tabs. */
export default function DevConsole({ onLock }: { onLock: () => void }) {
  const [tab, setTab] = useState<Tab>('questions');
  const isMobile = useIsMobile();

  return (
    <div style={{ width: '100%', margin: '0 auto', padding: isMobile ? '16px 12px' : '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
          Dev console
        </h1>
        <Button variant="secondary" size="sm" label="Lock" onClick={onLock} />
      </div>

      <div style={{ marginBottom: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
        <SegmentedControl value={tab} onChange={(v) => setTab(v as Tab)} label="Dev console section">
          <SegmentedControlItem value="questions" label="Questions" />
          <SegmentedControlItem value="triage" label="Triage" />
          <SegmentedControlItem value="flags" label="Flags" />
          <SegmentedControlItem value="logs" label="Logs" />
          <SegmentedControlItem value="settings" label="Settings" />
        </SegmentedControl>
      </div>

      {tab === 'questions' ? (
        <DevQuestions />
      ) : tab === 'triage' ? (
        <DevTriage />
      ) : tab === 'flags' ? (
        <DevReports />
      ) : tab === 'logs' ? (
        <DevLogs />
      ) : (
        <DevSettings />
      )}
    </div>
  );
}
