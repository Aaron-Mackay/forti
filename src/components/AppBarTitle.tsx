'use client';

import { useAppBar } from '@lib/providers/AppBarProvider';
import { useRouter } from 'next/navigation';

/**
 * Renders nothing but sets the persistent AppBar title from within a server component page.
 * Drop this as a child anywhere in the page tree; the AppBarProvider (in protected-layout)
 * picks up the values and renders CustomAppBar once, above all page content.
 */
export default function AppBarTitle(
  { title, showBack = false, backHref }: { title: string; showBack?: boolean; backHref?: string }
) {
  const router = useRouter();
  useAppBar({
    title,
    showBack,
    onBack: showBack && backHref ? () => router.push(backHref) : undefined,
  });
  return null;
}
