import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import {format, parseISO} from "date-fns";
import type {BlockOverlapResolution, BlockOverlapRange} from "@lib/events";

function getActionLabel(action: BlockOverlapResolution['action']): string {
  if (action === 'delete') return 'Deleted';
  if (action === 'split') return 'Split';
  return 'Truncated';
}

function formatRange(range: BlockOverlapRange): string {
  const start = parseISO(range.startDate);
  const end = parseISO(range.endDate);
  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (sameMonth) return `${format(start, 'MMM d')}-${format(end, 'd, yyyy')}`;
  return `${format(start, 'MMM d, yyyy')} to ${format(end, 'MMM d, yyyy')}`;
}

function formatResult(resolution: BlockOverlapResolution): string {
  if (resolution.action === 'delete') return 'Will be deleted.';
  if (resolution.action === 'split') {
    return `Will be split into ${resolution.resultingRanges.map(formatRange).join(' and ')}`;
  }
  return `Will be truncated to ${resolution.resultingRanges.map(formatRange).join(' and ')}`;
}

export function BlockOverlapConfirmationDialog({
  open,
  resolutions,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  resolutions: BlockOverlapResolution[];
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} fullWidth maxWidth="sm">
      <DialogTitle>Resolve overlapping blocks?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          The new date range overlaps existing blocks. Confirming will apply these changes.
        </Typography>
        <List dense sx={{mt: 1}}>
          {resolutions.map((resolution) => (
            <ListItem key={resolution.eventId} disableGutters alignItems="flex-start">
              <ListItemText
                primary={(
                  <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1}}>
                    <Typography variant="subtitle2" color="text.primary">
                      {resolution.name}
                    </Typography>
                    <Chip
                      size="small"
                      color={resolution.action === 'delete' ? 'error' : resolution.action === 'split' ? 'warning' : 'info'}
                      label={getActionLabel(resolution.action)}
                    />
                  </Box>
                )}
                secondary={
                  <Box component="span" sx={{display: 'block'}}>
                    <Typography component="span" variant="body2" color="text.secondary" sx={{display: 'block'}}>
                      Current: {formatRange(resolution.originalRange)}
                    </Typography>
                    <Typography component="span" variant="body2" color="text.primary" sx={{display: 'block'}}>
                      Result: {formatResult(resolution)}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" disabled={loading}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
