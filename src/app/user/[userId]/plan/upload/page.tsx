"use client";

import { useState } from "react";
import {parsePlan} from "@/utils/sheetUpload";
import {EditableUser} from "@/types/editableData";
import WorkoutTablesByWeek from "@/components/WorkoutTablesByWeek";
import TextField from "@mui/material/TextField";
import {Button, Typography} from "@mui/material";

export default function TSVParserPage() {
  const [text, setText] = useState("");
  const [tableData, setTableData] = useState<EditableUser | null>(null);
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
      ? <WorkoutTablesByWeek data={tableData} lockedInEditMode={true} />
      : ""}
    </div>
  );
}
