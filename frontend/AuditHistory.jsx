import { useState } from "react";

const API_URL = "http://localhost:8000";

function AuditHistory() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function loadAuditHistory() {
    setError("");
    setLoading(true);

    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("Please sign in again.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_URL + "/admin/audit", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Could not load audit history.");
        return;
      }

      setEvents(data);
      setLoaded(true);
    } catch {
      setError("Could not reach the backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>Audit history</h2>
      <p>
        Review recent system activity, including who performed each action and
        when.
      </p>

      <button
        className="full-width"
        type="button"
        onClick={loadAuditHistory}
        disabled={loading}
      >
        {loading ? "Loading audit history..." : "Load audit history"}
      </button>

      {error && <p className="error">{error}</p>}

      {loaded && events.length === 0 && (
        <p>No audit events have been recorded yet.</p>
      )}

      {events.map((event) => (
        <article
          key={event.id}
          style={{
            margin: "18px 0",
            padding: "16px",
            border: "1px solid #d6deea",
            borderRadius: "8px",
          }}
        >
          <h3>{event.event_type.replaceAll(".", " ")}</h3>
          <p>
            <strong>Actor:</strong> {event.actor_email}
          </p>
          <p>
            <strong>Target:</strong> {event.target_type} — {event.target_id}
          </p>
          <p>
            <strong>Time:</strong>{" "}
            {new Date(event.occurred_at).toLocaleString()}
          </p>

          {Object.keys(event.details || {}).length > 0 && (
            <>
              <strong>Details:</strong>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  background: "#f3f6fb",
                  padding: "12px",
                  borderRadius: "6px",
                }}
              >
                {JSON.stringify(event.details, null, 2)}
              </pre>
            </>
          )}
        </article>
      ))}
    </section>
  );
}

export default AuditHistory;