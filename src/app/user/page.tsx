import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "next/link";
import getLoggedInUser from "@lib/getLoggedInUser";

export default async function UserPage() {
  const user = await getLoggedInUser()

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">{`Welcome ${user.name}`}</h1>
      <Box
        sx={{
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
              flex: "0 0 auto",
              aspectRatio: "1 / 1", // Ensures square shape
              width: {xs: "30dvh", md: "30dvw"}, // Adjust as needed for your layout
              maxWidth: 300, // Optional: limit max size
              minWidth: 0,
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
    </>
  );
}