"use client"
import {useState} from "react";
import FrontBody from '../../../components/front.svg';
import BackBody from '../../../components/back.svg';

const MUSCLE_GROUPS = [
  {label: "Upper Traps", keys: ["upper-traps"], view: "both"},
  {label: "Ant. Deltoids", keys: ["ant-delts"], view: "front"},
  {label: "Lat. Deltoids", keys: ["lat-delts"], view: "both"},
  {label: "Post. Deltoids", keys: ["post-delts"], view: "back"},
  {label: "Pectoralis", keys: ["clav-pec", "sternal-pec"], view: "front"},
  {label: "Biceps", keys: ["biceps"], view: "both"},
  {label: "Triceps", keys: ["triceps"], view: "both"},
  {label: "Forearms", keys: ["forearms"], view: "both"},
  {label: "Abs", keys: ["abs"], view: "front"},
  {label: "Obliques", keys: ["obliques"], view: "both"},
  {label: "Mid Traps", keys: ["mid-traps"], view: "back"},
  {label: "Lower Traps", keys: ["lower-traps"], view: "back"},
  {label: "Lats", keys: ["lats"], view: "back"},
  {label: "Adductors", keys: ["adductors"], view: "both"},
  {label: "Quads", keys: ["quads"], view: "front"},
  {label: "Glutes", keys: ["glutes"], view: "back"},
  {label: "Hamstrings", keys: ["hamstrings"], view: "back"},
  {label: "Calves", keys: ["calves"], view: "both"},
];

export default function AnatomyDemo() {
  const [highlighted, setHighlighted] = useState(new Set());

  const toggleGroup = (keys) => {
    setHighlighted(prev => {
      const next = new Set(prev);
      const allActive = keys.every(k => next.has(k));
      if (allActive) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  const isActive = (keys) => keys.some(k => highlighted.has(k));

  const highlightCSS = Array.from(highlighted)
    .map(k => `[data-muscle="${k}"] { fill: #e8453c !important; }`)
    .join("\n");

  return (
    <div style={{fontFamily: "'DM Sans', sans-serif", background: "#0f1117", minHeight: "100vh", color: "#e8eaf0"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        .muscle { transition: fill 0.18s ease; cursor: pointer; }
        .muscle:hover { fill: #c0392b !important; }
        ${highlightCSS}
      `}</style>

      <div style={{maxWidth: 1000, margin: "0 auto", padding: "36px 24px"}}>

        <h1 style={{
          fontSize: 11,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "#4b5563",
          fontWeight: 500,
          marginBottom: 4,
        }}>
          Muscle Reference
        </h1>
        <div style={{width: 32, height: 1, background: "#e8453c", marginBottom: 32}}/>

        {/* Figures */}
        <div style={{display: "flex", justifyContent: "center", marginBottom: 44}}>
          <div style={{flex: 1, maxWidth: 420}}>
            <FrontBody onMuscleClick={(key) => toggleGroup([key])}/>
          </div>
          <div style={{flex: 1, maxWidth: 420}}>
            <BackBody onMuscleClick={(key) => toggleGroup([key])}/>
          </div>
        </div>

        {/* Buttons */}
        <div style={{display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center"}}>
          {MUSCLE_GROUPS.map(({label, keys, view}) => {
            const active = isActive(keys);
            return (
              <button
                key={label}
                onClick={() => toggleGroup(keys)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 5,
                  border: `1px solid ${active ? "#e8453c88" : "#23262f"}`,
                  background: active ? "#e8453c1a" : "#16191f",
                  color: active ? "#e8453c" : "#6b7280",
                  fontSize: 11.5,
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  transition: "all 0.15s ease",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {label}
                <span style={{fontSize: 8, opacity: 0.55, marginTop: 1}}>
                  {view === "front" ? "FRONT" : view === "back" ? "BACK" : "BOTH"}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setHighlighted(new Set())}
            style={{
              padding: "6px 14px",
              borderRadius: 5,
              border: "1px solid #23262f",
              background: "transparent",
              color: "#374151",
              fontSize: 11.5,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.06em",
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}