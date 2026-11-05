import { useState } from "react";

export default function DocumentUpload() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleUpload(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!file) {
      setError("Choose a PDF file first.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("The file must be 10 MB or smaller.");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("Please sign in again before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/documents", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Upload failed.");
        return;
      }

      setMessage(`Uploaded ${data.filename} successfully.`);
      setFile(null);
      event.target.reset();
    } catch {
      setError("Could not reach the backend. Check that Docker is running.");
    }
  }

  return (
    <section style={{ marginTop: "24px" }}>
      <h2>Upload an application document</h2>
      <form onSubmit={handleUpload}>
        <label htmlFor="document-file">PDF file (maximum 10 MB)</label>
        <input
          id="document-file"
          type="file"
          accept=".pdf,application/pdf"
          onChange={(event) => setFile(event.target.files[0] || null)}
          required
        />
        <button type="submit">Upload PDF</button>
      </form>
      {message && <p className="message">{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}