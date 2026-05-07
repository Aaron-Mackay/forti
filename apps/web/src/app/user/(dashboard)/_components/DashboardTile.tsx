'use client';

import {ReactNode} from 'react';
import {Box, Card, CardActionArea, CardContent, Typography} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Link from 'next/link';

type Props = {
  icon: ReactNode;
  title: string;
  href?: string;
  borderColor?: string;
  children: ReactNode;
};

export default function DashboardTile({icon, title, href, borderColor, children}: Props) {
  const inner = (
    <CardContent sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
        {icon}
        <Typography variant="overline" color="text.secondary" sx={{flexGrow: 1}}>
          {title}
        </Typography>
        {href && <ChevronRightIcon fontSize="small" color="action" />}
      </Box>
      {children}
    </CardContent>
  );

  return (
    <Card variant="outlined" sx={{height: '100%', borderColor}}>
      {href ? (
        <CardActionArea component={Link} href={href} sx={{height: '100%'}}>
          {inner}
        </CardActionArea>
      ) : (
        inner
      )}
    </Card>
  );
}
