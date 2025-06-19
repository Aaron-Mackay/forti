import {Box, CircularProgress} from "@mui/material";
import React from "react";

export function Loading() {
  return <Box
    sx={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1300,
      background: "rgba(255,255,255,0.7)",
    }}
  >
    <CircularProgress aria-label="Loading..." />
  </Box>;
}