'use client';

import { useAppBar } from '@lib/providers/AppBarProvider';

/**
 * Renders nothing but sets the persistent AppBar title from within a server component page.
 * Drop this as a child anywhere in the page tree; the AppBarProvider (in protected-layout)
 * picks up the values and renders CustomAppBar once, above all page content.
 */
export default function AppBarTitle({ title, showBack = false }: { title: string; showBack?: boolean }) {
  useAppBar({ title, showBack });
  return null;
}
