'use client'

import WorkoutTablesByWeek from "@/components/WorkoutTablesByWeek";
import {getUserData} from "@lib/api";
import {useParams} from "next/navigation";
import {useEffect, useState} from "react";
import {EditableUser} from "@/types/editableData";

const Plan = () => {
  const {userId} = useParams();
  const [data, setData] = useState<EditableUser | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    getUserData(userId as string)
      .then(setData)
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <main className="p-6">
      {loading || data == null ? (
        <p>Loading data...</p>
      ) : (
        <WorkoutTablesByWeek data={data}/>
      )}
    </main>
  )
};

export default Plan;
