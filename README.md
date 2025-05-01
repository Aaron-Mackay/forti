# 🏋️ Workout Backend

A scalable backend for a fitness tracking app where users manage weekly workouts, exercises, and sets. Built with **Prisma** and **PostgreSQL**, designed for future flexibility (e.g., exercise switching, progress tracking, analytics).

---

## 🚀 Features

- Relational schema:
    - Users ➝ Weeks ➝ Workouts ➝ Exercises ➝ Sets
- Support for reordering exercises and sets
- Built with [Prisma ORM](https://www.prisma.io/)
- Local PostgreSQL development support (via Docker or native)
- Easily extendable to REST, GraphQL, or serverless APIs

---

## 🛠 Tech Stack

- **Node.js**
- **Prisma**
- **PostgreSQL**
- **TypeScript** (if applicable)
- **Docker** (optional for local Postgres)

---

## 🧱 Database Schema

```mermaid
erDiagram
  User ||--o{ Week : has
  Week ||--o{ Workout : has
  Workout ||--o{ WorkoutExercise : has
  WorkoutExercise }o--|| Exercise : targets
  WorkoutExercise ||--o{ ExerciseSet : contains
