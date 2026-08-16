## ADDED Requirements

### Requirement: Recovery navigation preserves exact recommendation context

The system SHALL encode the source lesson, return lesson, and deterministic recommendation ID in the recovery route while preserving compatibility with ordinary training routes.

#### Scenario: Confused learner opens the source review

- **WHEN** a learner chooses `unclear` on an evidence-bound handoff
- **THEN** the source-training link contains the exact return lesson and recommendation identity

#### Scenario: Ordinary training link remains valid

- **WHEN** a training URL has no recovery query
- **THEN** it parses and renders as an ordinary training session

### Requirement: Recovery context is verified, visible, and reversible

The system SHALL show recovery context only when the route identity matches the current evidence-derived handoff and source lesson, and SHALL offer an explicit one-click return to the named recommended lesson.

#### Scenario: Valid context enters the training cabin

- **WHEN** the return lesson's current handoff matches both recommendation ID and open source lesson
- **THEN** the cabin explains why the review opened and names the lesson the learner can return to

#### Scenario: Context is stale or forged

- **WHEN** either identity does not match the current handoff
- **THEN** the cabin renders as ordinary training without a recovery claim

### Requirement: Recovery navigation is not mastery evidence

The system SHALL NOT emit learning signals when merely opening recovery context or returning to the recommended lesson.

#### Scenario: Learner returns without completing review

- **WHEN** the learner uses the explicit return action
- **THEN** navigation occurs without completion, transfer, mastery, or synthetic feedback events

### Requirement: Pending append-only feedback survives server bootstrap

The system SHALL merge valid local-only and remote learning events by immutable ID when adopting a server bootstrap, while treating the remote version as authoritative for an ID conflict.

#### Scenario: Feedback has not synchronized before reload

- **WHEN** local memory contains a valid response event absent from the server bootstrap
- **THEN** the response remains in local memory and visible after bootstrap so the outbox can retry it

#### Scenario: Server and local event share an ID

- **WHEN** local and remote events have the same immutable ID
- **THEN** the remote event wins without deleting unrelated local-only events
