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
  CircularProgress,
  Dialog,
  IconButton,
  MenuItem,
  Select,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ghostImgRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
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

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: FacingMode) => {
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraError(false);
    } catch {
      setCameraError(true);
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

  // ── rAF draw loop ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (stage !== 'capture' || cameraError) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function draw() {
      if (!canvas || !video || !ctx) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      const w = canvas.width;
      const h = canvas.height;

      // Mirror front camera (selfie-style)
      if (facingMode === 'user') {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, w, h);

      if (facingMode === 'user') ctx.restore();

      // Ghost overlay
      if (ghostImgRef.current) {
        ctx.globalAlpha = GHOST_ALPHA;
        ctx.drawImage(ghostImgRef.current, 0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [stage, cameraError, facingMode]);

  // ── Countdown ─────────────────────────────────────────────────────────────

  function clearCountdown() {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  }

  function captureSnapshot() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      capturedBlobRef.current = blob;
      stopStream();
      clearCountdown();
      setStage('adjust');
      // Init adjust transform
      gestureRef.current = { ...gestureRef.current, dx: 0, dy: 0, scale: 1, dragging: false, pinching: false };
    }, 'image/jpeg', 0.92);
  }

  function handleCapture() {
    if (countdown !== null) return; // already counting
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      ctx.drawImage(adjustImgRef.current, -w / 2, -h / 2, w, h);
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
      ctx.drawImage(adjustImgRef.current, -w / 2, -h / 2, w, h);
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

  const title = `${stage === 'adjust' ? 'Adjust — ' : ''}${ANGLE_LABELS[angle]}`;

  return (
    <Dialog
      open
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      onClose={onClose}
      slotProps={{ paper: { sx: { bgcolor: 'black' } } }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 1,
          py: 0.5,
          color: 'white',
        }}
      >
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
        <Typography variant="subtitle1" sx={{ flex: 1, textAlign: 'center' }}>
          {title}
        </Typography>
        {stage === 'capture' && !cameraError && (
          <IconButton onClick={handleFlip} sx={{ color: 'white' }}>
            <FlipCameraIosIcon />
          </IconButton>
        )}
        {(stage === 'adjust' || (stage === 'capture' && cameraError)) && (
          <Box sx={{ width: 40 }} /> /* spacer */
        )}
      </Box>

      {/* ── Capture stage ── */}
      {stage === 'capture' && (
        <>
          {/* Hidden video element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ display: 'none' }}
          />

          {/* Canvas viewport */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: '3/4',
              bgcolor: '#111',
              cursor: countdown !== null ? 'pointer' : 'default',
            }}
            onClick={handleCancelCountdown}
          >
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
              <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            )}

            {/* Countdown overlay */}
            {countdown !== null && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0,0,0,0.35)',
                  pointerEvents: 'none',
                }}
              >
                <Typography variant="h1" sx={{ color: 'white', fontWeight: 700, fontSize: '5rem' }}>
                  {countdown}
                </Typography>
              </Box>
            )}

            {/* Ghost hint */}
            {ghostUrl && (
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                Align with last week ↑
              </Typography>
            )}
          </Box>

          {/* Controls */}
          {!cameraError && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                py: 2,
                px: 2,
              }}
            >
              {/* Delay picker */}
              <Select
                size="small"
                value={delay}
                onChange={e => setDelay(Number(e.target.value))}
                sx={{
                  color: 'white',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'grey.700' },
                  '.MuiSvgIcon-root': { color: 'white' },
                  minWidth: 80,
                }}
              >
                {DELAY_OPTIONS.map(d => (
                  <MenuItem key={d} value={d}>{d === 0 ? 'Off' : `${d}s`}</MenuItem>
                ))}
              </Select>

              {/* Capture button */}
              <IconButton
                onClick={handleCapture}
                disabled={countdown !== null}
                sx={{
                  bgcolor: 'white',
                  width: 64,
                  height: 64,
                  '&:hover': { bgcolor: 'grey.200' },
                  '&.Mui-disabled': { bgcolor: 'grey.600' },
                }}
              >
                <CameraAltIcon sx={{ fontSize: 32, color: 'black' }} />
              </IconButton>

            </Box>
          )}
        </>
      )}

      {/* ── Adjust stage ── */}
      {stage === 'adjust' && (
        <>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: '3/4',
              bgcolor: '#111',
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
            {ghostUrl && (
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.7)',
                  pointerEvents: 'none',
                }}
              >
                Pinch &amp; drag to align
              </Typography>
            )}
          </Box>

          {uploadError && (
            <Typography variant="caption" color="error" sx={{ textAlign: 'center', py: 1 }}>
              {uploadError}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 2, p: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleRetake}
              disabled={uploading}
              sx={{ color: 'white', borderColor: 'grey.600' }}
            >
              Retake
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSave}
              disabled={uploading}
              startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              Save
            </Button>
          </Box>
        </>
      )}
    </Dialog>
  );
}
