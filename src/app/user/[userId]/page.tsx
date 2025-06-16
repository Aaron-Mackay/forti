import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "next/link";

interface UserPageProps {
  params: { userId: string };
}

export default function UserPage({ params }: UserPageProps) {
  const userId = params.userId;

  // Define the gap in px for precise calculation
  const GAP = 16;

  return (
    <Box
      sx={{
        height: "calc(100dvh - 16px)",
        width: "100%",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: 2,
        p: 0,
        m: 0,
        overflow: "hidden",
        alignItems: "stretch",
        justifyContent: "stretch",
        boxSizing: "border-box",
      }}
    >
      <Button
        component={Link}
        href={`/user/${userId}/plan`}
        variant="contained"
        sx={{
          flex: "1 1 0",
          minWidth: 0,
          minHeight: 0,
          borderRadius: 2,
          fontSize: "2rem",
          border: "2px solid #333",
          bgcolor: "#f0f0f0",
          color: "#222",
          boxShadow: "none",
          boxSizing: "border-box",
          height: { xs: `calc((100dvh - ${GAP}px) / 2)`, md: "100%" },
          width: { xs: "100%", md: `calc((100dvw - ${GAP}px) / 2)` },
        }}
      >
        Plan
      </Button>
      <Button
        component={Link}
        href={`/user/${userId}/dashboard`}
        variant="contained"
        color="secondary"
        sx={{
          flex: "1 1 0",
          minWidth: 0,
          minHeight: 0,
          borderRadius: 2,
          fontSize: "2rem",
          border: "2px solid #333",
          bgcolor: "#f0f0f0",
          color: "#222",
          boxShadow: "none",
          boxSizing: "border-box",
          height: { xs: `calc((100dvh - ${GAP}px) / 2)`, md: "100%" },
          width: { xs: "100%", md: `calc((100dvw - ${GAP}px) / 2)` },
        }}
      >
        Workout
      </Button>
    </Box>
  );
}