'use client';
import { Grid, Button } from '@mui/material';
import Link from 'next/link';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ListAltIcon from '@mui/icons-material/ListAlt';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import MedicationIcon from '@mui/icons-material/Medication';

interface Props {
  clientId: string;
}

export default function ClientQuickLinks({ clientId }: Props) {
  const links = [
    { href: `/user/coach/clients/${clientId}/check-ins`, label: 'Check-ins', icon: <AssignmentTurnedInIcon /> },
    { href: `/user/coach/clients/${clientId}/plans`, label: 'Plans', icon: <ListAltIcon /> },
    { href: `/user/coach/clients/${clientId}/nutrition`, label: 'Nutrition', icon: <RestaurantRoundedIcon /> },
    { href: `/user/coach/clients/${clientId}/supplements`, label: 'Supplements', icon: <MedicationIcon /> },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      {links.map(({ href, label, icon }) => (
        <Grid size={6} key={href}>
          <Button
            component={Link}
            href={href}
            variant="outlined"
            fullWidth
            startIcon={icon}
            sx={{ justifyContent: 'flex-start', py: 1.5 }}
          >
            {label}
          </Button>
        </Grid>
      ))}
    </Grid>
  );
}
