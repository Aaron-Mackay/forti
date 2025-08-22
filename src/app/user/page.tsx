import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "next/link";
import getLoggedInUser from "@lib/getLoggedInUser";
import CustomAppBar, {HEIGHT_EXC_APPBAR} from "@/components/CustomAppBar";
import {Paper, Typography} from "@mui/material";

export default async function UserPage() {
  const user = await getLoggedInUser()

  return (
    <>
      <CustomAppBar title={"Dashboard"}/>
      <Paper sx={{px: 2, height: HEIGHT_EXC_APPBAR, display: 'flex', flexDirection: 'column'}}>
        <Typography variant={'h4'} sx={{paddingTop: 2}}>{`Welcome ${user.name?.split(' ')[0]}`}</Typography>
        <Box
          sx={{
            flex: 1,
            height: "calc(100dvh - 16px)",
            width: "100%",
            display: "flex",
            flexDirection: {xs: "column", md: "row"},
            gap: 2,
            p: 2,
            m: 0,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "space-around",
            boxSizing: "border-box",
          }}
        >
          {["plan", "workout", "calendar"].map((route) => (
            <Button
              key={route}
              component={Link}
              href={`/user/${route}`}
              variant="contained"
              color={route === "plan" ? "primary" : "secondary"}
              sx={{
                flex: "1",
                width: '100%',
                minHeight: 0,
                borderRadius: 2,
                fontSize: "2rem",
                border: "2px solid #333",
                bgcolor: "#f0f0f0",
                color: "#222",
                boxShadow: "none",
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {route.charAt(0).toUpperCase() + route.slice(1)}
            </Button>
          ))}
        </Box>
      </Paper>
    </>
  );
}