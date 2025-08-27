"use client";

import React, {useState} from "react";
import {Box, Button, CircularProgress, TextField, Typography,} from "@mui/material";
import CustomAppBar from "@/components/CustomAppBar";

export default function BugReportPage() {
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("description", description);
      if (screenshot) formData.append("screenshot", screenshot);

      const res = await fetch("/api/report-bug", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to send bug report");

      setMessage("✅ Bug report submitted successfully!");
      setDescription("");
      setScreenshot(null);
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to submit bug report.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <CustomAppBar title={"Report Bug"}/>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          maxWidth: 500,
          mx: "auto",
          mt: 4,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          p: 2
        }}
      >
        <Typography variant="h5">Report a Bug</Typography>

        <TextField
          label="Describe the issue"
          multiline
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <Button variant="outlined" component="label">
          {screenshot ? screenshot.name : "Upload Screenshot"}
          <input type="file" hidden accept="image/*" onChange={handleFileChange}/>
        </Button>

        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20}/> : undefined}
        >
          {loading ? "Sending..." : "Submit Bug Report"}
        </Button>

        {message && (
          <Typography color={message.startsWith("✅") ? "green" : "red"}>
            {message}
          </Typography>
        )}
      </Box>
    </>
  );
}
