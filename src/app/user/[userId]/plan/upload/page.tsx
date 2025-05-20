"use client";

import { useState } from "react";
import {parsePlan} from "@/utils/sheetUpload";
import {EditableUser} from "@/types/editableData";
import WorkoutTablesByWeek from "@/components/WorkoutTablesByWeek";

export default function TSVParserPage() {
  const [text, setText] = useState("");
  const [tableData, setTableData] = useState<EditableUser>(null);
  // todo add input for dropdown with users

  const handleSubmit = () => {
    setTableData(parsePlan(text));
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Sheet Upload</h1>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full p-2 border rounded mb-4"
        rows={8}
        style={{width: "100%"}}
        placeholder="Paste from your sheet here..."
      />

      <button
        onClick={handleSubmit}
        className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        Preview
      </button>

      {tableData
      ? <WorkoutTablesByWeek data={tableData} lockedInEditMode={true} />
      : ""}
    </div>
  );
}
