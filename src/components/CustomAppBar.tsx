'use client';

import {
  AppBar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography
} from '@mui/material';
import Link from 'next/link';
import FortiIcon from 'public/forti-icon.svg'
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuIcon from "@mui/icons-material/Menu";
import BugReportIcon from '@mui/icons-material/BugReport';
import React, {ReactNode, useEffect, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import WorkoutIcon from '@mui/icons-material/FitnessCenterRounded';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from "@mui/icons-material/Add";
import SpecificPlan from '@mui/icons-material/InsertInvitation';
import {signOut, useSession} from "next-auth/react";

const APPBAR_HEIGHT = 56;
export const HEIGHT_EXC_APPBAR = `calc(100dvh - ${APPBAR_HEIGHT}px)`
export default function CustomAppBar(
  {
    title,
    onBack,
    showBack = false,
  }: {
    title: string;
    onBack?: () => void;
    showBack?: boolean;
  }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: session } = useSession();
  const pathname = usePathname();
  const [planNestedOpen, setPlanNestedOpen] = useState(() => pathname.includes('/plan'))
  const [planCount, setPlanCount] = useState<number | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.stopPropagation()
    setPlanNestedOpen(!planNestedOpen);
  };

  const router = useRouter();
  if (showBack && typeof onBack === 'undefined') {
    onBack = () => {
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 2) {
        const newPath = '/' + segments.slice(0, -1).join('/');
        router.push(newPath || '/');
      }
    }
  }

  // Close the drawer when the route changes so navigation completes before
  // the drawer unmounts (avoids a race condition in Next.js App Router where
  // closing the drawer mid-transition could cancel the router.push).
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // Step 2: Get session and user info


  // Step 3: Fetch plan count when session is available
  useEffect(() => {
    async function fetchPlanCount() {
      if (session?.user?.id) {
        try {
          const res = await fetch(`/api/plans/count`);
          if (res.ok) {
            const data = await res.json();
            setPlanCount(data.count);
          }
        } catch (_e) {
          setPlanCount(null);
        }
      }
    }
    fetchPlanCount();
  }, [session?.user?.id]);

  const ListLink = ({icon, text, href, disabled, nested}
                    : { icon: ReactNode, text: string, href: string, disabled?: boolean, nested?: boolean }) => {
    return (
      <ListItem disablePadding>
        <ListItemButton component={Link} href={href} disabled={disabled} selected={pathname === href}
                        sx={{pl: nested ? 4 : 2}}>
          <ListItemIcon>
            {icon}
          </ListItemIcon>
          <ListItemText primary={text}/>
        </ListItemButton>
      </ListItem>
    )
  }

  return (
    <>
      <AppBar position="fixed" color="primary" sx={{height: APPBAR_HEIGHT}} enableColorOnDark>
        <Toolbar
          sx={{
            minHeight: '56px !important', // forces 56px at all widths
          }}
        >
          {showBack
            ? <IconButton edge="start" color="inherit" aria-label="back" onClick={onBack} sx={{mr: 2}}>
              <ArrowBackIcon/>
            </IconButton>
            :
            <IconButton edge="start" color="inherit" aria-label="menu" onClick={() => setDrawerOpen(true)} sx={{mr: 2}}>
              <MenuIcon/>
            </IconButton>}
          <Typography variant="h6" noWrap component="div" sx={{flexGrow: 1}}>
            {title}
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar sx={{minHeight: APPBAR_HEIGHT}}/>
      <Drawer
        open={drawerOpen}
        variant="temporary"
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            height: '100dvh',
            width: 250,
            display: 'flex',
            flexDirection: 'column',
          }
        }}
      >
        {/* Header / Logo */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{p: 1.5}}>
          <FortiIcon style={{width: 50, height: 50}}/>
          <Typography variant="h5">Forti</Typography>
        </Stack>
        <Divider/>

        {/* Scrollable content */}
        <Box sx={{flexGrow: 1, overflowY: 'auto'}}>
          <List>
            <ListLink icon={<HomeIcon/>} text="Home" href="/user"/>
            <ListLink icon={<CalendarIcon/>} text="Calendar" href="/user/calendar"/>
            <ListLink icon={<WorkoutIcon/>} text="Training" href="/user/workout"/>
            {planCount
            ? <>
                <ListItemButton onClick={handleClick}>
                  <ListItemIcon><ListAltIcon/></ListItemIcon>
                  <ListItemText primary="Planning"/>
                  {planNestedOpen ? <ExpandLess/> : <ExpandMore/>}
                </ListItemButton>
                <Collapse in={planNestedOpen} timeout="auto" unmountOnExit>
                  <ListLink nested icon={<AddIcon/>} text="Build Plan" href="/user/plan/create"/>
                  <ListLink nested icon={<SpecificPlan/>} text="User Plans" href="/user/plan"/>
                </Collapse>
            </>
            : <ListLink icon={<AddIcon/>} text="Build Plan" href="/user/plan/create"/>}

          </List>
        </Box>

        <Divider/>

        {/* Fixed bottom logout */}
        <Box>
          <List>
            <ListLink icon={<BugReportIcon/>} text="Report Bug" href="/report-bug"/>
            <ListItem disablePadding>
              <ListItemButton onClick={() => signOut({callbackUrl: '/login'})}>
                <ListItemIcon><LogoutIcon/></ListItemIcon>
                <ListItemText primary="Log Out"/>
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </>
  );
}