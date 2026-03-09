'use client'

import React, {useRef, useState} from "react";
import {parsePlan} from "@/utils/sheetUpload";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {WorkoutEditorProvider} from "@/context/WorkoutEditorContext";
import CustomAppBar, {HEIGHT_EXC_APPBAR} from "@/components/CustomAppBar";

import {Exercise} from "@prisma/client";

import {UserPrisma} from "@/types/dataTypes";
import {PlanTable} from "../PlanTable";

type Props = {
  categories: string[]
  allExercises: Exercise[]
}
export const UploadAndEdit = ({categories, allExercises}: Props) => {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [tableData, setTableData] = useState<UserPrisma | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    setTableData(parsePlan(text));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setText(content);
    };
    reader.readAsText(file);
  };

  return (
    <>
      <CustomAppBar title="Sheet Upload" showBack/>
      <Box
        sx={{
          height: HEIGHT_EXC_APPBAR,
          overflowY: "auto",
          p: 2,
          maxWidth: 600,
          mx: "auto",
        }}
      >
        {/* File upload */}
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon/>}
          fullWidth
          onClick={() => fileInputRef.current?.click()}
        >
          Upload CSV file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{display: "none"}}
          onChange={handleFileChange}
        />
        <Typography variant="caption" color="text.secondary" sx={{display: "block", mt: 0.5, mb: 1}}>
          {fileName ?? "No file selected"}
        </Typography>

        {/* Divider */}
        <Divider sx={{my: 2}}>
          <Typography variant="body2" color="text.secondary">or</Typography>
        </Divider>

        {/* Paste textarea */}
        <TextField
          value={text}
          onChange={(e) => setText(e.target.value)}
          label="Paste in your training sheet"
          multiline
          rows={4}
          fullWidth
          sx={{mb: 2}}
        />

        <Button variant="contained" onClick={handleSubmit} fullWidth>
          Preview
        </Button>

        {tableData &&
          <WorkoutEditorProvider userData={tableData} allExercises={allExercises}>
            <PlanTable
              lockedInEditMode={true}
              categories={categories}
            />
          </WorkoutEditorProvider>
        }
      </Box>
    </>
  );
}
