'use client'

import React, {useState} from 'react'
import {Box, Button, MobileStepper, Paper, Typography,} from '@mui/material'
import {
  KeyboardArrowLeft as KeyboardArrowLeftIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
} from '@mui/icons-material'

import PlanStep from "@/app/user/[userId]/plan/create/steps/PlanStep";
import WeekStep from "@/app/user/[userId]/plan/create/steps/WeekStep";
import {useNewPlan} from "@/app/user/[userId]/plan/create/useNewPlan";
import WorkoutsStep from "@/app/user/[userId]/plan/create/steps/WorkoutsStep";
import {HEIGHT_EXC_APPBAR} from "@/components/CustomAppBar";
import PlanSummary from "@/app/user/[userId]/plan/create/steps/PlanSummary";


export const PlanBuilder = () => {
  const {statePlan} = useNewPlan()

  const [activeStep, setActiveStep] = useState(0)

  const [weekCount, setWeekCount] = useState('6')

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1)
  }
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }

  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return !!statePlan?.name && (!!weekCount || weekCount === '0')
      case 1:
        return statePlan?.weeks[0].workouts.length > 0
      default:
        return true
    }
  }

  const steps = [
    {
      title: 'Plan',
      component: <PlanStep setWeekCount={setWeekCount} weekCount={weekCount}/>,
    },
    {
      title: 'Week',
      component: <WeekStep/>,
    },
    {
      title: 'Workouts',
      component: <WorkoutsStep/>,
    },
    {
      title: 'Summary',
      component: <PlanSummary weekCount={weekCount}/>,
    },
  ];

  return (
    <Paper sx={{p: 2, height: `calc(${HEIGHT_EXC_APPBAR} - 32px)`, display: 'flex', flexDirection: 'column'}}>
      <Typography
        variant="h5"
        component="h2"
        sx={{
          mb: 1,
          textAlign: 'center',
          fontWeight: 500,
        }}
      >
        Build Workout Plan
      </Typography>
      <Box
        sx={{
          mb: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              flex: 1,
              fontWeight: 500,
            }}
          >
            Step {activeStep + 1}: {steps[activeStep].title}
          </Typography>
        </Box>
        <MobileStepper
          variant="dots"
          steps={steps.length}
          position="static"
          activeStep={activeStep}
          sx={{
            bgcolor: 'transparent',
            p: 0,
          }}
          nextButton={
            <Button
              size="small"
              onClick={handleNext}
              disabled={!isStepValid()}
              sx={{
                borderRadius: 1,
              }}
            >
              {!(activeStep === steps.length - 1) && <>Next<KeyboardArrowRightIcon /></>}
            </Button>
          }
          backButton={
            <Button
              size="small"
              onClick={handleBack}
              sx={{
                borderRadius: 1,
              }}
            >
              {!(activeStep === 0) && <>Back<KeyboardArrowLeftIcon /></>}
            </Button>
          }
        />
      </Box>
      <Box
        sx={{
          minHeight: '300px',
          mb: 2,
          flex:1
        }}
      >
        {steps[activeStep]?.component}
      </Box>
    </Paper>
  )
}
