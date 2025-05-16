'use client'

import WorkoutTablesByWeek from "@/components/WorkoutTablesByWeek";
import {getUserData} from "@lib/api";
import {useParams} from "next/navigation";
import {useEffect, useState} from "react";
import {SerialisedFullUser} from "@/types/fullUser";

const Plan = () => {
  const {userId} = useParams();
  const [data, setData] = useState<SerialisedFullUser | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    getUserData(userId as string)
      .then(setData)
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <main className="p-6">
      {loading ? (
        <p>Loading data...</p>
      ) : (
          <WorkoutTablesByWeek data={data}/>
      )}
    </main>
  )
};

export default Plan;
