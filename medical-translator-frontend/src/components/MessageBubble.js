import React from "react";

export default function MessageBubble({ speaker, text }) {
  const isPatient = speaker === "patient";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isPatient ? "flex-start" : "flex-end",
        margin: "10px"
      }}
    >
      <div
        style={{
          background: isPatient ? "#e3f2fd" : "#c8e6c9",
          padding: "12px 16px",
          borderRadius: "20px",
          maxWidth: "60%",
          fontSize: "18px"
        }}
      >
        {text}
      </div>
    </div>
  );
}