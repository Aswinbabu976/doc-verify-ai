import { useState } from "react";
import DocumentUpload from "./DocumentUpload";

const API_URL = "http://localhost:8000";

function App() {
  const [mode, setMode] = useState("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [applicationsError, setApplicationsError] = useState("");
  const [applicationsLoaded, setApplicationsLoaded] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Something went wrong.");
        return;
      }

      if (mode === "register") {
        setMessage("Account created. You can now sign in.");
        setMode("login");
        setPassword("");
        return;
      }

      localStorage.setItem("access_token", data.access_token);
      setUser({ email, role: data.role });
      setPassword("");
      setApplications([]);
      setApplicationsError("");
      setApplicationsLoaded(false);
    } catch {
      setError(
        "Could not reach the backend. Check that Docker services are running.",
      );
    }
  }

  async function loadApplications() {
    setApplicationsError("");

    const token = localStorage.getItem("access_token");

    if (!token) {
      setApplicationsError("Please sign in again to view your applications.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/applications/mine`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setApplicationsError(data.detail || "Could not load applications.");
        return;
      }

      setApplications(data);
      setApplicationsLoaded(true);
    } catch {
      setApplicationsError("Could not reach the backend.");
    }
  }

  function logout() {
    localStorage.removeItem("access_token");
    setUser(null);
    setApplications([]);
    setApplicationsError("");
    setApplicationsLoaded(false);
    setMessage("You have signed out.");
  }

  return (
    <main className="page">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, sans-serif; background: #f3f6fb; color: #1f2937; }
        .page { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
        .card { width: 100%; max-width: 420px; background: white; padding: 32px; border-radius: 14px; box-shadow: 0 8px 28px #00000012; }
        h1 { margin: 0 0 8px; color: #173b69; }
        p { color: #5b6472; }
        label { display: block; margin: 18px 0 6px; font-weight: 600; }
        input { width: 100%; padding: 11px; border: 1px solid #cbd5e1; border-radius: 7px; font-size: 16px; }
        button { margin-top: 20px; width: 100%; border: 0; border-radius: 7px; padding: 12px; background: #1769aa; color: white; font-size: 16px; cursor: pointer; }
        button:hover { background: #12558b; }
        .switch { background: transparent; color: #1769aa; margin-top: 8px; }
        .switch:hover { background: #e8f2fc; color: #12558b; text-decoration: underline; }
        .message { color: #187443; }
        .error { color: #b42318; }
        .role { display: inline-block; padding: 5px 10px; border-radius: 20px; background: #e8f2fc; color: #174a78; }
        .application-list { padding-left: 20px; }
        .application-list li { margin: 10px 0; color: #5b6472; overflow-wrap: anywhere; }
      `}</style>

      <section className="card">
        <h1>DocVerify AI</h1>
        <p>Document verification with human review.</p>

        {user ? (
          <>
            <h2>Welcome</h2>
            <p>{user.email}</p>
            <p>
              Your role: <span className="role">{user.role}</span>
            </p>

            {user.role === "applicant" && (
              <>
                <DocumentUpload />

                <section>
                  <h2>My applications</h2>
                  <button type="button" onClick={loadApplications}>
                    Refresh applications
                  </button>

                  {applicationsError && (
                    <p className="error">{applicationsError}</p>
                  )}

                  {applicationsLoaded && applications.length === 0 && (
                    <p>You do not have any applications yet.</p>
                  )}

                  {applications.length > 0 && (
                    <ul className="application-list">
                      {applications.map((application) => (
                        <li key={application.id}>
                          <strong>Status:</strong> {application.status}
                          <br />
                          <strong>Created:</strong>{" "}
                          {new Date(application.created_at).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}

            <button onClick={logout}>Sign out</button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2>{mode === "register" ? "Create an account" : "Sign in"}</h2>

            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />

            <button type="submit">
              {mode === "register" ? "Register" : "Sign in"}
            </button>

            <button
              className="switch"
              type="button"
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
                setError("");
                setMessage("");
              }}
            >
              {mode === "register"
                ? "Already registered? Sign in"
                : "Need an account? Register"}
            </button>

            {message && <p className="message">{message}</p>}
            {error && <p className="error">{error}</p>}
          </form>
        )}
      </section>
    </main>
  );
}

export default App;