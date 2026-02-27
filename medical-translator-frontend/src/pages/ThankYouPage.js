import React, { useState } from "react";

export default function ThankYouPage({ summary }) {
  const [email, setEmail] = useState("");

  const shareByEmail = () => {
    const subject = "Medical Consultation Summary";
    const body = encodeURIComponent(summary);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  return (
    <div style={{ padding: 50, textAlign: "center" }}>
      <h2>Thank You</h2>
      <p>The consultation has ended.</p>

      <h3>Session Summary:</h3>
      <div style={{
        border: "1px solid #ccc",
        padding: 20,
        marginTop: 20,
        textAlign: "left"
      }}>
        {summary}
      </div>

      <div style={{ marginTop: 30 }}>
        <input
          type="email"
          placeholder="Enter email to share"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10, width: 300 }}
        />
        <button onClick={shareByEmail}
          style={{ padding: 10, marginLeft: 10 }}>
          Share
        </button>
      </div>
    </div>
  );
}