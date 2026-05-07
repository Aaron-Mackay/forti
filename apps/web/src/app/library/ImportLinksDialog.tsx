'use client';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { LibraryAsset } from '@/generated/prisma/browser';
import { useMemo, useRef, useState } from 'react';
import { parseLibraryCsv } from '@/utils/csvImport';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (assets: LibraryAsset[]) => void;
  isCoach: boolean;
}

const PLACEHOLDER = `name,url
Squat Form Guide,https://youtube.com/watch?v=...
My Programme,https://docs.google.com/...`;

export default function ImportLinksDialog({ open, onClose, onImport, isCoach }: Props) {
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [rawText, setRawText] = useState('');
  const [isCoachAsset, setIsCoachAsset] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    if (!rawText.trim()) return null;
    return parseLibraryCsv(rawText);
  }, [rawText]);

  const validRows = parsed?.filter((r) => !r.error) ?? [];
  const invalidCount = (parsed?.length ?? 0) - validRows.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRawText((ev.target?.result as string) ?? '');
    reader.readAsText(file);
    // Reset so the same file can be re-selected if needed
    e.target.value = '';
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const results = await Promise.all(
        validRows.map((row) =>
          fetch('/api/library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'LINK',
              title: row.title,
              url: row.url,
              isCoachAsset: isCoach && isCoachAsset,
            }),
          }).then((r) => (r.ok ? r.json() : null)),
        ),
      );
      const created = results.filter(Boolean) as LibraryAsset[];
      onImport(created);
      handleClose();
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setRawText('');
    setMode('paste');
    setIsCoachAsset(false);
    onClose();
  };

  const handleModeChange = (_: React.MouseEvent, value: 'paste' | 'upload' | null) => {
    if (!value) return;
    setRawText('');
    setMode(value);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Bulk Upload Links</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} mt={0.5}>
          {/* Input method toggle */}
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            size="small"
            fullWidth
          >
            <ToggleButton value="paste">Paste text</ToggleButton>
            <ToggleButton value="upload">Upload file</ToggleButton>
          </ToggleButtonGroup>

          {/* Input area */}
          {mode === 'paste' ? (
            <TextField
              multiline
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={PLACEHOLDER}
              fullWidth
              size="small"
              inputProps={{ 'aria-label': 'Paste CSV or TSV text' }}
            />
          ) : (
            <Stack alignItems="center" spacing={1} py={1}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                aria-label="Upload CSV or TSV file"
              />
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file (.csv, .tsv)
              </Button>
              {rawText && (
                <Typography variant="caption" color="success.main">
                  File loaded — {(parsed?.length ?? 0)} row{(parsed?.length ?? 0) === 1 ? '' : 's'} detected
                </Typography>
              )}
            </Stack>
          )}

          <Typography variant="caption" color="text.secondary">
            First row can be a header (<code>name,url</code>) or data. Tab-separated files are also supported.
          </Typography>

          {/* Preview list */}
          {parsed && parsed.length > 0 && (
            <>
              <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
                Preview
              </Typography>
              <List
                dense
                disablePadding
                sx={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                {parsed.map((row, i) => (
                  <ListItem key={i} divider={i < parsed.length - 1}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {row.error ? (
                        <ErrorIcon fontSize="small" color="error" />
                      ) : (
                        <CheckCircleIcon fontSize="small" color="success" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={row.title || <em>no name</em>}
                      secondary={row.error ?? row.url}
                      secondaryTypographyProps={{
                        color: row.error ? 'error' : 'text.secondary',
                        noWrap: true,
                      }}
                    />
                  </ListItem>
                ))}
              </List>

              <Typography variant="caption" color="text.secondary">
                {validRows.length} valid
                {invalidCount > 0 && ` · ${invalidCount} will be skipped`}
              </Typography>
            </>
          )}

          {/* Coach share toggle */}
          {isCoach && (
            <FormControlLabel
              control={
                <Switch
                  checked={isCoachAsset}
                  onChange={(e) => setIsCoachAsset(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Share with my clients</Typography>}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={importing}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={importing || validRows.length === 0}
        >
          {importing
            ? 'Importing…'
            : `Import ${validRows.length} link${validRows.length === 1 ? '' : 's'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
