// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// todo validation of data, where is userId?

import {parsePlan} from './sheetUpload';

import {UserPrisma} from "@/types/dataTypes";

describe('parsePlan', () => {
  test('Full data upload', () => {
    const parsedData = parsePlan(goodData)
    expect(parsedData.weeks[0].workouts[0].exercises[0])
      .toEqual(partiallyFilledParsedData.weeks[0].workouts[0].exercises[0])
  })

  const partiallyFilledParsedData: UserPrisma = {
    id: 5,
    name: "TestName",
    weeks: [
      {
        id: 1,
        order: 1,
        workouts: [
          {
            id: 1,
            name: "Day 1: Chest, Delts & Triceps",
            order: 1,
            exercises: [
              {
                id: 1,
                order: 1,
                repRange: "10-15",
                restTime: "90",
                exercise: {
                  name: "Elbow on Knee External Rotations (4/10 Pain)",
                  category: "N/A"
                },
                sets: [
                  {
                    id: 1,
                    reps: 12,
                    weight: "5",
                    order: 1
                  },
                  {
                    "id": 2,
                    "order": 2,
                    "reps": 15,
                    "weight": "3",
                  },
                  {
                    "id": 3,
                    "order": 3,
                    "reps": null,
                    "weight": "3",
                  },
                ]
              }
            ]
          }
        ]
      }
    ]
  }

// example data, partially filled in, two weeks
  const goodData: string = "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t \n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\tDay 1: Chest, Delts & Triceps\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDay 2: Lower Body\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDay 3: Pull, Side Delts + Biceps\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDay 4: Chest, Delts & Arms\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDay 5: Lower Body B\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\tMAIN WORKOUT\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tMAIN WORKOUT\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tMAIN WORKOUT\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tMAIN WORKOUT\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tMAIN WORKOUT\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\tEXERCISE\t\t\tSETS/REPS\t\tREST\t\tSet 1 Weight\tSet 2 Weight\tSet 3 Weight\tSet 1 Reps\tSet 2 Reps\tSet 3 Reps\tVolume\t\tEXERCISE\t\t\tSETS/REPS\t\tREST\t\tSet 1 Weight\tSet 2 Weight\tSet 3 Weight\tSet 1 Reps\tSet 2 Reps\tSet 3 Reps\tVolume\t\tEXERCISE\t\t\tSETS/REPS\t\tREST\t\tSet 1 Weight\tSet 2 Weight\tSet 3 Weight\tSet 1 Reps\tSet 2 Reps\tSet 3 Reps\tVolume\t\tEXERCISE\t\t\tSETS/REPS\t\tREST\t\tSet 1 Weight\tSet 2 Weight\tSet 3 Weight\tSet 1 Reps\tSet 2 Reps\tSet 3 Reps\tVolume\t\tEXERCISE\t\t\tSETS/REPS\t\tREST\t\tSet 1 Weight\tSet 2 Weight\tSet 3 Weight\tSet 1 Reps\tSet 2 Reps\tSet 3 Reps\tVolume\t\n" +
    "\tElbow on Knee External Rotations (4/10 Pain)\t\t\t3\t10-15\t90\t\t5\t3\t3\t12\t15\t\t105\t\tLow Bar Squat\t\t\t1\t5\t120+\t\t\t\t\t\t\t\t0\t\tElbow on Knee External Rotations (4/10 Pain)\t\t\t3\t10-15\t90\t\t\t\t\t\t\t\t0\t\tElbow on Knee External Rotations (4/10 Pain)\t\t\t3\t10-15\t90\t\t\t\t\t\t\t\t0\t\tSeated Hamstring Curl\t\t\t3\t8-12\t90-120\t\t\t\t\t\t\t\t0\t\n" +
    "\tCable Face-Pulls (4/10 Pain)\t\t\t3\t10-15\t90\t\t28.5\t28.5\t28.5\t15\t12\t12\t1111.5\t\tLow Bar Squat\t\t\t2\t5\t120+\t\t\t\t\t\t\t\t0\t\tCable Face-Pulls (4/10 Pain)\t\t\t3\t10-15\t90\t\t\t\t\t\t\t\t0\t\tCable Face-Pulls (4/10 Pain)\t\t\t3\t10-15\t90\t\t\t\t\t\t\t\t0\t\tDumbbell Bulgarian Split-Squat\t\t\t1\t8-12\t120+\t\t\t\t\t\t\t\t0\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\tSeated Hamstring Curl\t\t\t3\t8-12\t90-120\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\tDumbbell Bulgarian Split-Squat\t\t\t1\t10-15\t120+\t\t\t\t\t\t\t\t0\t\n" +
    "\tPec Deck, pin 2\t\t\t3\t10-15\t90-120\t\t37.5\t37.5\t37.5\t15\t15\t\t1125\t\tBarbell RDL\t\t\t1\t8-12\t120+\t\t\t\t\t\t\t\t0\t\tAdjustable Handle Lat Pull-Down\t\t\t3\t8-12\t90-120\t\t\t\t\t\t\t\t0\t\tPec Deck\t\t\t3\t10-15\t90-120\t\t\t\t\t\t\t\t0\t\tLying Hamstring Curl\t\t\t2\t10-15\t90-120\t\t\t\t\t\t\t\t0\t\n" +
    "\tPause 30 Degree Incline Smith Machine Press\t\t\t1\t8-12\t120+\t\t25\t\t\t10\t\t\t250\t\tBarbell RDL\t\t\t1\t10-15\t120+\t\t\t\t\t\t\t\t0\t\tPrime Seated Upper Back Row\t\t\t1\t8-12\t120+\t\t\t\t\t\t\t\t0\t\tWatson Pin-Loaded Seated Press\t\t\t1\t8-12\t120+\t\t\t\t\t\t\t\t0\t\tLying Hamstring Curl (Drop-Set)\t\t\t1\t10-15 x 2\t90-120\t\t\t\t\t\t\t\t0\t\n" +
    "\tPause 30 Degree Incline Smith Machine Press\t\t\t2\t10-15\t120+\t\t20\t20\t\t12\t\t\t240\t\tLeg Extension\t\t\t3\t10-15\t90-120\t\t\t\t\t\t\t\t0\t\tPrime Seated Upper Back Row\t\t\t2\t10-15\t120+\t\t\t\t\t\t\t\t0\t\tWatson Pin-Loaded Seated Press\t\t\t2\t10-15\t120+\t\t\t\t\t\t\t\t0\t\tPlate-Loaded Horizontal Leg Press\t\t\t1\t8-12\t120+\t\t\t\t\t\t\t\t0\t\n" +
    "\tLying Cuff Cable Lateral Raises\t\t\t3\t10-15\t90-120\t\t15\t17.5\t17.5+1\t18\t16\t14\t#VALUE!\t\tDumbbell Walking Lunges\t\t\t2\t8-12\t120+\t\t\t\t\t\t\t\t0\t\tUni-Lateral Seated Cable Row\t\t\t3\t8-12\t45/45\t\t\t\t\t\t\t\t0\t\tLying Cuff Cable Lateral Raises\t\t\t3\t10-15\t90-120\t\t\t\t\t\t\t\t0\t\tPlate-Loaded Horizontal Leg Press\t\t\t2\t10-15\t120+\t\t\t\t\t\t\t\t0\t\n" +
    "\tIncline Bench Dual Rope Cable Push-Down\t\t\t3\t8-12\t90-120\t\t50\t50\t50\t15\t11\t10\t1800\t\tLeg Press Calf Raises\t\t\t3\t12-18\t90\t\t\t\t\t\t\t\t0\t\tIncline Bench Cable Pull-Overs\t\t\t3\t10-15\t90-120\t\t\t\t\t\t\t\t0\t\tArm-Supported Uni-Lateral Cable Extension\t\t\t3\t8-12\t45/45\t\t\t\t\t\t\t\t0\t\tLeg Extension\t\t\t3\t10-15\t90-120\t\t\t\t\t\t\t\t0\t\n" +
    "\tCable Push-Downs (Straight-Bar)\t\t\t3\t10-15\t90-120\t\t50\t56\t56\t20\t16\t14\t2680\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\tUpright Bench Seated Dumbbell Curls\t\t\t3\t8-12\t90\t\t\t\t\t\t\t\t0\t\tIncline Bench Dumbbell Curls\t\t\t3\t10-15\t90\t\t\t\t\t\t\t\t0\t\tLeg Press Calf Raises\t\t\t3\t12-18\t90\t\t\t\t\t\t\t\t0\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\tEZ Preacher Curl\t\t\t3\t10-15\t90\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\tTRAINING NOTES\t\t\t\t\t\t\t\t\t\t\t\tTotal Voume \t#VALUE!\t\tTRAINING NOTES\t\t\t\t\t\t\t\t\t\t\t\tTotal Voume \t0\t\tTRAINING NOTES\t\t\t\t\t\t\t\t\t\t\t\tTotal Voume \t0\t\tTRAINING NOTES\t\t\t\t\t\t\t\t\t\t\t\tTotal Voume \t0\t\tTRAINING NOTES\t\t\t\t\t\t\t\t\t\t\t\tTotal Voume \t0\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\tDid you over-challenge weight selection for any exercise for the first week?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDid you over-challenge weight selection for any exercise for the first week?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDid you over-challenge weight selection for any exercise for the first week?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDid you over-challenge weight selection for any exercise for the first week?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDid you over-challenge weight selection for any exercise for the first week?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\tWas there any exercises that you had a particularly struggled with?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tWas there any exercises that you had a particularly struggled with?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tWas there any exercises that you had a particularly struggled with?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tWas there any exercises that you had a particularly struggled with?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tWas there any exercises that you had a particularly struggled with?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\tWas there any exercises that caused you any significant pain or discomfort?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tWas there any exercises that caused you any significant pain or discomfort?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tWas there any exercises that caused you any significant pain or discomfort?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tWas there any exercises that caused you any significant pain or discomfort?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tWas there any exercises that caused you any significant pain or discomfort?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\tDid you feel the volume was too much (felt overly flat or overly exhausted)?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDid you feel the volume was too much (felt overly flat or overly exhausted)?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDid you feel the volume was too much (felt overly flat or overly exhausted)?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDid you feel the volume was too much (felt overly flat or overly exhausted)?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDid you feel the volume was too much (felt overly flat or overly exhausted)?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\tDid you feel the volume was too little?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDid you feel the volume was too little?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDid you feel the volume was too little?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDid you feel the volume was too little?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDid you feel the volume was too little?\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\tDay 1: Chest, Delts & Triceps\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDay 2: Lower Body\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDay 3: Pull, Side Delts + Biceps\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDay 4: Chest, Delts & Arms\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tDay 5: Lower Body B\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\tMAIN WORKOUT\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tMAIN WORKOUT\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tMAIN WORKOUT\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tMAIN WORKOUT\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tMAIN WORKOUT\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\tEXERCISE\t\t\tSETS/REPS\t\tREST\t\tSet 1 Weight\tSet 2 Weight\tSet 3 Weight\tSet 1 Reps\tSet 2 Reps\tSet 3 Reps\tVolume\t\tEXERCISE\t\t\tSETS/REPS\t\tREST\t\tSet 1 Weight\tSet 2 Weight\tSet 3 Weight\tSet 1 Reps\tSet 2 Reps\tSet 3 Reps\tVolume\t\tEXERCISE\t\t\tSETS/REPS\t\tREST\t\tSet 1 Weight\tSet 2 Weight\tSet 3 Weight\tSet 1 Reps\tSet 2 Reps\tSet 3 Reps\tVolume\t\tEXERCISE\t\t\tSETS/REPS\t\tREST\t\tSet 1 Weight\tSet 2 Weight\tSet 3 Weight\tSet 1 Reps\tSet 2 Reps\tSet 3 Reps\tVolume\t\tEXERCISE\t\t\tSETS/REPS\t\tREST\t\tSet 1 Weight\tSet 2 Weight\tSet 3 Weight\tSet 1 Reps\tSet 2 Reps\tSet 3 Reps\tVolume\t\n" +
    "\tElbow on Knee External Rotations (4/10 Pain)\t\t\t3\t10-15\t90\t\t\t\t\t\t\t\t0\t\tLow Bar Squat\t\t\t1\t5\t120+\t\t\t\t\t\t\t\t0\t\tElbow on Knee External Rotations (4/10 Pain)\t\t\t3\t10-15\t90\t\t\t\t\t\t\t\t0\t\tElbow on Knee External Rotations (4/10 Pain)\t\t\t3\t10-15\t90\t\t\t\t\t\t\t\t0\t\tSeated Hamstring Curl\t\t\t3\t8-12\t90-120\t\t\t\t\t\t\t\t0\t\n" +
    "\tCable Face-Pulls (4/10 Pain)\t\t\t3\t10-15\t90\t\t\t\t\t\t\t\t0\t\tLow Bar Squat\t\t\t2\t5\t120+\t\t\t\t\t\t\t\t0\t\tCable Face-Pulls (4/10 Pain)\t\t\t3\t10-15\t90\t\t\t\t\t\t\t\t0\t\tCable Face-Pulls (4/10 Pain)\t\t\t3\t10-15\t90\t\t\t\t\t\t\t\t0\t\tDumbbell Bulgarian Split-Squat\t\t\t1\t8-12\t120+\t\t\t\t\t\t\t\t0\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\tSeated Hamstring Curl\t\t\t3\t8-12\t90-120\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\tDumbbell Bulgarian Split-Squat\t\t\t1\t10-15\t120+\t\t\t\t\t\t\t\t0\t\n" +
    "\tPec Deck\t\t\t3\t10-15\t90-120\t\t\t\t\t\t\t\t0\t\tBarbell RDL\t\t\t1\t8-12\t120+\t\t\t\t\t\t\t\t0\t\tAdjustable Handle Lat Pull-Down\t\t\t3\t8-12\t90-120\t\t\t\t\t\t\t\t0\t\tPec Deck\t\t\t3\t10-15\t90-120\t\t\t\t\t\t\t\t0\t\tLying Hamstring Curl\t\t\t2\t10-15\t90-120\t\t\t\t\t\t\t\t0\t\n" +
    "\tPause 30 Degree Incline Smith Machine Press\t\t\t1\t8-12\t120+\t\t\t\t\t\t\t\t0\t\tBarbell RDL\t\t\t1\t10-15\t120+\t\t\t\t\t\t\t\t0\t\tPrime Seated Upper Back Row\t\t\t1\t8-12\t120+\t\t\t\t\t\t\t\t0\t\tWatson Pin-Loaded Seated Press\t\t\t1\t8-12\t120+\t\t\t\t\t\t\t\t0\t\tLying Hamstring Curl (Drop-Set)\t\t\t1\t10-15 x 2\t90-120\t\t\t\t\t\t\t\t0\t\n" +
    "\tPause 30 Degree Incline Smith Machine Press\t\t\t2\t10-15\t120+\t\t\t\t\t\t\t\t0\t\tLeg Extension\t\t\t3\t10-15\t90-120\t\t\t\t\t\t\t\t0\t\tPrime Seated Upper Back Row\t\t\t2\t10-15\t120+\t\t\t\t\t\t\t\t0\t\tWatson Pin-Loaded Seated Press\t\t\t2\t10-15\t120+\t\t\t\t\t\t\t\t0\t\tPlate-Loaded Horizontal Leg Press\t\t\t1\t8-12\t120+\t\t\t\t\t\t\t\t0\t\n" +
    "\tLying Cuff Cable Lateral Raises\t\t\t3\t10-15\t90-120\t\t\t\t\t\t\t\t0\t\tDumbbell Walking Lunges\t\t\t2\t8-12\t120+\t\t\t\t\t\t\t\t0\t\tUni-Lateral Seated Cable Row\t\t\t3\t8-12\t45/45\t\t\t\t\t\t\t\t0\t\tLying Cuff Cable Lateral Raises\t\t\t3\t10-15\t90-120\t\t\t\t\t\t\t\t0\t\tPlate-Loaded Horizontal Leg Press\t\t\t2\t10-15\t120+\t\t\t\t\t\t\t\t0\t\n" +
    "\tIncline Bench Dual Rope Cable Push-Down\t\t\t3\t8-12\t90-120\t\t\t\t\t\t\t\t0\t\tLeg Press Calf Raises\t\t\t3\t12-18\t90\t\t\t\t\t\t\t\t0\t\tIncline Bench Cable Pull-Overs\t\t\t3\t10-15\t90-120\t\t\t\t\t\t\t\t0\t\tArm-Supported Uni-Lateral Cable Extension\t\t\t3\t8-12\t45/45\t\t\t\t\t\t\t\t0\t\tLeg Extension\t\t\t3\t10-15\t90-120\t\t\t\t\t\t\t\t0\t\n" +
    "\tCable Push-Downs (Straight-Bar)\t\t\t3\t10-15\t90-120\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\tUpright Bench Seated Dumbbell Curls\t\t\t3\t8-12\t90\t\t\t\t\t\t\t\t0\t\tIncline Bench Dumbbell Curls\t\t\t3\t10-15\t90\t\t\t\t\t\t\t\t0\t\tLeg Press Calf Raises\t\t\t3\t12-18\t90\t\t\t\t\t\t\t\t0\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\tEZ Preacher Curl\t\t\t3\t10-15\t90\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t0\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\tTRAINING NOTES\t\t\t\t\t\t\t\t\t\t\t\tTotal Voume \t0\t\tTRAINING NOTES\t\t\t\t\t\t\t\t\t\t\t\tTotal Voume \t0\t\tTRAINING NOTES\t\t\t\t\t\t\t\t\t\t\t\tTotal Voume \t0\t\tTRAINING NOTES\t\t\t\t\t\t\t\t\t\t\t\tTotal Voume \t0\t\tTRAINING NOTES\t\t\t\t\t\t\t\t\t\t\t\tTotal Voume \t0\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n" +
    "\tSe\t\t\tPoor\tMeh\tAverage\tGood\tGreat\tAdditional Notes\t\t\t\t\t\t\tSe\t\t\tPoor\tMeh\tAverage\tGood\tGreat\tAdditional Notes\t\t\t\t\t\t\tSe\t\t\tPoor\tMeh\tAverage\tGood\tGreat\tAdditional Notes\t\t\t\t\t\t\tSe\t\t\tPoor\tMeh\tAverage\tGood\tGreat\tAdditional Notes\t\t\t\t\t\t\tSe\t\t\tPoor\tMeh\tAverage\tGood\tGreat\tAdditional Notes\t\t\t\t\t\t\n" +
    "\tRecovery from previous same session\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tRecovery from previous same session\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tRecovery from previous same session\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tRecovery from previous same session\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tRecovery from previous same session\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\n" +
    "\tLevel of Intent going into the session\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tLevel of Intent going into the session\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tLevel of Intent going into the session\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tLevel of Intent going into the session\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tLevel of Intent going into the session\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\n" +
    "\tAbility to progress this week\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tAbility to progress this week\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tAbility to progress this week\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tAbility to progress this week\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tAbility to progress this week\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\n" +
    "\tOverall percieved effort for session\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tOverall percieved effort for session\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tOverall percieved effort for session\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tOverall percieved effort for session\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tOverall percieved effort for session\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\n" +
    "\tQuality of performance until the end\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tQuality of performance until the end\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tQuality of performance until the end\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tQuality of performance until the end\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\tQuality of performance until the end\t\t\tFALSE\tFALSE\tFALSE\tFALSE\tFALSE\t\t\t\t\t\t\t\n" +
    "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t"

});