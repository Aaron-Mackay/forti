'use client';

import {
  AppBar,
  Badge,
  Box,
  Chip,
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
import FeedbackIcon from '@mui/icons-material/Feedback';
import React, {ReactNode, useEffect, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import WorkoutIcon from '@mui/icons-material/FitnessCenterRounded';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from "@mui/icons-material/Add";
import SpecificPlan from '@mui/icons-material/InsertInvitation';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import ChecklistIcon from '@mui/icons-material/Checklist';
import GroupIcon from '@mui/icons-material/Group';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import MedicationIcon from '@mui/icons-material/Medication';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChecklistIcon2 from '@mui/icons-material/AssignmentTurnedIn';
import {signOut} from "next-auth/react";
import {useSettings} from '@lib/providers/SettingsProvider';
import {useCoachClients} from '@lib/providers/CoachClientsProvider';
import {usePlanCount} from '@lib/hooks/api/usePlanCount';
import {useNotifications} from '@lib/hooks/api/useNotifications';

export const APPBAR_HEIGHT = 56;
export const HEIGHT_EXC_APPBAR = `calc(100dvh - ${APPBAR_HEIGHT}px)`
export default function CustomAppBar(
  {
    title,
    onBack,
    showBack = false,
    noSpacer = false,
  }: {
    title: string;
    onBack?: () => void;
    showBack?: boolean;
    /** When true, omits the spacer <Toolbar> that pushes content below the fixed bar. */
    noSpacer?: boolean;
  }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pathname = usePathname();
  const { settings, loading: settingsLoading } = useSettings();
  const { clients } = useCoachClients();
  const [planNestedOpen, setPlanNestedOpen] = useState(() => pathname.includes('/plan'))
  const planCount = usePlanCount();
  const { unreadCount } = useNotifications();

  // Detect client focus mode from URL pattern
  const clientMatch = pathname?.match(/^\/user\/coach\/clients\/([^/]+)/);
  const activeClientId = clientMatch?.[1];
  const activeClient = activeClientId ? clients.find(c => c.id === activeClientId) : undefined;

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.stopPropagation()
    setPlanNestedOpen(!planNestedOpen);
  };

  const router = useRouter();
  if (showBack && typeof onBack === 'undefined') {
    onBack = () => {
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 1) {
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


  const ListLink = ({icon, text, href, disabled, nested, isActive}
                    : { icon: ReactNode, text: string, href: string, disabled?: boolean, nested?: boolean, isActive?: boolean }) => {
    const selected = isActive !== undefined ? isActive : pathname === href;
    return (
      <ListItem disablePadding>
        <ListItemButton component={Link} href={href} disabled={disabled} selected={selected}
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
      <AppBar position="fixed" color="primary" sx={{height: APPBAR_HEIGHT, zIndex: 1400}} enableColorOnDark>
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
              <Badge badgeContent={unreadCount} color="error" max={99}>
                <MenuIcon/>
              </Badge>
            </IconButton>}
          <Typography variant="h6" noWrap component="div" sx={{flexGrow: 1}}>
            {title}
          </Typography>
        </Toolbar>
      </AppBar>
      {!noSpacer && <Toolbar sx={{minHeight: APPBAR_HEIGHT}}/>}
      <Drawer
        open={drawerOpen}
        variant="temporary"
        onClose={() => setDrawerOpen(false)}
        sx={{ zIndex: 1500 }}
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
          <Chip label="Beta" size="small" sx={{bgcolor: "rgba(45,127,249,0.15)", color: "rgb(45,127,249)", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", border: "none", height: 20, flexShrink: 0}}/>
          <Box sx={{flexGrow: 1}}/>
          <IconButton component={Link} href="/user/notifications" color="inherit" size="small" aria-label="notifications">
            <Badge badgeContent={unreadCount} color="error" max={99}>
              <NotificationsIcon/>
            </Badge>
          </IconButton>
        </Stack>
        <Divider/>

        {/* Scrollable content */}
        <Box sx={{flexGrow: 1, overflowY: 'auto'}}>
          {activeClient ? (
            /* Client Focus Mode nav */
            <List>
              <ListItem disablePadding>
                <ListItemButton component={Link} href="/user/coach/clients">
                  <ListItemIcon><ArrowBackIcon/></ListItemIcon>
                  <ListItemText primary="My nav"/>
                </ListItemButton>
              </ListItem>
              <Divider sx={{my: 0.5}}/>
              <ListItem sx={{py: 0.5}}>
                <ListItemIcon><PersonIcon color="primary"/></ListItemIcon>
                <ListItemText
                  primary={activeClient.name ?? 'Client'}
                  primaryTypographyProps={{fontWeight: 600, color: 'primary.main'}}
                />
              </ListItem>
              <Divider sx={{my: 0.5}}/>
              <ListLink
                icon={<DashboardIcon/>}
                text="Overview"
                href={`/user/coach/clients/${activeClientId}`}
                isActive={pathname === `/user/coach/clients/${activeClientId}`}
              />
              <ListLink
                icon={<ChecklistIcon2/>}
                text="Check-ins"
                href={`/user/coach/clients/${activeClientId}/check-ins`}
                isActive={pathname.startsWith(`/user/coach/clients/${activeClientId}/check-ins`)}
              />
              <ListLink
                icon={<ListAltIcon/>}
                text="Plans"
                href={`/user/coach/clients/${activeClientId}/plans`}
                isActive={pathname.startsWith(`/user/coach/clients/${activeClientId}/plans`)}
              />
              <ListLink
                icon={<RestaurantRoundedIcon/>}
                text="Nutrition"
                href={`/user/coach/clients/${activeClientId}/nutrition`}
                isActive={pathname.startsWith(`/user/coach/clients/${activeClientId}/nutrition`)}
              />
              <ListLink
                icon={<MedicationIcon/>}
                text="Supplements"
                href={`/user/coach/clients/${activeClientId}/supplements`}
                isActive={pathname.startsWith(`/user/coach/clients/${activeClientId}/supplements`)}
              />
            </List>
          ) : (
            /* Normal nav */
            <List>
              <ListLink icon={<HomeIcon/>} text="Home" href="/user"/>
              <ListLink icon={<CalendarIcon/>} text="Calendar" href="/user/calendar"/>
              <ListLink icon={<WorkoutIcon/>} text="Training" href="/user/workout"/>
              <ListLink icon={<ChecklistIcon/>} text="Check-in" href="/user/check-in"/>
              <ListLink icon={<RestaurantRoundedIcon/>} text="Nutrition" href="/user/nutrition"/>
              {!settingsLoading && settings.showSupplements && (
                <ListLink icon={<MedicationIcon/>} text="Supplements" href="/user/supplements"/>
              )}
              <ListLink icon={<LibraryBooksIcon/>} text="Exercises" href="/exercises"/>
              <ListLink icon={<BookmarksIcon/>} text="Library" href="/library"/>
              <ListLink icon={<SchoolIcon/>} text="Learning Plans" href="/user/learning-plans"/>
              {!settingsLoading && settings.coachModeActive && (
                <ListLink icon={<GroupIcon/>} text="Clients" href="/user/coach/clients"/>
              )}
              {!settingsLoading && settings.coachModeActive && (
                <ListLink icon={<SchoolIcon/>} text="Coach Learning Plans" href="/user/coach/learning-plans"/>
              )}
              {planCount == null ? null : planCount > 0
                ? <>
                  <ListItemButton onClick={handleClick}>
                    <ListItemIcon><ListAltIcon/></ListItemIcon>
                    <ListItemText primary="Planning"/>
                    {planNestedOpen ? <ExpandLess/> : <ExpandMore/>}
                  </ListItemButton>
                  <Collapse in={planNestedOpen} timeout="auto" unmountOnExit>
                    <ListLink nested icon={<AddIcon/>} text="Create Plan" href="/user/plan/create"/>
                    <ListLink nested icon={<SpecificPlan/>} text="User Plans" href="/user/plan"/>
                  </Collapse>
                </>
                : <ListLink icon={<AddIcon/>} text="Create Plan" href="/user/plan/create"/>}
            </List>
          )}
        </Box>

        <Divider/>

        {/* Fixed bottom logout */}
        <Box>
          <List>
            <ListLink icon={<FeedbackIcon/>} text="Feedback" href="/user/feedback"/>
            <ListLink icon={<SettingsIcon/>} text="Settings" href="/user/settings"/>
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