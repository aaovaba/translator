import React, { useEffect, useState } from "react";
const BASE_URL = process.env.REACT_APP_API_URL;
export default function SessionDetailPage({ sessionId }) {
  const [session, setSession] = useState(null);
  
  useEffect(() => {
    fetch(`${BASE_URL}/sessions/${sessionId}`)
      .then(res => res.json())
      .then(setSession);
  }, [sessionId]);

  if (!session) return <div>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h2>Session Detail</h2>

      {session.transcript.map((msg, i) => (
        <div key={i}>
          <b>{msg.speaker}:</b> {msg.translated}
        </div>
      ))}
    </div>
  );
}