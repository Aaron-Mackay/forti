'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import MuiModal from '@mui/material/Modal';
import useMediaQuery from '@mui/material/useMediaQuery';
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { signalTokens, type SignalSurfaceMode } from '@lib/signal/tokens';
import { useSignalSurface } from '../SignalSurfaceContext';
import { ModalShellRoot, DrawerShellRoot } from './shells';
import { ActionsBlock, CloseButton, type OverlayAction } from './actions';
import { Grip } from './grip';

export type OverlayStatus =
  | { state: 'loaded' }
  | { state: 'loading'; cachedAt?: number }
  | { state: 'error'; onRetry: () => void; message?: string };

export type { OverlayAction };

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  status?: OverlayStatus;
  dirty?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  dismissOnBackdrop?: boolean;
  children: ReactNode;
  primaryAction?: OverlayAction;
  secondaryAction?: OverlayAction;
  ghostAction?: OverlayAction;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  accent?: boolean;
  height?: 'compact' | 'tall';
  dismissOnGripDrag?: boolean;
}

const SIZE_MAP = { sm: 480, md: 640, lg: 780, xl: 960 } as const;
const DESKTOP_BP = signalTokens.space.desktopBreakpointPx;
const MODAL_HEADER_H = 64;
const MODAL_FOOTER_H = 64;
const DRAWER_HEADER_H = 78;

function CloseGlyph({ surface }: { surface: SignalSurfaceMode }) {
  const color = signalTokens.surface[surface].inkMid;
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <path d="M1 1 L9 9 M9 1 L1 9" stroke={color} strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  );
}

type HeaderProps = {
  eyebrow?: string;
  eyebrowId: string;
  title: string;
  titleId: string;
  surface: SignalSurfaceMode;
  variant: 'modal' | 'drawer';
  onClose: () => void;
  discardHint: boolean;
};

function Header({
  eyebrow,
  eyebrowId,
  title,
  titleId,
  surface,
  variant,
  onClose,
  discardHint,
}: HeaderProps) {
  const palette = signalTokens.surface[surface];
  const headerHeight = variant === 'modal' ? MODAL_HEADER_H : DRAWER_HEADER_H;
  const titleSize = variant === 'modal' ? 22 : 20;

  return (
    <div
      style={{
        height: headerHeight,
        padding: variant === 'modal' ? '0 22px' : '0 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${palette.border}`,
        flexShrink: 0,
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        {eyebrow && (
          <span
            id={eyebrowId}
            style={{
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 11,
              color: palette.inkMid,
              letterSpacing: 0.5,
              textTransform: 'none',
              lineHeight: 1.2,
            }}
          >
            {eyebrow}
          </span>
        )}
        <h2
          id={titleId}
          style={{
            fontFamily: signalTokens.fontVar.cond,
            fontSize: titleSize,
            fontWeight: 500,
            color: palette.ink,
            margin: 0,
            lineHeight: 1.15,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {discardHint && (
          <span
            role="status"
            aria-live="polite"
            style={{
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 11,
              color: signalTokens.status.urgent,
              whiteSpace: 'nowrap',
            }}
          >
            Discard changes?
          </span>
        )}
        <CloseButton type="button" aria-label="Close" $surface={surface} onClick={onClose}>
          <CloseGlyph surface={surface} />
        </CloseButton>
      </div>
    </div>
  );
}

function ErrorBody({
  message,
  onRetry,
  surface,
}: {
  message?: string;
  onRetry: () => void;
  surface: SignalSurfaceMode;
}) {
  const palette = signalTokens.surface[surface];
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '18px 0',
      }}
    >
      <span
        style={{
          fontFamily: signalTokens.fontVar.mono,
          fontSize: 12,
          color: signalTokens.status.urgent,
          lineHeight: 1.4,
        }}
      >
        {message ?? "Couldn't load."}
      </span>
      <button
        type="button"
        onClick={onRetry}
        style={{
          alignSelf: 'flex-start',
          background: 'transparent',
          border: 'none',
          padding: 0,
          fontFamily: signalTokens.fontVar.body,
          fontSize: 13,
          color: palette.ink,
          textDecoration: 'underline',
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  );
}

export function Overlay({
  open,
  onClose,
  title,
  eyebrow,
  status = { state: 'loaded' },
  dirty = false,
  initialFocusRef,
  dismissOnBackdrop = true,
  children,
  primaryAction,
  secondaryAction,
  ghostAction,
  size = 'md',
  accent = false,
  height = 'compact',
  dismissOnGripDrag = true,
}: OverlayProps) {
  const surface = useSignalSurface();
  const palette = signalTokens.surface[surface];
  const isDesktop = useMediaQuery(`(min-width: ${DESKTOP_BP}px)`, {
    defaultMatches: true,
    noSsr: false,
  });
  const titleId = useId();
  const eyebrowId = useId();

  const [discardHint, setDiscardHint] = useState(false);
  const [muiOpen, setMuiOpen] = useState(open);
  const [stillLoading, setStillLoading] = useState(false);
  const [skipSkeletonForCacheHit, setSkipSkeletonForCacheHit] = useState(false);
  const [modalBody, setModalBody] = useState<HTMLDivElement | null>(null);
  const [drawerBody, setDrawerBody] = useState<HTMLDivElement | null>(null);
  const dragControls = useDragControls();

  const isLoading = status.state === 'loading';
  const isError = status.state === 'error';

  useEffect(() => {
    if (open) {
      setMuiOpen(true);
      setDiscardHint(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setStillLoading(false);
      setSkipSkeletonForCacheHit(false);
      return;
    }
    if (!isLoading) {
      setStillLoading(false);
      return;
    }
    const cachedAt = status.state === 'loading' ? status.cachedAt : undefined;
    if (cachedAt && Date.now() - cachedAt < 60_000) {
      setSkipSkeletonForCacheHit(true);
    }
    const timer = window.setTimeout(() => setStillLoading(true), 2000);
    return () => window.clearTimeout(timer);
  }, [open, isLoading, status]);

  const handleClose = useCallback(() => {
    if (dirty) {
      setDiscardHint(true);
      return;
    }
    onClose();
  }, [dirty, onClose]);

  const handleMuiClose = useCallback(
    (_e: object, reason: 'backdropClick' | 'escapeKeyDown') => {
      if (reason === 'backdropClick' && !dismissOnBackdrop) return;
      if (dirty) {
        setDiscardHint(true);
        return;
      }
      onClose();
    },
    [dirty, dismissOnBackdrop, onClose],
  );

  const headerCloseClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const effectivePrimary: OverlayAction | undefined = useMemo(() => {
    if (isError && status.state === 'error') {
      return { label: 'Retry', onClick: status.onRetry };
    }
    return primaryAction;
  }, [isError, status, primaryAction]);

  const effectiveEyebrow =
    isLoading && stillLoading && !skipSkeletonForCacheHit ? 'Still loading…' : eyebrow;

  const activeBody = isDesktop ? modalBody : drawerBody;

  useEffect(() => {
    if (!open || !initialFocusRef) return;
    const id = window.requestAnimationFrame(() => {
      initialFocusRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, initialFocusRef]);

  const handleDrawerDragEnd = useCallback(
    (_e: unknown, info: PanInfo) => {
      if (!dismissOnGripDrag) return;
      if (info.offset.y > 80 || info.velocity.y > 500) {
        handleClose();
      }
    },
    [dismissOnGripDrag, handleClose],
  );

  const drawerMaxHeight = height === 'tall' ? '88vh' : '78vh';
  const modalWidth = SIZE_MAP[size];

  const modalFrameStyle: CSSProperties = {
    background: palette.surface,
    color: palette.ink,
    border: `1.5px solid ${palette.borderStrong}`,
    borderRadius: 4,
    boxShadow:
      surface === 'gym'
        ? '0 14px 30px -8px rgba(0,0,0,0.55), 0 2px 0 rgba(0,0,0,0.2)'
        : '0 14px 30px -8px rgba(15,14,11,0.22), 0 2px 0 rgba(15,14,11,0.04)',
    width: '100%',
    maxWidth: modalWidth,
    maxHeight: 'calc(100vh - 48px)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  };

  const accentRailStyle: CSSProperties = accent
    ? {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        background: signalTokens.signal.deep,
      }
    : { display: 'none' };

  const modalBodyStyle: CSSProperties = {
    flex: 1,
    minHeight: 56,
    overflowY: 'auto',
    padding: accent ? '0 22px 0 26px' : '0 22px',
    color: palette.ink,
    background: palette.surface,
  };

  const modalFooterStyle: CSSProperties = {
    height: MODAL_FOOTER_H,
    padding: '0 22px',
    display: 'flex',
    alignItems: 'center',
    background: palette.surfaceAlt,
    borderTop: `1px solid ${palette.border}`,
    flexShrink: 0,
  };

  const drawerFrameStyle: CSSProperties = {
    background: palette.surface,
    color: palette.ink,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderTop: `1px solid ${palette.borderStrong}`,
    boxShadow:
      surface === 'gym'
        ? '0 -8px 24px -4px rgba(0,0,0,0.45)'
        : '0 -8px 24px -4px rgba(15,14,11,0.22)',
    width: '100%',
    maxHeight: drawerMaxHeight,
    height: height === 'tall' ? '88vh' : 'auto',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  };

  const drawerBodyStyle: CSSProperties = {
    flex: 1,
    minHeight: 56,
    overflowY: 'auto',
    padding: '14px 18px',
    color: palette.ink,
    background: palette.surface,
  };

  const drawerFooterStyle: CSSProperties = {
    padding: '12px 18px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    background: palette.surface,
    borderTop: `1px solid ${palette.border}`,
    flexShrink: 0,
  };

  return (
    <MuiModal
      open={muiOpen}
      onClose={handleMuiClose}
      aria-labelledby={titleId}
      aria-describedby={eyebrow ? eyebrowId : undefined}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: isDesktop ? 'rgba(15,14,11,0.32)' : 'rgba(0,0,0,0.55)',
            backdropFilter: 'none',
          },
          transitionDuration: 150,
        },
      }}
      closeAfterTransition
    >
      <AnimatePresence
        onExitComplete={() => {
          if (!open) setMuiOpen(false);
        }}
      >
        {open && (
          <div style={{ position: 'fixed', inset: 0, outline: 'none' }} tabIndex={-1}>
            <ModalShellRoot>
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                key="modal"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={modalFrameStyle}
              >
                <div style={accentRailStyle} />
                <Header
                  eyebrow={effectiveEyebrow}
                  eyebrowId={eyebrowId}
                  title={title}
                  titleId={titleId}
                  surface={surface}
                  variant="modal"
                  onClose={headerCloseClick}
                  discardHint={discardHint}
                />
                <div style={modalBodyStyle} ref={setModalBody}>
                  {/* portal target — also rendered on first paint to avoid empty body height when not desktop */}
                </div>
                <div style={modalFooterStyle}>
                  <ActionsBlock
                    surface={surface}
                    variant="modal"
                    primary={effectivePrimary}
                    secondary={secondaryAction}
                    ghost={ghostAction}
                  />
                </div>
              </motion.div>
            </ModalShellRoot>

            <DrawerShellRoot>
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                key="drawer"
                drag={dismissOnGripDrag ? 'y' : false}
                dragControls={dragControls}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={handleDrawerDragEnd}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }}
                style={drawerFrameStyle}
              >
                <Grip
                  surface={surface}
                  onActivate={handleClose}
                  onPointerDown={(e) => {
                    if (dismissOnGripDrag) dragControls.start(e);
                  }}
                />
                <Header
                  eyebrow={effectiveEyebrow}
                  eyebrowId={`${eyebrowId}-d`}
                  title={title}
                  titleId={`${titleId}-d`}
                  surface={surface}
                  variant="drawer"
                  onClose={headerCloseClick}
                  discardHint={discardHint}
                />
                <div style={drawerBodyStyle} ref={setDrawerBody}>
                  {/* portal target */}
                </div>
                <div style={drawerFooterStyle}>
                  <ActionsBlock
                    surface={surface}
                    variant="drawer"
                    primary={effectivePrimary}
                    secondary={secondaryAction}
                    ghost={ghostAction}
                  />
                </div>
              </motion.div>
            </DrawerShellRoot>

            {activeBody &&
              createPortal(
                isError && status.state === 'error' ? (
                  <ErrorBody
                    message={status.message}
                    onRetry={status.onRetry}
                    surface={surface}
                  />
                ) : (
                  children
                ),
                activeBody,
              )}
          </div>
        )}
      </AnimatePresence>
    </MuiModal>
  );
}
