## ADDED Requirements

### Requirement: The model controls a validated tool loop
When DeepSeek is configured, the Mentor SHALL let the model choose legal tools and validated arguments from current observations, process tool results, replan, repeat when justified, and call an explicit finish action.

#### Scenario: Dynamic tool path
- **WHEN** a turn requires syntax inspection followed by counterexample verification
- **THEN** the returned trace reflects the model-selected tool arguments and the subsequent choices are based on prior tool observations

#### Scenario: Early finish
- **WHEN** sufficient verified evidence already exists
- **THEN** the model can finish before exhausting the step budget and the trace records the stopping reason

#### Scenario: Invalid model action
- **WHEN** the model requests an unknown tool, invalid argument, forbidden evidence, or exceeds a repeat budget
- **THEN** the action is rejected, recorded, and a deterministic safe policy continues or finishes without changing judge truth

### Requirement: Runtime truth and privacy are enforced
The Mentor MUST preserve judge authority, keep hidden tests and server secrets out of model context, and bound source, tool, latency, and token budgets.

#### Scenario: Verdict conflict
- **WHEN** model output conflicts with the judge outcome
- **THEN** the judge outcome remains unchanged and the conflict is recorded as rejected model output

### Requirement: DeepSeek configuration is server-only
The gateway SHALL read the DeepSeek key from server environment variables and SHALL expose only provider mode, model identifier, latency, and token usage to the web client.

#### Scenario: DeepSeek key is configured
- **WHEN** `DEEPSEEK_API_KEY` and a supported model are available
- **THEN** the Mentor uses DeepSeek tool calls without embedding the key in browser code, responses, logs, or backups
