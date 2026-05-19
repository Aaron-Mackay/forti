'use client';

import {
  forwardRef,
  useId,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { signalTokens } from '@lib/signal/tokens';

const palette = signalTokens.surface.planning;

type Size = 'sm' | 'md';

function fieldStyle(size: Size, focused: boolean, disabled?: boolean): CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    appearance: 'none',
    background: palette.surface,
    border: `1px solid ${focused ? palette.borderStrong : palette.border}`,
    borderRadius: signalTokens.radii.cell,
    padding: size === 'sm' ? '6px 10px' : '8px 12px',
    fontFamily: signalTokens.fontVar.body,
    fontSize: size === 'sm' ? 13 : 14,
    lineHeight: 1.4,
    color: palette.ink,
    outline: 'none',
    opacity: disabled ? 0.5 : 1,
    transition: 'border-color 120ms ease-out',
  };
}

function labelStyle(): CSSProperties {
  return {
    display: 'block',
    fontFamily: signalTokens.fontVar.mono,
    fontSize: 10,
    color: signalTokens.signal.deep,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    marginBottom: 6,
  };
}

export interface SignalInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode;
  size?: Size;
}

export const SignalInput = forwardRef<HTMLInputElement, SignalInputProps>(function SignalInput(
  { label, size = 'md', id, disabled, onFocus, onBlur, style, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label ? (
        <label htmlFor={inputId} style={labelStyle()}>
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        disabled={disabled}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={{ ...fieldStyle(size, focused, disabled), ...style }}
        {...rest}
      />
    </div>
  );
});

export interface SignalTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: ReactNode;
  size?: Size;
}

export const SignalTextarea = forwardRef<HTMLTextAreaElement, SignalTextareaProps>(function SignalTextarea(
  { label, size = 'md', id, disabled, rows = 4, onFocus, onBlur, style, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label ? (
        <label htmlFor={inputId} style={labelStyle()}>
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        disabled={disabled}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={{ ...fieldStyle(size, focused, disabled), resize: 'vertical', ...style }}
        {...rest}
      />
    </div>
  );
});
