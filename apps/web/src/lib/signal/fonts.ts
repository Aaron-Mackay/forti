import { Inter_Tight, Archivo_Narrow, JetBrains_Mono } from 'next/font/google';

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--signal-font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const archivoNarrow = Archivo_Narrow({
  subsets: ['latin'],
  variable: '--signal-font-cond',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--signal-font-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const signalFontVariablesClassName = [
  interTight.variable,
  archivoNarrow.variable,
  jetBrainsMono.variable,
].join(' ');
