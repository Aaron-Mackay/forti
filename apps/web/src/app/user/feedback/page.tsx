"use client";

import React, {useState} from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useAppBar } from '@lib/providers/AppBarProvider';

const FEEDBACK_TYPES = ["Bug Report", "Feature Request", "Improvement Suggestion"] as const;
type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export default function FeedbackPage() {
  useAppBar({ title: 'Feedback' });
  const [type, setType] = useState<FeedbackType>("Bug Report");
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
      formData.append("type", type);
      formData.append("description", description);
      if (screenshot) formData.append("screenshot", screenshot);

      const res = await fetch("/api/feedback", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to send feedback");

      setMessage("✅ Feedback submitted successfully!");
      setType("Bug Report");
      setDescription("");
      setScreenshot(null);
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to submit feedback.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
        <Typography variant="h5">Send Feedback</Typography>

        <FormControl fullWidth>
          <InputLabel id="feedback-type-label">Type</InputLabel>
          <Select
            labelId="feedback-type-label"
            value={type}
            label="Type"
            onChange={(e) => setType(e.target.value as FeedbackType)}
          >
            {FEEDBACK_TYPES.map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Description"
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
          {loading ? "Sending..." : "Submit Feedback"}
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
