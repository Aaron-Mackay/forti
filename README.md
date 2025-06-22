# Forti - WorkoutApp

A fitness tracking app where users manage weekly workouts, exercises, and sets.

---

## Features

- TODO

---

## Tech Stack

- **Node.js**
- **Prisma**
- **PostgreSQL**
- **Neon**
- **TypeScript**

---

## 🛠 Dev Notes

To reset the database (full data loss):

```bash
npx prisma db push --force-reset
prisma generate
```

---

## Database Schema - Mermaid ER Diagram (requires plugin)

```mermaid
erDiagram
    USER ||--o{ WEEK : has
    USER ||--o{ EVENT : has
    USER ||--o{ USEREXERCISENOTE : has

    WEEK ||--o{ WORKOUT : has

    WORKOUT ||--o{ WORKOUTEXERCISE : has

    WORKOUTEXERCISE ||--o{ EXERCISESET : has
    WORKOUTEXERCISE }o--|| EXERCISE : uses

    EXERCISE ||--o{ USEREXERCISENOTE : has

    EVENT }o--|| USER : belongs_to

    USEREXERCISENOTE }o--|| EXERCISE : about
```

Calendar powered by FullCalendar (https://fullcalendar.io)