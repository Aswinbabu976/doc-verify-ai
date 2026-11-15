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

  const [reviewQueue, setReviewQueue] = useState([]);
  const [reviewQueueError, setReviewQueueError] = useState("");
  const [reviewQueueLoaded, setReviewQueueLoaded] = useState(false);
  const [documentsByApplication, setDocumentsByApplication] = useState({});
  const [documentsErrors, setDocumentsErrors] = useState({});
  const [preview, setPreview] = useState(null);

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
      setReviewQueue([]);
      setReviewQueueError("");
      setReviewQueueLoaded(false);
      setDocumentsByApplication({});
      setDocumentsErrors({});
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
        headers: { Authorization: `Bearer ${token}` },
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

  async function loadReviewQueue() {
    setReviewQueueError("");

    const token = localStorage.getItem("access_token");
    if (!token) {
      setReviewQueueError("Please sign in again to view the reviewer queue.");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/applications/reviewer/queue`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await response.json();

      if (!response.ok) {
        setReviewQueueError(data.detail || "Could not load the reviewer queue.");
        return;
      }

      setReviewQueue(data.items);
      setReviewQueueLoaded(true);
      setDocumentsByApplication({});
      setDocumentsErrors({});
    } catch {
      setReviewQueueError("Could not reach the backend.");
    }
  }

  async function loadApplicationDocuments(applicationId) {
    setDocumentsErrors((current) => ({
      ...current,
      [applicationId]: "",
    }));

    const token = localStorage.getItem("access_token");
    if (!token) {
      setDocumentsErrors((current) => ({
        ...current,
        [applicationId]: "Please sign in again to view documents.",
      }));
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/applications/${applicationId}/documents`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await response.json();

      if (!response.ok) {
        setDocumentsErrors((current) => ({
          ...current,
          [applicationId]: data.detail || "Could not load documents.",
        }));
        return;
      }

      setDocumentsByApplication((current) => ({
        ...current,
        [applicationId]: data,
      }));
    } catch {
      setDocumentsErrors((current) => ({
        ...current,
        [applicationId]: "Could not reach the backend.",
      }));
    }
  }

  async function openDocument(document) {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setReviewQueueError("Please sign in again to open this document.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}${document.file_url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        setReviewQueueError(data.detail || "Could not open the document.");
        return;
      }

      const fileBlob = await response.blob();
      const fileUrl = URL.createObjectURL(fileBlob);

      setPreview((current) => {
        if (current) {
          URL.revokeObjectURL(current.url);
        }
        return { url: fileUrl, filename: document.filename };
      });
      setReviewQueueError("");
    } catch {
      setReviewQueueError("Could not reach the backend.");
    }
  }

  function closePreview() {
    if (preview) {
      URL.revokeObjectURL(preview.url);
      setPreview(null);
    }
  }

  function logout() {
    closePreview();
    localStorage.removeItem("access_token");
    setUser(null);
    setApplications([]);
    setApplicationsError("");
    setApplicationsLoaded(false);
    setReviewQueue([]);
    setReviewQueueError("");
    setReviewQueueLoaded(false);
    setDocumentsByApplication({});
    setDocumentsErrors({});
    setMessage("You have signed out.");
  }

  return (
    <main className="page">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, sans-serif; background: #f3f6fb; color: #1f2937; }
        .page { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
        .card { width: 100%; max-width: 900px; background: white; padding: 32px; border-radius: 14px; box-shadow: 0 8px 28px #00000012; }
        h1 { margin: 0 0 8px; color: #173b69; }
        p { color: #5b6472; }
        label { display: block; margin: 18px 0 6px; font-weight: 600; }
        input { width: 100%; padding: 11px; border: 1px solid #cbd5e1; border-radius: 7px; font-size: 16px; }
        button { margin-top: 16px; border: 0; border-radius: 7px; padding: 12px; background: #1769aa; color: white; font-size: 16px; cursor: pointer; }
        button:hover { background: #12558b; }
        form button, .full-width { width: 100%; }
        .switch { background: transparent; color: #1769aa; margin-top: 8px; }
        .switch:hover { background: #e8f2fc; color: #12558b; text-decoration: underline; }
        .message { color: #187443; }
        .error { color: #b42318; }
        .role { display: inline-block; padding: 5px 10px; border-radius: 20px; background: #e8f2fc; color: #174a78; }
        .application-list, .document-list { padding-left: 20px; }
        .application-list li, .document-list li { margin: 10px 0; color: #5b6472; overflow-wrap: anywhere; }
        .review-item { margin: 18px 0; padding: 16px; border: 1px solid #d6deea; border-radius: 8px; }
        .preview { margin-top: 24px; }
        .preview iframe { width: 100%; height: 600px; border: 1px solid #cbd5e1; border-radius: 8px; }
        .secondary-button { background: #526579; margin-left: 8px; }
        @media (max-width: 600px) {
          .card { padding: 22px; }
          .preview iframe { height: 420px; }
        }
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
                  <button
                    className="full-width"
                    type="button"
                    onClick={loadApplications}
                  >
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

            {user.role === "reviewer" && (
              <section>
                <h2>Reviewer queue</h2>
                <button
                  className="full-width"
                  type="button"
                  onClick={loadReviewQueue}
                >
                  Refresh reviewer queue
                </button>

                {reviewQueueError && (
                  <p className="error">{reviewQueueError}</p>
                )}

                {reviewQueueLoaded && reviewQueue.length === 0 && (
                  <p>There are no pending applications to review.</p>
                )}

                {reviewQueue.map((application) => (
                  <article className="review-item" key={application.id}>
                    <h3>Application</h3>
                    <p>
                      <strong>Applicant:</strong> {application.applicant_email}
                    </p>
                    <p>
                      <strong>Status:</strong> {application.status}
                    </p>
                    <p>
                      <strong>Submitted:</strong>{" "}
                      {new Date(application.created_at).toLocaleString()}
                    </p>

                    <button
                      type="button"
                      onClick={() => loadApplicationDocuments(application.id)}
                    >
                      Load documents
                    </button>

                    {documentsErrors[application.id] && (
                      <p className="error">
                        {documentsErrors[application.id]}
                      </p>
                    )}

                    {documentsByApplication[application.id]?.length === 0 && (
                      <p>No documents found for this applicant.</p>
                    )}

                    {documentsByApplication[application.id]?.length > 0 && (
                      <ul className="document-list">
                        {documentsByApplication[application.id].map(
                          (document) => (
                            <li key={document.id}>
                              <strong>{document.filename}</strong>
                              {" — "}
                              {Math.round(document.size_bytes / 1024)} KB
                              <br />
                              Uploaded:{" "}
                              {new Date(document.uploaded_at).toLocaleString()}
                              <br />
                              <button
                                type="button"
                                onClick={() => openDocument(document)}
                              >
                                Preview PDF
                              </button>
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </article>
                ))}

                {preview && (
                  <section className="preview">
                    <h3>{preview.filename}</h3>
                    <button type="button" onClick={closePreview}>
                      Close preview
                    </button>
                    <iframe
                      title={`PDF preview: ${preview.filename}`}
                      src={preview.url}
                    />
                  </section>
                )}
              </section>
            )}

            <button className="full-width" onClick={logout}>
              Sign out
            </button>
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