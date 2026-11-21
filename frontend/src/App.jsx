import { useState } from "react";
import DocumentUpload from "./DocumentUpload";

const API_URL = "http://localhost:8000";

function localDateTimeValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

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
  const [reviewQueueMessage, setReviewQueueMessage] = useState("");
  const [reviewQueueLoaded, setReviewQueueLoaded] = useState(false);
  const [documentsByApplication, setDocumentsByApplication] = useState({});
  const [documentsErrors, setDocumentsErrors] = useState({});
  const [decisionReasons, setDecisionReasons] = useState({});
  const [decisionError, setDecisionError] = useState("");
  const [submittingDecisionFor, setSubmittingDecisionFor] = useState(null);
  const [documentRequestMessages, setDocumentRequestMessages] = useState({});
  const [documentRequestErrors, setDocumentRequestErrors] = useState({});
  const [submittingDocumentRequestFor, setSubmittingDocumentRequestFor] =
    useState(null);
  const [preview, setPreview] = useState(null);

  const [adminUsers, setAdminUsers] = useState([]);
  const [adminError, setAdminError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminUsersLoaded, setAdminUsersLoaded] = useState(false);
  const [roleEdits, setRoleEdits] = useState({});
  const [savingRoleFor, setSavingRoleFor] = useState(null);

  const [adminRules, setAdminRules] = useState([]);
  const [adminRulesLoaded, setAdminRulesLoaded] = useState(false);
  const [rulesError, setRulesError] = useState("");
  const [rulesMessage, setRulesMessage] = useState("");
  const [savingRuleAction, setSavingRuleAction] = useState("");
  const [ruleVersionDrafts, setRuleVersionDrafts] = useState({});
  const [ruleForm, setRuleForm] = useState({
    rule_key: "",
    name: "",
    description: "",
    effective_from: localDateTimeValue(),
    active: true,
  });

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
      setUser({ email: email.trim().toLowerCase(), role: data.role });
      setPassword("");

      setApplications([]);
      setApplicationsError("");
      setApplicationsLoaded(false);

      setReviewQueue([]);
      setReviewQueueError("");
      setReviewQueueMessage("");
      setReviewQueueLoaded(false);

      setDocumentsByApplication({});
      setDocumentsErrors({});
      setDecisionReasons({});
      setDecisionError("");
      setDocumentRequestMessages({});
      setDocumentRequestErrors({});

      setAdminUsers([]);
      setAdminError("");
      setAdminMessage("");
      setAdminUsersLoaded(false);
      setRoleEdits({});
      setAdminRules([]);
      setAdminRulesLoaded(false);
      setRulesError("");
      setRulesMessage("");
      setRuleVersionDrafts({});
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
    setDecisionError("");

    const token = localStorage.getItem("access_token");
    if (!token) {
      setReviewQueueError("Please sign in again to view the reviewer queue.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/applications/reviewer/queue`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  async function submitDecision(applicationId, status) {
    setDecisionError("");
    setReviewQueueMessage("");

    const reason = (decisionReasons[applicationId] || "").trim();
    if (!reason) {
      setDecisionError("Enter a reason before approving or rejecting.");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      setDecisionError("Please sign in again before recording a decision.");
      return;
    }

    setSubmittingDecisionFor(applicationId);

    try {
      const response = await fetch(
        `${API_URL}/applications/${applicationId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status, reason }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        setDecisionError(data.detail || "Could not save the decision.");
        return;
      }

      setReviewQueueMessage(`Decision recorded: application ${status}.`);
      setDecisionReasons((current) => ({
        ...current,
        [applicationId]: "",
      }));
      await loadReviewQueue();
    } catch {
      setDecisionError("Could not reach the backend.");
    } finally {
      setSubmittingDecisionFor(null);
    }
  }

  async function submitDocumentRequest(applicationId) {
    setDocumentRequestErrors((current) => ({
      ...current,
      [applicationId]: "",
    }));

    const requestMessage = (
      documentRequestMessages[applicationId] || ""
    ).trim();

    if (!requestMessage) {
      setDocumentRequestErrors((current) => ({
        ...current,
        [applicationId]: "Explain which additional documents are needed.",
      }));
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      setDocumentRequestErrors((current) => ({
        ...current,
        [applicationId]: "Please sign in again before sending the request.",
      }));
      return;
    }

    setSubmittingDocumentRequestFor(applicationId);

    try {
      const response = await fetch(
        `${API_URL}/applications/${applicationId}/request-documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: requestMessage }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        setDocumentRequestErrors((current) => ({
          ...current,
          [applicationId]:
            data.detail || "Could not send the document request.",
        }));
        return;
      }

      setReviewQueueMessage("Additional document request sent to the applicant.");
      setDocumentRequestMessages((current) => ({
        ...current,
        [applicationId]: "",
      }));
      await loadReviewQueue();
    } catch {
      setDocumentRequestErrors((current) => ({
        ...current,
        [applicationId]: "Could not reach the backend.",
      }));
    } finally {
      setSubmittingDocumentRequestFor(null);
    }
  }

  async function loadAdminUsers() {
    setAdminError("");
    setAdminMessage("");

    const token = localStorage.getItem("access_token");
    if (!token) {
      setAdminError("Please sign in again.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setAdminError(data.detail || "Could not load users.");
        return;
      }

      setAdminUsers(data);
      setAdminUsersLoaded(true);
      setRoleEdits(
        Object.fromEntries(data.map((account) => [account.id, account.role])),
      );
    } catch {
      setAdminError("Could not reach the backend.");
    }
  }

  async function saveUserRole(userId) {
    setAdminError("");
    setAdminMessage("");

    const token = localStorage.getItem("access_token");
    if (!token) {
      setAdminError("Please sign in again.");
      return;
    }

    setSavingRoleFor(userId);

    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: roleEdits[userId] }),
      });
      const data = await response.json();

      if (!response.ok) {
        setAdminError(data.detail || "Could not update the user role.");
        return;
      }

      setAdminUsers((current) =>
        current.map((account) =>
          account.id === userId ? { ...account, role: data.role } : account,
        ),
      );
      setRoleEdits((current) => ({
        ...current,
        [userId]: data.role,
      }));
      setAdminMessage(`Updated ${data.email} to ${data.role}.`);
    } catch {
      setAdminError("Could not reach the backend.");
    } finally {
      setSavingRoleFor(null);
    }
  }

  async function loadAdminRules() {
    setRulesError("");

    const token = localStorage.getItem("access_token");
    if (!token) {
      setRulesError("Please sign in again.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/rules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setRulesError(data.detail || "Could not load verification rules.");
        return;
      }

      setAdminRules(data);
      setAdminRulesLoaded(true);
      setRuleVersionDrafts({});
    } catch {
      setRulesError("Could not reach the backend.");
    }
  }

  async function createRule(event) {
    event.preventDefault();
    setRulesError("");
    setRulesMessage("");

    const token = localStorage.getItem("access_token");
    if (!token) {
      setRulesError("Please sign in again.");
      return;
    }

    setSavingRuleAction("create");

    try {
      const response = await fetch(`${API_URL}/admin/rules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rule_key: ruleForm.rule_key.trim(),
          name: ruleForm.name.trim(),
          description: ruleForm.description.trim(),
          effective_from: new Date(ruleForm.effective_from).toISOString(),
          active: ruleForm.active,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setRulesError(data.detail || "Could not create the rule.");
        return;
      }

      setRulesMessage(
        `Created ${data.rule_key} version ${data.version}.`,
      );
      setRuleForm({
        rule_key: "",
        name: "",
        description: "",
        effective_from: localDateTimeValue(),
        active: true,
      });
      await loadAdminRules();
    } catch {
      setRulesError("Could not reach the backend.");
    } finally {
      setSavingRuleAction("");
    }
  }

  function updateRuleVersionDraft(rule, field, value) {
    setRuleVersionDrafts((current) => {
      const previous = current[rule.rule_key] || {
        name: rule.name,
        description: rule.description,
        effective_from: localDateTimeValue(),
        active: rule.active,
      };

      return {
        ...current,
        [rule.rule_key]: {
          ...previous,
          [field]: value,
        },
      };
    });
  }

  async function createRuleVersion(event, rule) {
    event.preventDefault();
    setRulesError("");
    setRulesMessage("");

    const draft = ruleVersionDrafts[rule.rule_key] || {
      name: rule.name,
      description: rule.description,
      effective_from: localDateTimeValue(),
      active: rule.active,
    };

    const token = localStorage.getItem("access_token");
    if (!token) {
      setRulesError("Please sign in again.");
      return;
    }

    setSavingRuleAction(`version:${rule.rule_key}`);

    try {
      const response = await fetch(
        `${API_URL}/admin/rules/${encodeURIComponent(rule.rule_key)}/versions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: draft.name.trim(),
            description: draft.description.trim(),
            effective_from: new Date(draft.effective_from).toISOString(),
            active: draft.active,
          }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        setRulesError(data.detail || "Could not create the rule version.");
        return;
      }

      setRulesMessage(
        `Created ${data.rule_key} version ${data.version}.`,
      );
      await loadAdminRules();
    } catch {
      setRulesError("Could not reach the backend.");
    } finally {
      setSavingRuleAction("");
    }
  }

  async function deactivateRule(rule) {
    if (
      !window.confirm(
        `Deactivate "${rule.name}"? This creates a new inactive version.`,
      )
    ) {
      return;
    }

    setRulesError("");
    setRulesMessage("");

    const token = localStorage.getItem("access_token");
    if (!token) {
      setRulesError("Please sign in again.");
      return;
    }

    setSavingRuleAction(`deactivate:${rule.rule_key}`);

    try {
      const response = await fetch(
        `${API_URL}/admin/rules/${encodeURIComponent(rule.rule_key)}/deactivate`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();

      if (!response.ok) {
        setRulesError(data.detail || "Could not deactivate the rule.");
        return;
      }

      setRulesMessage(
        `Deactivated ${data.rule_key} with version ${data.version}.`,
      );
      await loadAdminRules();
    } catch {
      setRulesError("Could not reach the backend.");
    } finally {
      setSavingRuleAction("");
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
    setReviewQueueMessage("");
    setReviewQueueLoaded(false);

    setDocumentsByApplication({});
    setDocumentsErrors({});
    setDecisionReasons({});
    setDecisionError("");
    setDocumentRequestMessages({});
    setDocumentRequestErrors({});

    setAdminUsers([]);
    setAdminError("");
    setAdminMessage("");
    setAdminUsersLoaded(false);
    setRoleEdits({});

    setAdminRules([]);
    setAdminRulesLoaded(false);
    setRulesError("");
    setRulesMessage("");
    setRuleVersionDrafts({});

    setMessage("You have signed out.");
  }

  const ruleGroups = Object.values(
    adminRules.reduce((groups, rule) => {
      if (!groups[rule.rule_key]) {
        groups[rule.rule_key] = [];
      }
      groups[rule.rule_key].push(rule);
      return groups;
    }, {}),
  );

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
        input, textarea, select { width: 100%; padding: 11px; border: 1px solid #cbd5e1; border-radius: 7px; font-size: 16px; font-family: inherit; }
        input[type="checkbox"] { width: auto; margin-right: 8px; }
        textarea { min-height: 90px; resize: vertical; }
        button { margin-top: 16px; border: 0; border-radius: 7px; padding: 12px; background: #1769aa; color: white; font-size: 16px; cursor: pointer; }
        button:hover { background: #12558b; }
        button:disabled { opacity: 0.65; cursor: not-allowed; }
        form button, .full-width { width: 100%; }
        .switch { background: transparent; color: #1769aa; margin-top: 8px; }
        .switch:hover { background: #e8f2fc; color: #12558b; text-decoration: underline; }
        .message { color: #187443; }
        .error { color: #b42318; }
        .role { display: inline-block; padding: 5px 10px; border-radius: 20px; background: #e8f2fc; color: #174a78; }
        .application-list, .document-list { padding-left: 20px; }
        .application-list li, .document-list li { margin: 10px 0; color: #5b6472; overflow-wrap: anywhere; }
        .review-item, .admin-user, .rule-card { margin: 18px 0; padding: 16px; border: 1px solid #d6deea; border-radius: 8px; }
        .decision-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .decision-actions button { flex: 1; min-width: 140px; }
        .approve-button { background: #187443; }
        .approve-button:hover { background: #125b34; }
        .reject-button { background: #b42318; }
        .reject-button:hover { background: #8f1c13; }
        .request-documents-button { background: #526579; }
        .request-details { margin-top: 8px; padding: 12px; background: #f3f6fb; border-left: 4px solid #1769aa; border-radius: 7px; }
        .preview { margin-top: 24px; }
        .preview iframe { width: 100%; height: 600px; border: 1px solid #cbd5e1; border-radius: 8px; }
        .rule-history { padding-left: 20px; color: #5b6472; }
        .rule-history li { margin: 8px 0; overflow-wrap: anywhere; }
        .rule-status { display: inline-block; padding: 4px 9px; border-radius: 16px; background: #e8f2fc; color: #174a78; }
        .rule-status.inactive { background: #fce8e6; color: #8f1c13; }
        .rule-form { margin: 18px 0; padding: 16px; border: 1px solid #d6deea; border-radius: 8px; }
        .checkbox-label { display: flex; align-items: center; gap: 6px; }
        .checkbox-label input { margin: 0; }
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

                          {application.document_request_message && (
                            <div className="request-details">
                              <strong>Reviewer requests:</strong>{" "}
                              {application.document_request_message}
                              {application.documents_requested_by && (
                                <>
                                  <br />
                                  <strong>Requested by:</strong>{" "}
                                  {application.documents_requested_by}
                                </>
                              )}
                              {application.documents_requested_at && (
                                <>
                                  <br />
                                  <strong>Requested at:</strong>{" "}
                                  {new Date(
                                    application.documents_requested_at,
                                  ).toLocaleString()}
                                </>
                              )}
                            </div>
                          )}

                          {application.reason && (
                            <>
                              <br />
                              <strong>Reviewer’s decision reason:</strong>{" "}
                              {application.reason}
                            </>
                          )}

                          {application.verification_rule_versions?.length >
                            0 && (
                            <>
                              <br />
                              <strong>Rule versions used:</strong>{" "}
                              {application.verification_rule_versions
                                .map(
                                  (rule) =>
                                    `${rule.rule_key} v${rule.version}`,
                                )
                                .join(", ")}
                            </>
                          )}

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

                {reviewQueueMessage && (
                  <p className="message">{reviewQueueMessage}</p>
                )}
                {reviewQueueError && (
                  <p className="error">{reviewQueueError}</p>
                )}
                {decisionError && <p className="error">{decisionError}</p>}

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

                    {application.verification_rule_versions?.length > 0 && (
                      <p>
                        <strong>Rule versions selected:</strong>{" "}
                        {application.verification_rule_versions
                          .map(
                            (rule) =>
                              `${rule.rule_key} v${rule.version}`,
                          )
                          .join(", ")}
                      </p>
                    )}

                    {application.document_request_message && (
                      <div className="request-details">
                        <strong>Previous document request:</strong>{" "}
                        {application.document_request_message}
                      </div>
                    )}

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

                    <label htmlFor={`request-${application.id}`}>
                      Explain which additional documents are needed
                    </label>
                    <textarea
                      id={`request-${application.id}`}
                      value={documentRequestMessages[application.id] || ""}
                      onChange={(event) =>
                        setDocumentRequestMessages((current) => ({
                          ...current,
                          [application.id]: event.target.value,
                        }))
                      }
                      maxLength={1000}
                      placeholder="For example: Please upload your latest transcript."
                    />

                    {documentRequestErrors[application.id] && (
                      <p className="error">
                        {documentRequestErrors[application.id]}
                      </p>
                    )}

                    <button
                      className="request-documents-button"
                      type="button"
                      disabled={
                        submittingDocumentRequestFor === application.id
                      }
                      onClick={() =>
                        submitDocumentRequest(application.id)
                      }
                    >
                      {submittingDocumentRequestFor === application.id
                        ? "Sending request..."
                        : "Request additional documents"}
                    </button>

                    <label htmlFor={`reason-${application.id}`}>
                      Reason for final decision
                    </label>
                    <textarea
                      id={`reason-${application.id}`}
                      value={decisionReasons[application.id] || ""}
                      onChange={(event) =>
                        setDecisionReasons((current) => ({
                          ...current,
                          [application.id]: event.target.value,
                        }))
                      }
                      maxLength={1000}
                      placeholder="Explain why you are approving or rejecting this application."
                    />

                    <div className="decision-actions">
                      <button
                        className="approve-button"
                        type="button"
                        disabled={submittingDecisionFor === application.id}
                        onClick={() =>
                          submitDecision(application.id, "approved")
                        }
                      >
                        Approve
                      </button>
                      <button
                        className="reject-button"
                        type="button"
                        disabled={submittingDecisionFor === application.id}
                        onClick={() =>
                          submitDecision(application.id, "rejected")
                        }
                      >
                        Reject
                      </button>
                    </div>
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

            {user.role === "admin" && (
              <>
                <section>
                  <h2>Manage users</h2>
                  <p>View accounts and update their roles.</p>

                  <button
                    className="full-width"
                    type="button"
                    onClick={loadAdminUsers}
                  >
                    Load users
                  </button>

                  {adminError && <p className="error">{adminError}</p>}
                  {adminMessage && <p className="message">{adminMessage}</p>}

                  {adminUsersLoaded && adminUsers.length === 0 && (
                    <p>No users found.</p>
                  )}

                  {adminUsers.map((account) => (
                    <article className="admin-user" key={account.id}>
                      <p>
                        <strong>{account.email}</strong>
                      </p>
                      <p>
                        Current role:{" "}
                        <span className="role">{account.role}</span>
                      </p>

                      <label htmlFor={`role-${account.id}`}>
                        Change role
                      </label>
                      <select
                        id={`role-${account.id}`}
                        value={roleEdits[account.id] || account.role}
                        disabled={account.email === user.email}
                        onChange={(event) =>
                          setRoleEdits((current) => ({
                            ...current,
                            [account.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="applicant">Applicant</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="admin">Admin</option>
                      </select>

                      {account.email === user.email ? (
                        <p>Your own role cannot be changed here.</p>
                      ) : (
                        <button
                          type="button"
                          disabled={savingRoleFor === account.id}
                          onClick={() => saveUserRole(account.id)}
                        >
                          {savingRoleFor === account.id
                            ? "Saving..."
                            : "Save role"}
                        </button>
                      )}
                    </article>
                  ))}
                </section>

                <section>
                  <h2>Manage verification rules</h2>
                  <p>
                    Create rules, add versions, and deactivate rules. Earlier
                    versions remain in the history.
                  </p>

                  <button
                    className="full-width"
                    type="button"
                    onClick={loadAdminRules}
                  >
                    Load verification rules
                  </button>

                  {rulesError && <p className="error">{rulesError}</p>}
                  {rulesMessage && <p className="message">{rulesMessage}</p>}

                  <form className="rule-form" onSubmit={createRule}>
                    <h3>Add a verification rule</h3>

                    <label htmlFor="new-rule-key">Rule key</label>
                    <input
                      id="new-rule-key"
                      value={ruleForm.rule_key}
                      onChange={(event) =>
                        setRuleForm((current) => ({
                          ...current,
                          rule_key: event.target.value,
                        }))
                      }
                      pattern="[a-z0-9][a-z0-9_-]*"
                      minLength={2}
                      maxLength={64}
                      placeholder="transcript-required"
                      required
                    />

                    <label htmlFor="new-rule-name">Rule name</label>
                    <input
                      id="new-rule-name"
                      value={ruleForm.name}
                      onChange={(event) =>
                        setRuleForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      maxLength={120}
                      required
                    />

                    <label htmlFor="new-rule-description">Description</label>
                    <textarea
                      id="new-rule-description"
                      value={ruleForm.description}
                      onChange={(event) =>
                        setRuleForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      maxLength={2000}
                      required
                    />

                    <label htmlFor="new-rule-effective-from">
                      Effective from
                    </label>
                    <input
                      id="new-rule-effective-from"
                      type="datetime-local"
                      value={ruleForm.effective_from}
                      onChange={(event) =>
                        setRuleForm((current) => ({
                          ...current,
                          effective_from: event.target.value,
                        }))
                      }
                      required
                    />

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={ruleForm.active}
                        onChange={(event) =>
                          setRuleForm((current) => ({
                            ...current,
                            active: event.target.checked,
                          }))
                        }
                      />
                      Active
                    </label>

                    <button
                      type="submit"
                      disabled={savingRuleAction === "create"}
                    >
                      {savingRuleAction === "create"
                        ? "Creating..."
                        : "Create rule"}
                    </button>
                  </form>

                  {adminRulesLoaded && ruleGroups.length === 0 && (
                    <p>No verification rules found.</p>
                  )}

                  {ruleGroups.map((versions) => {
                    const latest = versions[0];
                    const draft = ruleVersionDrafts[latest.rule_key] || {
                      name: latest.name,
                      description: latest.description,
                      effective_from: localDateTimeValue(),
                      active: latest.active,
                    };

                    return (
                      <article className="rule-card" key={latest.rule_key}>
                        <h3>{latest.name}</h3>
                        <p>
                          <strong>Rule key:</strong> {latest.rule_key}
                        </p>
                        <p>
                          <strong>Latest version:</strong> {latest.version}
                        </p>
                        <p>
                          <strong>Status:</strong>{" "}
                          <span
                            className={`rule-status${latest.active ? "" : " inactive"}`}
                          >
                            {latest.active ? "Active" : "Inactive"}
                          </span>
                        </p>

                        <h4>Version history</h4>
                        <ul className="rule-history">
                          {versions.map((version) => (
                            <li key={version.id}>
                              <strong>Version {version.version}</strong>
                              {" — "}
                              {version.active ? "Active" : "Inactive"}
                              {" — effective "}
                              {new Date(
                                version.effective_from,
                              ).toLocaleString()}
                              <br />
                              {version.description}
                            </li>
                          ))}
                        </ul>

                        <form
                          className="rule-form"
                          onSubmit={(event) =>
                            createRuleVersion(event, latest)
                          }
                        >
                          <h4>Create a new version</h4>

                          <label htmlFor={`rule-name-${latest.rule_key}`}>
                            Name
                          </label>
                          <input
                            id={`rule-name-${latest.rule_key}`}
                            value={draft.name}
                            onChange={(event) =>
                              updateRuleVersionDraft(
                                latest,
                                "name",
                                event.target.value,
                              )
                            }
                            maxLength={120}
                            required
                          />

                          <label
                            htmlFor={`rule-description-${latest.rule_key}`}
                          >
                            Description
                          </label>
                          <textarea
                            id={`rule-description-${latest.rule_key}`}
                            value={draft.description}
                            onChange={(event) =>
                              updateRuleVersionDraft(
                                latest,
                                "description",
                                event.target.value,
                              )
                            }
                            maxLength={2000}
                            required
                          />

                          <label
                            htmlFor={`rule-effective-${latest.rule_key}`}
                          >
                            Effective from
                          </label>
                          <input
                            id={`rule-effective-${latest.rule_key}`}
                            type="datetime-local"
                            value={draft.effective_from}
                            onChange={(event) =>
                              updateRuleVersionDraft(
                                latest,
                                "effective_from",
                                event.target.value,
                              )
                            }
                            required
                          />

                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={draft.active}
                              onChange={(event) =>
                                updateRuleVersionDraft(
                                  latest,
                                  "active",
                                  event.target.checked,
                                )
                              }
                            />
                            Active
                          </label>

                          <button
                            type="submit"
                            disabled={
                              savingRuleAction ===
                              `version:${latest.rule_key}`
                            }
                          >
                            {savingRuleAction ===
                            `version:${latest.rule_key}`
                              ? "Saving version..."
                              : "Create version"}
                          </button>
                        </form>

                        {latest.active && (
                          <button
                            className="reject-button"
                            type="button"
                            disabled={
                              savingRuleAction ===
                              `deactivate:${latest.rule_key}`
                            }
                            onClick={() => deactivateRule(latest)}
                          >
                            {savingRuleAction ===
                            `deactivate:${latest.rule_key}`
                              ? "Deactivating..."
                              : "Deactivate rule"}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </section>
              </>
            )}

            <button className="full-width" type="button" onClick={logout}>
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