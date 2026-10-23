# Phase 1 User Stories and Acceptance Criteria

## US-01: Sign in securely - Must
As an applicant, I want to create an account and sign in securely, so that I can submit and track my applications.

Acceptance criteria:
- A user can register with an email and password.
- The system rejects an email that is already registered.
- Protected pages require sign-in.
- Applicant, reviewer, and administrator access is restricted by role.

## US-02: Upload application documents - Must
As an applicant, I want to upload documents to an application, so that my evidence can be reviewed together.

Acceptance criteria:
- I can select a document type and upload PDF, JPG, or PNG files.
- The system rejects unsupported or oversized files with a clear message.
- I can add optional notes and link multiple files to one application.
- The system confirms when a file is received.

## US-03: Track application status - Must
As an applicant, I want to see my application status and document requests, so that I know what to do next.

Acceptance criteria:
- I can see only my own applications.
- Each application shows its status and submitted documents.
- Reviewer requests show what is needed and include a message.
- I can upload a requested document to the same application.

## US-04: View review queue - Must
As a reviewer, I want to see applications waiting for review, so that I can prioritize my work.

Acceptance criteria:
- The queue shows application status and submission date.
- I can open an application from the queue.
- I can filter the queue by status.

## US-05: Review documents and extracted fields - Must
As a reviewer, I want to view documents beside extracted information, so that I can check the evidence efficiently.

Acceptance criteria:
- The application view shows the original file and extracted fields.
- Missing or unreadable fields are clearly identified.
- I can correct an extracted field.
- The system records who made a correction and when.

## US-06: Understand verification findings - Must
As a reviewer, I want a report explaining the checks and sources, so that I understand why an application was flagged.

Acceptance criteria:
- The report shows a recommendation: Verified, Needs Review, or Rejected.
- It lists passed and failed checks with explanations.
- Findings cite the rule or reference source used.
- Uncertain or missing evidence is marked for human review.

## US-07: Record the final decision - Must
As a reviewer, I want to accept or override the AI recommendation with a justification, so that a human remains responsible for the outcome.

Acceptance criteria:
- I can record a final decision.
- An override requires a justification.
- The final human decision is shown separately from the AI recommendation.
- The system records the reviewer and decision time.

## US-08: Request more documents - Should
As a reviewer, I want to request additional documents, so that an applicant can resolve missing evidence.

Acceptance criteria:
- I can specify the requested document and add a message.
- The applicant can see the request and submit the document.
- The new file is linked to the same application.

## US-09: Manage user roles - Must
As an administrator, I want to manage user roles, so that people have appropriate access.

Acceptance criteria:
- An administrator can view users and change their roles.
- Only administrators can change roles.
- Role changes are recorded with the actor and time.

## US-10: Manage verification rules - Should
As an administrator, I want to manage versioned verification rules, so that checks use current requirements.

Acceptance criteria:
- I can add, update, or deactivate a rule.
- Each rule has a version and effective date.
- New reports use active rules.
- Existing reports retain the version they used.

## US-11: View audit history - Should
As an administrator, I want to review important system activity, so that decisions and changes can be traced.

Acceptance criteria:
- The history records uploads, report creation, corrections, rule changes, and final decisions.
- Each record includes an actor and time.
- Ordinary users cannot change audit records.

## US-12: Ask questions about an application - Could
As a reviewer, I want to ask questions about an application and receive answers with sources, so that I can investigate findings more quickly.

Acceptance criteria:
- Answers use application data and approved reference sources.
- Answers include citations.
- Missing information is stated as unknown.
- The feature is available only to authorized reviewers.