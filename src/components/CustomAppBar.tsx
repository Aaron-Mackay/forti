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
import FortiIcon from 'src/app/forti-icon.svg'
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuIcon from "@mui/icons-material/Menu";
import React, {ReactNode, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import WorkoutIcon from '@mui/icons-material/FitnessCenterRounded';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import AddIcon from "@mui/icons-material/Add";
import SpecificPlan from '@mui/icons-material/InsertInvitation';

const APPBAR_HEIGHT = 56;
export const HEIGHT_EXC_APPBAR = `calc(100vh - ${APPBAR_HEIGHT}px)`
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

  const pathname = usePathname();
  const [planNestedOpen, setPlanNestedOpen] = useState(() => pathname.includes('/plan'))

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

  const userPath = pathname.split("/").slice(0, 3).join("/")
  const DrawerList = (
    <Box sx={{width: 250}} role="presentation" onClick={() => setDrawerOpen(false)}>
      <List>
        <ListLink icon={<HomeIcon/>} text={"Home"} href={userPath + "/"}/>
        <ListLink icon={<CalendarIcon/>} text={"Calendar"} href={userPath + "/calendar"}/>
        <ListLink icon={<WorkoutIcon/>} text={"Training"} href={userPath + "/workout"}/>
        <ListItemButton onClick={handleClick}>
          <ListItemIcon>
            <ListAltIcon/>
          </ListItemIcon>
          <ListItemText primary="Inbox"/>
          {planNestedOpen ? <ExpandLess/> : <ExpandMore/>}
        </ListItemButton>
        <Collapse in={planNestedOpen} timeout="auto" unmountOnExit>
          <ListLink nested icon={<AddIcon/>} text={"Build Plan"}  href={userPath + "/plan/create"}/>
          <ListLink nested icon={<SpecificPlan/>} text={"User Plans"} href={userPath + "/plan"}/>
        </Collapse>
      </List>
    </Box>)

  return (
    <>
      <AppBar position="sticky" color="primary" sx={{height: APPBAR_HEIGHT}} enableColorOnDark>
        <Toolbar>
          {showBack
            ? <IconButton edge="start" color="inherit" aria-label="back" onClick={onBack} sx={{mr: 2}}>
              <ArrowBackIcon/>
            </IconButton>
            :
            <IconButton edge="start" color="inherit" aria-label="back" onClick={() => setDrawerOpen(true)} sx={{mr: 2}}>
              <MenuIcon/>
            </IconButton>}
          <Typography variant="h6" noWrap component="div" sx={{flexGrow: 1}}>
            {title}
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Stack direction={"row"} alignItems={"center"} spacing={1} sx={{p: 1.5}}>
          <FortiIcon style={{width: 50, height: 50}}/>
          <Typography variant={"h5"}>Forti</Typography>
        </Stack>
        <Divider/>
        {DrawerList}
      </Drawer>
    </>
  );
}