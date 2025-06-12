'use client'

import React, {useState} from "react";
import {parsePlan} from "@/utils/sheetUpload";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import {WorkoutEditorProvider} from "@/context/WorkoutEditorContext";
import {WorkoutContent} from "@/components/WorkoutContent";
import {Exercise} from "@prisma/client";

import {UserPrisma} from "@/types/dataTypes";

type Props = {
  categories: string[]
  allExercises: Exercise[]
}
export const UploadAndEdit = ({categories, allExercises}: Props) => {
  const [text, setText] = useState("");
  const [tableData, setTableData] = useState<UserPrisma | null>(null);
  // todo add input for dropdown with users

  const handleSubmit = () => {
    setTableData(parsePlan(text));
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Typography variant="h3" gutterBottom>
        Sheet Upload
      </Typography>

      <TextField
        value={text}
        onChange={(e) => setText(e.target.value)}
        label="Paste in your training sheet"
        multiline
        rows={4}
        style={{width: "100%"}}
      />

      <Button
        onClick={handleSubmit}
        className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        Preview
      </Button>

      {tableData
        ? <WorkoutEditorProvider userData={tableData}>
          <WorkoutContent
            lockedInEditMode={true}
            categories={categories}
            allExercises={allExercises}
          />
        </WorkoutEditorProvider>
        : ""}
    </div>
  );
}