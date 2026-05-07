'use client';

import { useRef, useState } from 'react';
import { Box, CircularProgress, Divider, Typography } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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
  onPhotoRemoved: (angle: Angle) => void;
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
  uploading,
  deleting,
  onOpenCamera,
  onFileSelected,
  onRemovePhoto,
}: {
  angle: Angle;
  label: string;
  photoUrl: string | null;
  uploading: boolean;
  deleting: boolean;
  onOpenCamera: (angle: Angle) => void;
  onFileSelected: (angle: Angle, file: File) => void;
  onRemovePhoto: (angle: Angle) => void;
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
          /* Captured state — full thumbnail, tap to retake via camera */
          <Box
            onClick={() => onOpenCamera(angle)}
            sx={{ width: '100%', height: '100%', position: 'relative', cursor: 'pointer' }}
          >
            <Box
              component="img"
              src={photoUrl}
              alt={`${label} photo`}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                bgcolor: 'rgba(0,0,0,0.04)',
              }}
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
            <Box
              onClick={(event) => {
                event.stopPropagation();
                onRemovePhoto(angle);
              }}
              sx={{
                position: 'absolute',
                top: 4,
                left: 4,
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: 'rgba(0,0,0,0.6)',
                color: 'common.white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
              }}
            >
              {deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineIcon sx={{ fontSize: 18 }} />}
            </Box>
          </Box>
        ) : uploading || deleting ? (
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
              <CameraAltIcon sx={{ fontSize: 24, color: 'text.disabled' }} />
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
  onPhotoRemoved,
}: Props) {
  const [activeAngle, setActiveAngle] = useState<Angle | null>(null);
  const [activeUploadFile, setActiveUploadFile] = useState<File | null>(null);
  const [uploadingAngle, setUploadingAngle] = useState<Angle | null>(null);
  const [deletingAngle, setDeletingAngle] = useState<Angle | null>(null);

  const activeGhostUrl = activeAngle
    ? (previousPhotos?.[`${activeAngle}PhotoUrl`] ?? null)
    : null;

  function handleFileSelected(angle: Angle, file: File) {
    setUploadingAngle(angle);
    setActiveUploadFile(file);
    setActiveAngle(angle);
    setUploadingAngle(null);
  }

  async function handleRemovePhoto(angle: Angle) {
    setDeletingAngle(angle);
    try {
      const res = await fetch('/api/check-in/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angle }),
      });
      if (!res.ok) return;
      onPhotoRemoved(angle);
    } finally {
      setDeletingAngle(null);
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
            uploading={uploadingAngle === key}
            deleting={deletingAngle === key}
            onOpenCamera={setActiveAngle}
            onFileSelected={handleFileSelected}
            onRemovePhoto={handleRemovePhoto}
          />
        ))}
      </Box>

      {activeAngle && (
        <PhotoCaptureModal
          angle={activeAngle}
          ghostUrl={activeGhostUrl}
          initialFile={activeUploadFile}
          onClose={() => {
            setActiveAngle(null);
            setActiveUploadFile(null);
          }}
          onUploaded={(url: string) => {
            onPhotoUploaded(activeAngle, url);
            setActiveAngle(null);
            setActiveUploadFile(null);
          }}
        />
      )}
    </Box>
  );
}
