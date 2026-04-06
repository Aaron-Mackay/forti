'use client';

import { useRef, useState } from 'react';
import { Box, CircularProgress, Divider, Typography } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { PreviousPhotos } from '@/types/checkInTypes';
import PhotoCaptureModal from './PhotoCaptureModal';

type Angle = 'front' | 'back' | 'side';

interface PhotoUrls {
  front: string | null;
  back: string | null;
  side: string | null;
}

interface Props {
  currentPhotos: PhotoUrls;
  previousPhotos: PreviousPhotos | null;
  weekStart: string;
  onPhotoUploaded: (angle: Angle, url: string) => void;
}

const ANGLES: { key: Angle; label: string }[] = [
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'side', label: 'Side' },
];

function PhotoSlot({
  angle,
  label,
  photoUrl,
  previousUrl,
  uploading,
  onOpenCamera,
  onFileSelected,
}: {
  angle: Angle;
  label: string;
  photoUrl: string | null;
  previousUrl: string | null;
  uploading: boolean;
  onOpenCamera: (angle: Angle) => void;
  onFileSelected: (angle: Angle, file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box
        sx={{
          width: '100%',
          aspectRatio: '1',
          border: '1px dashed',
          borderColor: photoUrl ? 'success.main' : 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          position: 'relative',
          bgcolor: 'action.hover',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {photoUrl ? (
          /* Captured state — full thumbnail, click to retake via camera */
          <Box
            onClick={() => onOpenCamera(angle)}
            sx={{ width: '100%', height: '100%', position: 'relative', cursor: 'pointer' }}
          >
            <Box
              component="img"
              src={photoUrl}
              alt={`${label} photo`}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                bgcolor: 'background.paper',
                borderRadius: '50%',
                lineHeight: 0,
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
            </Box>
          </Box>
        ) : uploading ? (
          <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          /* Empty state — camera (top half), divider, upload (bottom half) */
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 0.5, gap: 0.5 }}>
            <Box
              onClick={() => onOpenCamera(angle)}
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: 0.5,
                '&:hover': { bgcolor: 'action.selected' },
              }}
            >
              <CameraAltIcon sx={{ fontSize: 24, color: previousUrl ? 'primary.main' : 'text.disabled' }} />
            </Box>

            <Divider />

            <Box
              component="label"
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: 0.5,
                '&:hover': { bgcolor: 'action.selected' },
              }}
            >
              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) onFileSelected(angle, file);
                  e.target.value = '';
                }}
              />
              <FileUploadIcon sx={{ fontSize: 24, color: 'text.disabled' }} />
            </Box>
          </Box>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

export default function ProgressPhotoSection({
  currentPhotos,
  previousPhotos,
  onPhotoUploaded,
}: Props) {
  const [activeAngle, setActiveAngle] = useState<Angle | null>(null);
  const [uploadingAngle, setUploadingAngle] = useState<Angle | null>(null);

  const activeGhostUrl = activeAngle
    ? (previousPhotos?.[`${activeAngle}PhotoUrl`] ?? null)
    : null;

  async function handleFileSelected(angle: Angle, file: File) {
    setUploadingAngle(angle);
    try {
      const formData = new FormData();
      formData.append('angle', angle);
      formData.append('file', file);
      const res = await fetch('/api/check-in/photos', { method: 'POST', body: formData });
      if (!res.ok) return;
      const { url } = await res.json() as { url: string };
      onPhotoUploaded(angle, url);
    } finally {
      setUploadingAngle(null);
    }
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        Progress Photos{' '}
        <Typography component="span" variant="caption" color="text.secondary">
          (optional)
        </Typography>
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {ANGLES.map(({ key, label }) => (
          <PhotoSlot
            key={key}
            angle={key}
            label={label}
            photoUrl={currentPhotos[key]}
            previousUrl={previousPhotos?.[`${key}PhotoUrl`] ?? null}
            uploading={uploadingAngle === key}
            onOpenCamera={setActiveAngle}
            onFileSelected={handleFileSelected}
          />
        ))}
      </Box>

      {activeAngle && (
        <PhotoCaptureModal
          angle={activeAngle}
          ghostUrl={activeGhostUrl}
          onClose={() => setActiveAngle(null)}
          onUploaded={(url: string) => {
            onPhotoUploaded(activeAngle, url);
            setActiveAngle(null);
          }}
        />
      )}
    </Box>
  );
}
