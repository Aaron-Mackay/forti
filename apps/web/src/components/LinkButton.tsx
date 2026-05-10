'use client';

import React from 'react';
import Link from 'next/link';
import Button, { ButtonProps } from '@mui/material/Button';

interface LinkButtonProps extends ButtonProps {
  href: string;
}

export default function LinkButton({ href, children, ...props }: LinkButtonProps) {
  return (
    <Button
      component={Link}
      href={href}
      {...props}
    >
      {children}
    </Button>
  );
}
