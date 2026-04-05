'use client';

import {
  Button,
  Card,
  CardContent,
  Chip,
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
import { LibraryAsset, LibraryAssetType } from '@prisma/client';
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
  onDelete: () => void;
}

export default function LibraryAssetCard({ asset, canDelete, onDelete }: Props) {
  const meta = TYPE_META[asset.type];
  const hasUrl = Boolean(asset.url);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const stopClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const cardContent = (
    <CardContent sx={{ pb: '12px !important' }}>
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

        <Stack flexGrow={1} minWidth={0} spacing={0.5}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={0.75}>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{
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
            {canDelete && (
              <>
                {confirmingDelete ? (
                  <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
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
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      onClick={(event) => {
                        stopClick(event);
                        onDelete();
                      }}
                      sx={{ minWidth: 'auto', px: 1.25 }}
                    >
                      Delete?
                    </Button>
                  </Stack>
                ) : (
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        stopClick(event);
                        setConfirmingDelete(true);
                      }}
                      sx={{ flexShrink: 0, mt: -0.5, mr: -0.5, color: 'text.disabled' }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}
          </Stack>

          {asset.description && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
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

          <Chip
            label={meta.label}
            size="small"
            sx={{ alignSelf: 'flex-start', mt: 0.5, fontSize: '0.65rem', height: 20 }}
          />

          {hasUrl && (
            <Typography
              variant="caption"
              color="primary"
              sx={{
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
    </CardContent>
  );

  if (hasUrl) {
    return (
      <Card
        component="a"
        href={asset.url!}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ textDecoration: 'none', display: 'block', '&:hover': { boxShadow: 3 }, transition: 'box-shadow 0.2s' }}
      >
        {cardContent}
      </Card>
    );
  }

  return <Card>{cardContent}</Card>;
}
