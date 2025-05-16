"use client";

import React, { useEffect, useState } from "react";
import {getExercises} from "@lib/api";

interface Exercise {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
}

const ExercisesPage: React.FC = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getExercises()
      .then(setExercises)
      .finally(() => setIsLoading(false))
  }, []);

  return (
    <div className="container mt-4">
      <h1>All Exercises</h1>

      {isLoading && <p>Loading...</p>}

      {!isLoading && (
        <table className="table table-striped mt-3">
          <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Description</th>
          </tr>
          </thead>
          <tbody>
          {exercises.map((exercise) => (
            <tr key={exercise.id}>
              <td>{exercise.name}</td>
              <td>{exercise.category || "-"}</td>
              <td>{exercise.description || "-"}</td>
            </tr>
          ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ExercisesPage;
