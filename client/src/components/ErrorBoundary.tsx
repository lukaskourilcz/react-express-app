import { Component, type ReactNode } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { reportError } from '../lib/sentry';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
    reportError(error, { componentStack: info.componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Box
        role="alert"
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Paper elevation={0} sx={{ p: 4, maxWidth: 480, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5" sx={{ mb: 1 }}>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The page hit an unexpected error. Reloading usually fixes it.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
            <Button onClick={this.handleReset} variant="outlined">
              Try again
            </Button>
            <Button onClick={() => window.location.reload()} variant="contained">
              Reload page
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }
}
