'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';

import { getCoverDrawRect, getOrderedCameraDeviceIds } from './photoCaptureUtils';

type Angle = 'front' | 'back' | 'side';
type FacingMode = 'user' | 'environment';
type Stage = 'capture' | 'adjust';

const DELAY_OPTIONS = [0, 3, 5, 10] as const;
const GHOST_ALPHA = 0.3;

interface Props {
  angle: Angle;
  ghostUrl: string | null;
  onClose: () => void;
  onUploaded: (url: string) => void;
}

const ANGLE_LABELS: Record<Angle, string> = {
  front: 'Front Photo',
  back: 'Back Photo',
  side: 'Side Photo',
};

function resizeToMax(blob: Blob, maxLong: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const { width, height } = img;
      const longSide = Math.max(width, height);
      if (longSide <= maxLong) {
        URL.revokeObjectURL(url);
        resolve(blob);
        return;
      }
      const scale = maxLong / longSide;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas error')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.92);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load error')); };
    img.src = url;
  });
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  destWidth: number,
  destHeight: number,
  destX = 0,
  destY = 0,
) {
  const rect = getCoverDrawRect(sourceWidth, sourceHeight, destWidth, destHeight);
  if (!rect) return false;

  ctx.drawImage(
    image,
    rect.sx,
    rect.sy,
    rect.sw,
    rect.sh,
    destX,
    destY,
    destWidth,
    destHeight,
  );

  return true;
}

function MobileCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <IconButton
      onClick={onClose}
      aria-label="Close camera"
      sx={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        left: 8,
        zIndex: 2,
        color: 'white',
        bgcolor: 'rgba(0,0,0,0.5)',
        '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
      }}
    >
      <CloseIcon />
    </IconButton>
  );
}

function OverlayChip({
  label,
  onClick,
  disabled = false,
  clickable = true,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  clickable?: boolean;
}) {
  return (
    <Chip
      label={label}
      onClick={disabled || !clickable ? undefined : onClick}
      clickable={clickable && !disabled}
      disabled={disabled}
      sx={{
        bgcolor: 'rgba(0,0,0,0.55)',
        color: 'white',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.14)',
        cursor: clickable && !disabled ? 'pointer' : 'default',
        '& .MuiChip-label': {
          px: 1.25,
          fontWeight: 600,
        },
        '& .MuiTouchRipple-root': {
          display: clickable && !disabled ? 'block' : 'none',
        },
        '&.Mui-disabled': {
          opacity: 0.55,
          color: 'rgba(255,255,255,0.8)',
        },
      }}
    />
  );
}

export default function PhotoCaptureModal({ angle, ghostUrl, onClose, onUploaded }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [stage, setStage] = useState<Stage>('capture');
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [delay, setDelay] = useState<number>(3);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const ghostImgRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeDeviceIdRef = useRef<string | null>(null);
  const startRequestIdRef = useRef(0);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const capturedBlobRef = useRef<Blob | null>(null);

  // Adjust stage state (using refs to avoid re-renders during gestures)
  const adjustImgRef = useRef<HTMLImageElement | null>(null);
  const adjustCanvasRef = useRef<HTMLCanvasElement>(null);
  const gestureRef = useRef({
    dragging: false,
    lastX: 0,
    lastY: 0,
    pinching: false,
    lastDist: 0,
    dx: 0,
    dy: 0,
    scale: 1,
  });

  // ── Camera setup ──────────────────────────────────────────────────────────

  const stopStream = useCallback((invalidatePending = true) => {
    if (invalidatePending) {
      startRequestIdRef.current += 1;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    activeDeviceIdRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: FacingMode) => {
    const requestId = startRequestIdRef.current + 1;
    startRequestIdRef.current = requestId;
    setCameraError(false);
    stopStream(false);

    try {
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const candidateDeviceIds = getOrderedCameraDeviceIds(devices, facing, activeDeviceIdRef.current);
      const rawConstraints: Array<MediaStreamConstraints | null> = [
        ...candidateDeviceIds.map(deviceId => ({ video: { deviceId: { exact: deviceId } } })),
        { video: { facingMode: { exact: facing } } },
        { video: { facingMode: { ideal: facing } } },
        facing === 'user' ? { video: true } : null,
      ];
      const constraintsToTry = rawConstraints.filter((value): value is MediaStreamConstraints => value !== null);

      let stream: MediaStream | null = null;
      for (const constraints of constraintsToTry) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch {
          // Try the next fallback.
        }
      }

      if (!stream) throw new Error('Unable to start camera');
      if (requestId !== startRequestIdRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      activeDeviceIdRef.current = stream.getVideoTracks()[0]?.getSettings().deviceId ?? null;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => {
          // Some mobile browsers transiently reject play() despite a valid stream.
        });
      }
    } catch {
      if (requestId === startRequestIdRef.current) {
        setCameraError(true);
      }
    }
  }, [stopStream]);

  useEffect(() => {
    if (stage !== 'capture') return;
    startCamera(facingMode);
    return () => { stopStream(); };
  }, [stage, facingMode, startCamera, stopStream]);

  // Load ghost image once
  useEffect(() => {
    if (!ghostUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = ghostUrl;
    img.onload = () => { ghostImgRef.current = img; };
  }, [ghostUrl]);

  // ── Countdown ─────────────────────────────────────────────────────────────

  function clearCountdown() {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  }

  function captureSnapshot() {
    const video = videoRef.current;
    if (!video) return;

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (sourceWidth <= 0 || sourceHeight <= 0) return;

    const outputHeight = 1600;
    const outputWidth = Math.round((outputHeight * 3) / 4);
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.save();
      ctx.translate(outputWidth, 0);
      ctx.scale(-1, 1);
    }

    drawCoverImage(ctx, video, sourceWidth, sourceHeight, outputWidth, outputHeight);

    if (facingMode === 'user') ctx.restore();

    canvas.toBlob(blob => {
      if (!blob) return;
      capturedBlobRef.current = blob;
      stopStream();
      clearCountdown();
      setStage('adjust');
      gestureRef.current = { ...gestureRef.current, dx: 0, dy: 0, scale: 1, dragging: false, pinching: false };
    }, 'image/jpeg', 0.92);
  }

  function handleCapture() {
    if (countdown !== null) {
      clearCountdown();
      return;
    }
    if (delay === 0) {
      captureSnapshot();
      return;
    }
    setCountdown(delay);
    let remaining = delay;
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearCountdown();
        captureSnapshot();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }

  function handleCancelCountdown() {
    if (countdown !== null) clearCountdown();
  }

  function handleCycleDelay() {
    if (countdown !== null) return;
    const currentIndex = DELAY_OPTIONS.indexOf(delay as (typeof DELAY_OPTIONS)[number]);
    const nextIndex = (currentIndex + 1) % DELAY_OPTIONS.length;
    setDelay(DELAY_OPTIONS[nextIndex]);
  }

  // ── Flip camera ───────────────────────────────────────────────────────────

  function handleFlip() {
    setFacingMode(f => f === 'user' ? 'environment' : 'user');
  }

  // ── Adjust stage drawing ──────────────────────────────────────────────────

  useEffect(() => {
    if (stage !== 'adjust') return;
    const blob = capturedBlobRef.current;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { adjustImgRef.current = img; drawAdjust(); };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [stage]);

  function drawAdjust() {
    const canvas = adjustCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const w = canvas.width;
    const h = canvas.height;
    const { dx, dy, scale } = gestureRef.current;
    ctx.clearRect(0, 0, w, h);

    // Ghost
    if (ghostImgRef.current) {
      ctx.globalAlpha = GHOST_ALPHA;
      ctx.drawImage(ghostImgRef.current, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    // Captured photo with transform
    if (adjustImgRef.current) {
      ctx.save();
      ctx.translate(w / 2 + dx, h / 2 + dy);
      ctx.scale(scale, scale);
      drawCoverImage(ctx, adjustImgRef.current, adjustImgRef.current.width, adjustImgRef.current.height, w, h, -w / 2, -h / 2);
      ctx.restore();
    }
  }

  // Touch / pointer gesture handlers for adjust stage
  function onPointerDown(e: React.PointerEvent) {
    const g = gestureRef.current;
    if (e.isPrimary) {
      g.dragging = true;
      g.lastX = e.clientX;
      g.lastY = e.clientY;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const g = gestureRef.current;
    if (g.dragging && e.isPrimary) {
      g.dx += e.clientX - g.lastX;
      g.dy += e.clientY - g.lastY;
      g.lastX = e.clientX;
      g.lastY = e.clientY;
      drawAdjust();
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (e.isPrimary) gestureRef.current.dragging = false;
  }

  function onWheel(e: React.WheelEvent) {
    // Desktop pinch-to-zoom via wheel
    const g = gestureRef.current;
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    g.scale = Math.max(0.5, Math.min(4, g.scale + delta));
    drawAdjust();
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setUploading(true);
    setUploadError(null);
    try {
      // Render final image to offscreen canvas (no ghost)
      const adjustCanvas = adjustCanvasRef.current;
      if (!adjustCanvas || !adjustImgRef.current) throw new Error('No image');

      const offscreen = document.createElement('canvas');
      offscreen.width = adjustCanvas.width;
      offscreen.height = adjustCanvas.height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) throw new Error('canvas error');

      const w = offscreen.width;
      const h = offscreen.height;
      const { dx, dy, scale } = gestureRef.current;
      ctx.save();
      ctx.translate(w / 2 + dx, h / 2 + dy);
      ctx.scale(scale, scale);
      drawCoverImage(ctx, adjustImgRef.current, adjustImgRef.current.width, adjustImgRef.current.height, w, h, -w / 2, -h / 2);
      ctx.restore();

      const blob: Blob = await new Promise((resolve, reject) =>
        offscreen.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.92)
      );

      const resized = await resizeToMax(blob, 1080);

      const formData = new FormData();
      formData.append('angle', angle);
      formData.append('file', resized, `${angle}.jpg`);

      const res = await fetch('/api/check-in/photos', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Upload failed');
      }
      const { url } = await res.json() as { url: string };
      onUploaded(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleRetake() {
    capturedBlobRef.current = null;
    adjustImgRef.current = null;
    setStage('capture');
    setUploadError(null);
  }

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopStream();
      clearCountdown();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const title = `${stage === 'adjust' ? 'Adjust - ' : ''}${ANGLE_LABELS[angle]}`;
  const delayLabel = delay === 0 ? 'Timer Off' : `Timer ${delay}s`;

  return (
    <Dialog
      open
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      onClose={onClose}
      sx={{ zIndex: 1500 }}
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'black',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: fullScreen ? '100%' : 520,
          maxHeight: '100dvh',
          height: fullScreen ? '100dvh' : 'min(100dvh, calc((100vw - 64px) * 4 / 3))',
          aspectRatio: fullScreen ? 'auto' : '3/4',
          bgcolor: '#111',
          cursor: countdown !== null ? 'pointer' : 'default',
          overflow: 'hidden',
        }}
        onClick={handleCancelCountdown}
      >
        <MobileCloseButton onClose={onClose} />

        {stage === 'capture' && (
          <>
            {cameraError ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 2,
                  color: 'grey.500',
                  p: 3,
                }}
              >
                <CameraAltIcon sx={{ fontSize: 48 }} />
                <Typography variant="body2" align="center">
                  Camera access denied or unavailable. Use the Upload button on the slot to pick a photo from your library.
                </Typography>
              </Box>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    objectFit: 'cover',
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  }}
                />
                {ghostUrl && (
                  <Box
                    component="img"
                    src={ghostUrl}
                    alt=""
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: GHOST_ALPHA,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </>
            )}
          </>
        )}

        {stage === 'adjust' && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              touchAction: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onWheel={onWheel}
          >
            <canvas
              ref={adjustCanvasRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </Box>
        )}

        <Box
          sx={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
            left: 56,
            right: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <Box sx={{ pointerEvents: 'auto' }}>
            <OverlayChip label={title} clickable={false} />
        </Box>
      </Box>

        {stage === 'capture' && !cameraError && (
          <Box
            sx={{
              position: 'absolute',
              top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
              right: 12,
              display: 'flex',
              gap: 1,
              alignItems: 'center',
            }}
          >
            <OverlayChip label={delayLabel} onClick={handleCycleDelay} disabled={countdown !== null} />
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                handleFlip();
              }}
              sx={{
                color: 'white',
                bgcolor: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.14)',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.68)' },
              }}
            >
              <FlipCameraIosIcon />
            </IconButton>
          </Box>
        )}

        {countdown !== null && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.28)',
              pointerEvents: 'none',
            }}
          >
            <Typography variant="h1" sx={{ color: 'white', fontWeight: 700, fontSize: '5rem' }}>
              {countdown}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            position: 'absolute',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            left: 0,
            right: 0,
            px: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {stage === 'capture' && ghostUrl && (
            <OverlayChip label="Align with last week" />
          )}

          {stage === 'adjust' && ghostUrl && (
            <OverlayChip label="Pinch and drag to align" />
          )}

          {uploadError && (
            <OverlayChip label={uploadError} />
          )}

          {stage === 'capture' && !cameraError && (
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                handleCapture();
              }}
              sx={{
                bgcolor: countdown !== null ? 'rgba(255,255,255,0.82)' : 'white',
                width: 72,
                height: 72,
                border: '4px solid rgba(0,0,0,0.18)',
                '&:hover': { bgcolor: 'grey.200' },
              }}
            >
              {countdown !== null ? (
                <CloseIcon sx={{ fontSize: 32, color: 'black' }} />
              ) : (
                <CameraAltIcon sx={{ fontSize: 34, color: 'black' }} />
              )}
            </IconButton>
          )}

          {stage === 'adjust' && (
            <Box sx={{ display: 'flex', gap: 1.25, width: '100%', maxWidth: 320 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={(event) => {
                  event.stopPropagation();
                  handleRetake();
                }}
                disabled={uploading}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.25)',
                  bgcolor: 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                Retake
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={(event) => {
                  event.stopPropagation();
                  void handleSave();
                }}
                disabled={uploading}
                startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : undefined}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.9)',
                  color: 'black',
                  '&:hover': { bgcolor: 'white' },
                }}
              >
                Save
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  );
}
