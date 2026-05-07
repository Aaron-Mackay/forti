import React, {useMemo} from "react";
import {debounce} from "@mui/material";
import {WorkoutEditorAction} from "@lib/useWorkoutEditor";

const useDebouncedDispatch = (dispatchFn: React.Dispatch<WorkoutEditorAction>, delay = 300) =>
  useMemo(() => debounce(dispatchFn, delay), [dispatchFn, delay]);

export default useDebouncedDispatch;