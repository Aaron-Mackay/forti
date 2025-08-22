import React, {useMemo, useState} from 'react';
import {Box, MobileStepper, Paper} from '@mui/material';
import {useNewPlan} from "@/app/user/plan/create/useNewPlan";
import {PLACEHOLDER_ID} from "@/app/user/plan/create/PlanBuilderWithContext";
import Button from "@mui/material/Button";
import {KeyboardArrowLeft, KeyboardArrowRight} from '@mui/icons-material'
import {SpecificWorkoutSubstep} from "@/app/user/plan/create/steps/SpecificWorkoutSubstep";

import {Swiper, SwiperSlide} from 'swiper/react';
import 'swiper/css';

const WorkoutsStep: React.FC = () => {
  const {statePlan} = useNewPlan()

  const [activeWorkout, setActiveWorkout] = useState(0)

  const handleNext = () => {
    setActiveWorkout((prevActiveWorkout) => prevActiveWorkout + 1)
  }
  const handleBack = () => {
    setActiveWorkout((prevActiveWorkout) => prevActiveWorkout - 1)
  }

  const steps = useMemo(() => {
    const currentWeek = statePlan.weeks.find((week) => week.id === PLACEHOLDER_ID)!;
    return currentWeek.workouts.map((workout) => ({
      id: workout.id,
      workout,
    }));
  }, [statePlan]);


  return <Paper sx={{px: 1, py: 1, display: 'flex', flexDirection: 'column', height: '100%',}}>
    <Box
      sx={{
        minHeight: 0,
        mb: 2,
        flex: 1,
      }}
    >
      <Swiper
        spaceBetween={16}
        slidesPerView={1}
        onSlideChange={(swiper) => setActiveWorkout(swiper.activeIndex)}
        initialSlide={activeWorkout}
        style={{height: '100%'}}
      >
        {steps.map((step) => (
          <SwiperSlide key={step.id}>
            <SpecificWorkoutSubstep workout={step.workout}/>
          </SwiperSlide>
        ))}
      </Swiper>
    </Box>
    <MobileStepper
      variant="dots"
      steps={steps.length}
      activeStep={activeWorkout}
      sx={{
        bgcolor: 'transparent',
        p: 0,
        position: 'sticky',
        bottom: 0,
      }}
      nextButton={
        <Button
          size="small"
          onClick={handleNext}
          disabled={activeWorkout === steps.length - 1}
          sx={{
            borderRadius: 1,
          }}
        >
          {!(activeWorkout === steps.length - 1) && <KeyboardArrowRight/>}
        </Button>
      }
      backButton={
        <Button
          size="small"
          onClick={handleBack}
          disabled={activeWorkout === 0}
          sx={{
            borderRadius: 1,
          }}
        >
          {!(activeWorkout === 0) && <KeyboardArrowLeft/>}
        </Button>
      }
    />
  </Paper>
};
export default WorkoutsStep;