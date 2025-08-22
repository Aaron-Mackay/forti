'use client'

import React, {useState} from "react";
import {redirect} from "next/navigation";
import {useWorkoutEditorContext} from "@/context/WorkoutEditorContext";
import {saveUserWorkoutData} from "@lib/api";
import Button from "@mui/material/Button";
import Week from "./Week";
import EditModeToggle from "./EditModeToggle";
import ScreenSizeWarningBanner from "@/components/ScreenSizeWarningBanner";
import CustomAppBar from "@/components/CustomAppBar";
import {Box} from "@mui/material";

export const PlanTable: React.FC<{
  lockedInEditMode: boolean;
  categories: string[];
  planId?: string;
}> = ({lockedInEditMode = false, categories, planId}) => {
  const [isInEditMode, setIsInEditMode] = useState(lockedInEditMode);
  const {state: userDataState, dispatch, allExercises} = useWorkoutEditorContext();

  const handleSave = () => {
    saveUserWorkoutData(userDataState)
      .then(() => {
        setIsInEditMode(false)
        alert('Saved successfully')
      })
      .catch(() => alert('Failed to save'))
  };

  const plan = planId ?
    userDataState.plans.find(p => p.id === parseInt(planId))
    : userDataState.plans[0]
  if (!plan) {
    redirect('/user/plan/create')
  }
  return (
    <>
      <CustomAppBar title={"Plan"}/>
      <Box sx={{p: 1}}>
        {!lockedInEditMode && (
          <EditModeToggle
            isInEditMode={isInEditMode}
            setIsInEditMode={setIsInEditMode}
          />
        )}
        {isInEditMode && (
          <Button onClick={handleSave}>
            Save
          </Button>
        )}

        <h1>User: {userDataState.name}</h1>

        {plan.weeks.map((week) => (
          <Week
            key={week.id}
            planId={plan.id}
            week={week}
            isInEditMode={isInEditMode}
            categories={categories}
            allExercises={allExercises}
          />
        ))}

        {isInEditMode && (
          // todo fix this too
          <Button onClick={() => dispatch({type: 'ADD_WEEK', planId: 1})}>
            Add Week
          </Button>
        )}
        <ScreenSizeWarningBanner/>
      </Box>
    </>
  );
};
