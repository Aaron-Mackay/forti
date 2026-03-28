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
import {ReactNode, useEffect, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import WorkoutIcon from '@mui/icons-material/FitnessCenterRounded';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import ChecklistIcon from '@mui/icons-material/Checklist';
import GroupIcon from '@mui/icons-material/Group';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import MedicationIcon from '@mui/icons-material/Medication';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SchoolIcon from '@mui/icons-material/School';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChecklistIcon2 from '@mui/icons-material/AssignmentTurnedIn';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {signOut} from "next-auth/react";
import {useSettings} from '@lib/providers/SettingsProvider';
import {useCoachClients} from '@lib/providers/CoachClientsProvider';
import {useNotifications} from '@lib/hooks/api/useNotifications';

export const APPBAR_HEIGHT = 56;
export const HEIGHT_EXC_APPBAR = `calc(100dvh - ${APPBAR_HEIGHT}px)`
export default function CustomAppBar(
  {
    title,
    onBack,
    showBack = false,
    noSpacer = false,
    isCoachDomain = false,
  }: {
    title: string;
    onBack?: () => void;
    showBack?: boolean;
    /** When true, omits the spacer <Toolbar> that pushes content below the fixed bar. */
    noSpacer?: boolean;
    /** True when served from the coach.* subdomain. */
    isCoachDomain?: boolean;
  }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // URL of the opposite domain (null on localhost / until hydrated)
  const [crossDomainUrl, setCrossDomainUrl] = useState<string | null>(null);

  const pathname = usePathname();
  const { settings, loading: settingsLoading } = useSettings();
  const { clients } = useCoachClients();
  const { unreadCount } = useNotifications();

  const educationPaths = ['/library', '/user/learning-plans', '/user/coach/learning-plans'];
  const [educationOpen, setEducationOpen] = useState(
    () => educationPaths.some(p => pathname?.startsWith(p))
  );

  // Detect client focus mode from URL pattern
  const clientMatch = pathname?.match(/^\/user\/coach\/clients\/([^/]+)/);
  const activeClientId = clientMatch?.[1];
  const activeClient = activeClientId ? clients.find(c => c.id === activeClientId) : undefined;

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

  // Compute the URL for the opposite domain after hydration.
  // Only applies on real domains — localhost stays as-is for development.
  useEffect(() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return;

    if (isCoachDomain) {
      // coach.forti-training.co.uk → forti-training.co.uk
      // preview.coach.forti-training.co.uk → preview.forti-training.co.uk
      setCrossDomainUrl(window.location.origin.replace('coach.', ''));
    } else {
      // forti-training.co.uk → coach.forti-training.co.uk
      // preview.forti-training.co.uk → preview.coach.forti-training.co.uk
      const url = new URL(window.location.origin);
      url.hostname = 'coach.' + url.hostname;
      setCrossDomainUrl(url.origin);
    }
  }, [isCoachDomain]);

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
                        onClick={() => setDrawerOpen(false)}
                        sx={{pl: nested ? 4 : 2}}>
          <ListItemIcon>
            {icon}
          </ListItemIcon>
          <ListItemText primary={text}/>
        </ListItemButton>
      </ListItem>
    )
  }

  // External link (full navigation, not Next.js client-side) used for cross-domain jumps
  const ExternalListLink = ({ icon, text, href }: { icon: ReactNode; text: string; href: string }) => (
    <ListItem disablePadding>
      <ListItemButton component="a" href={href} onClick={() => setDrawerOpen(false)}>
        <ListItemIcon>{icon}</ListItemIcon>
        <ListItemText primary={text} />
      </ListItemButton>
    </ListItem>
  );

  const bottomNav = (
    <Box>
      <List>
        <ListLink icon={<FeedbackIcon/>} text="Feedback" href="/user/feedback"/>
        <ListLink icon={<SettingsIcon/>} text="Settings" href="/user/settings"/>
        {isCoachDomain && crossDomainUrl && (
          <ExternalListLink icon={<ArrowBackIcon/>} text="Back to Forti" href={crossDomainUrl}/>
        )}
        <ListItem disablePadding>
          <ListItemButton onClick={() => signOut({callbackUrl: '/login'})}>
            <ListItemIcon><LogoutIcon/></ListItemIcon>
            <ListItemText primary="Log Out"/>
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="fixed" color="primary" sx={{height: APPBAR_HEIGHT, overflow: 'hidden', zIndex: 1400}} enableColorOnDark>
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
          <Box sx={{flexGrow: 1, overflow: 'hidden'}}>
            <Typography variant="h6" noWrap>
              {title}
            </Typography>
            {activeClient && (
              <Typography variant="caption" noWrap display="block" sx={{opacity: 0.8, lineHeight: 1, mt: -0.25}}>
                {activeClient.name}
              </Typography>
            )}
          </Box>
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
          <Typography variant="h5">{isCoachDomain ? 'Coach' : 'Forti'}</Typography>
          <Chip label="Beta" size="small" sx={{bgcolor: "rgba(45,127,249,0.15)", color: "rgb(45,127,249)", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", border: "none", height: 20, flexShrink: 0}}/>
          <Box sx={{flexGrow: 1}}/>
          <IconButton component={Link} href="/user/notifications" color="inherit" size="small" aria-label="notifications">
            <Badge badgeContent={unreadCount} color="error" max={99}>
              <NotificationsIcon/>
            </Badge>
          </IconButton>
        </Stack>
        <Divider/>

        {/* Scrollable nav content */}
        <Box sx={{flexGrow: 1, overflowY: 'auto'}}>
          {activeClient ? (
            /* Client Focus Mode nav — same on both domains */
            <List>
              <ListItem disablePadding>
                <ListItemButton component={Link} href="/user/coach/clients" onClick={() => setDrawerOpen(false)}>
                  <ListItemIcon><ArrowBackIcon/></ListItemIcon>
                  <ListItemText
                    primary={activeClient.name ?? 'Client'}
                    primaryTypographyProps={{fontWeight: 600, color: 'primary.main'}}
                  />
                </ListItemButton>
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
          ) : isCoachDomain ? (
            /* Coach domain nav */
            <List>
              <ListLink icon={<GroupIcon/>} text="Clients" href="/user/coach/clients"/>
              <ListLink
                icon={<ChecklistIcon2/>}
                text="Check-ins"
                href="/user/coach/check-ins"
                isActive={pathname.startsWith('/user/coach/check-ins')}
              />
              <ListLink
                icon={<SchoolIcon/>}
                text="Learning Plans"
                href="/user/coach/learning-plans"
                isActive={pathname.startsWith('/user/coach/learning-plans')}
              />
            </List>
          ) : (
            /* Client domain nav */
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
              <ListItemButton onClick={() => setEducationOpen(o => !o)}>
                <ListItemIcon><MenuBookIcon/></ListItemIcon>
                <ListItemText primary="Education"/>
                {educationOpen ? <ExpandLess/> : <ExpandMore/>}
              </ListItemButton>
              <Collapse in={educationOpen} timeout="auto" unmountOnExit>
                <ListLink nested icon={<BookmarksIcon/>} text="Library" href="/library"/>
                <ListLink nested icon={<SchoolIcon/>} text="Learning Plans" href="/user/learning-plans"/>
                {/* Coach Learning Plans only shown on localhost (dev); hidden on production in favour of the coach domain */}
                {!settingsLoading && settings.coachModeActive && !crossDomainUrl && (
                  <ListLink nested icon={<SchoolIcon/>} text="Coach Learning Plans" href="/user/coach/learning-plans"/>
                )}
              </Collapse>
              <ListLink icon={<ListAltIcon/>} text="Plans" href="/user/plan"/>
              {/* On localhost (dev): show coach links inline. On production: link to coach subdomain. */}
              {!settingsLoading && settings.coachModeActive && (
                crossDomainUrl ? (
                  <ExternalListLink icon={<OpenInNewIcon/>} text="Coach Portal" href={crossDomainUrl}/>
                ) : (
                  <ListLink icon={<GroupIcon/>} text="Clients" href="/user/coach/clients"/>
                )
              )}
            </List>
          )}
        </Box>

        {!activeClient && <Divider/>}

        {/* Fixed bottom — hidden in client focus mode */}
        {!activeClient && bottomNav}
      </Drawer>
    </>
  );
}
