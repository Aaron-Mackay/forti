'use client';

import {
  AppBar,
  Box,
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
  const [open, setOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  if (showBack && typeof onBack === 'undefined') {
    onBack = () => {
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 2) {
        const newPath = '/' + segments.slice(0, -1).join('/');
        router.push(newPath || '/');
      }
    }
  }

  const ListLink = ({icon, text, href, disabled}
                    : { icon: ReactNode, text: string, href: string, disabled?: boolean }) => {
    return (
      <ListItem disablePadding>
        <ListItemButton component={Link} href={href} disabled={disabled} selected={pathname === href}>
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
    <Box sx={{width: 250}} role="presentation" onClick={() => setOpen(false)}>
      <List>
        <ListLink icon={<HomeIcon/>} text={"Home"} href={userPath + "/"}/>
        <ListLink icon={<CalendarIcon/>} text={"Calendar"} href={userPath + "/calendar"}/>
        <ListLink icon={<WorkoutIcon/>} text={"Training"} href={userPath + "/workout"}/>
        <ListLink icon={<ListAltIcon/>} text={"Training Plan"} href={userPath + "/plan"} disabled/>
        {/*// todo undisable once plan finished*/}
      </List>
    </Box>)

  return (
    <>
      <AppBar position="sticky" color="primary" enableColorOnDark>
        <Toolbar>
          {showBack
            ? <IconButton edge="start" color="inherit" aria-label="back" onClick={onBack} sx={{mr: 2}}>
              <ArrowBackIcon/>
            </IconButton>
            : <IconButton edge="start" color="inherit" aria-label="back" onClick={() => setOpen(true)} sx={{mr: 2}}>
              <MenuIcon/>
            </IconButton>}
          <Typography variant="h6" noWrap component="div" sx={{flexGrow: 1}}>
            {title}
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
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