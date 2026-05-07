'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  ClickAwayListener,
  Collapse,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { LibraryAsset, LibraryAssetType } from '@/generated/prisma/browser';
import { useState } from 'react';

const TYPE_META: Record<LibraryAssetType, { icon: React.ReactNode; label: string; color: string }> = {
  LINK: { icon: <LinkIcon fontSize="small" />, label: 'Link', color: '#1976d2' },
  DOCUMENT: { icon: <DescriptionOutlinedIcon fontSize="small" />, label: 'Document', color: '#7b1fa2' },
  IMAGE: { icon: <ImageOutlinedIcon fontSize="small" />, label: 'Image', color: '#388e3c' },
  VIDEO: { icon: <VideocamOutlinedIcon fontSize="small" />, label: 'Video', color: '#d32f2f' },
};

interface Props {
  asset: LibraryAsset;
  canDelete: boolean;
  canEdit: boolean;
  onOpen?: (() => void) | null;
  onEdit: () => void;
  onDelete: () => void;
}

export default function LibraryAssetCard({ asset, canDelete, canEdit, onOpen, onEdit, onDelete }: Props) {
  const meta = TYPE_META[asset.type];
  const hasUrl = Boolean(asset.url);
  const isLink = asset.type === 'LINK';
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const stopClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const preview = !isLink && asset.type !== 'DOCUMENT' && hasUrl ? (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: `${meta.color}10`,
        width: { xs: '100%', md: 156 },
        minWidth: { xs: '100%', md: 156 },
        aspectRatio: { xs: '16 / 9', md: '4 / 3' },
        alignSelf: { xs: 'stretch', md: 'flex-start' },
        flexShrink: 0,
      }}
    >
      {asset.type === 'IMAGE' ? (
        <Box
          component="img"
          src={asset.url!}
          alt={asset.title}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : asset.type === 'VIDEO' ? (
        <Box
          component="video"
          src={asset.url!}
          muted
          playsInline
          preload="metadata"
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : null}

      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{
          position: 'absolute',
          right: 8,
          bottom: 8,
          px: 1,
          py: 0.5,
          borderRadius: 99,
          bgcolor: 'rgba(18, 18, 18, 0.65)',
          color: 'common.white',
          backdropFilter: 'blur(6px)',
        }}
      >
        <OpenInNewIcon sx={{ fontSize: 14 }} />
        <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 600, lineHeight: 1 }}>
          Open
        </Typography>
      </Stack>
    </Box>
  ) : null;

  const cardContent = (
    <CardContent
      sx={{
        height: { xs: 'auto', md: '100%' },
        display: 'flex',
        flexDirection: 'column',
        pb: '12px !important',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems="stretch"
        spacing={1.5}
        flexGrow={1}
      >
        <Stack flexGrow={1} minWidth={0} spacing={0.75}>
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                bgcolor: `${meta.color}18`,
                color: meta.color,
                flexShrink: 0,
                mt: 0.25,
              }}
            >
              {meta.icon}
            </Stack>

            <Stack flexGrow={1} minWidth={0} spacing={0.75}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={0.75}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{
                    minHeight: { xs: 'auto', md: '2.8em' },
                    flexGrow: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.4,
                  }}
                >
                  {asset.title}
                </Typography>
                {(canEdit || canDelete) && (
                  <Stack direction="row" spacing={0.25} alignItems="center" sx={{ flexShrink: 0, ml: 1 }}>
                    {canEdit && !confirmingDelete && (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label="Edit asset"
                          onClick={(event) => {
                            stopClick(event);
                            onEdit();
                          }}
                          sx={{ color: 'text.disabled' }}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDelete && (
                      <ClickAwayListener onClickAway={() => setConfirmingDelete(false)}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {confirmingDelete ? (
                            <Button
                              size="small"
                              color="error"
                              variant="contained"
                              startIcon={<DeleteOutlineIcon fontSize="small" />}
                              aria-label="Confirm delete"
                              onClick={(event) => {
                                stopClick(event);
                                onDelete();
                              }}
                              sx={{
                                minWidth: 128,
                                px: 1.5,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                transition: (theme) =>
                                  theme.transitions.create(['min-width', 'padding', 'background-color', 'color'], {
                                    duration: theme.transitions.duration.shorter,
                                  }),
                              }}
                            >
                              Confirm
                            </Button>
                          ) : (
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                aria-label="Delete"
                                onClick={(event) => {
                                  stopClick(event);
                                  setConfirmingDelete(true);
                                }}
                                sx={{ color: 'text.disabled' }}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Collapse in={confirmingDelete} orientation="horizontal" collapsedSize={0}>
                            <Button
                              size="small"
                              variant="text"
                              color="inherit"
                              onClick={(event) => {
                                stopClick(event);
                                setConfirmingDelete(false);
                              }}
                              sx={{ minWidth: 'auto', px: 0.75, color: 'text.secondary' }}
                            >
                              Cancel
                            </Button>
                          </Collapse>
                        </Stack>
                      </ClickAwayListener>
                    )}
                  </Stack>
                )}
              </Stack>

              {asset.description && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    minHeight: { xs: 'auto', md: '2.7em' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {asset.description}
                </Typography>
              )}
              {!asset.description && <Box sx={{ minHeight: { xs: 0, md: '2.7em' } }} />}

              {isLink && hasUrl && (
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{
                    mt: { xs: 0.25, md: 'auto' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {asset.url}
                </Typography>
              )}
            </Stack>
          </Stack>
        </Stack>
        {preview}
      </Stack>
    </CardContent>
  );

  if (onOpen) {
    return (
      <Card
        role="button"
        tabIndex={0}
        aria-label={`Open ${asset.title}`}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen();
          }
        }}
        sx={{
          textDecoration: 'none',
          display: 'block',
          width: '100%',
          height: { xs: 'auto', md: '100%' },
          cursor: 'pointer',
          '&:hover': { boxShadow: 3 },
          transition: 'box-shadow 0.2s',
        }}
      >
        {cardContent}
      </Card>
    );
  }

  if (hasUrl) {
    return (
      <Card
        component="a"
        href={asset.url!}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          textDecoration: 'none',
          display: 'block',
          width: '100%',
          height: { xs: 'auto', md: '100%' },
          '&:hover': { boxShadow: 3 },
          transition: 'box-shadow 0.2s',
        }}
      >
        {cardContent}
      </Card>
    );
  }

  return <Card sx={{ width: '100%', height: { xs: 'auto', md: '100%' } }}>{cardContent}</Card>;
}
