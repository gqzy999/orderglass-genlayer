# OrderGlass mechanism

Protocol: `orderglass-1`. Network: Stable Studionet 61999, `https://studio.genlayer.com/api`.

## Immutable input

Each `(owner, tag)` binds `title`, `scope`, `states` and two `operations`. State names are unique case-insensitively; operation names must differ. Each operation has a complete plain-language rule. A tag has 1–48 ASCII letters, digits, hyphens or underscores. Titles have 3–100 characters, scopes 30–1200, state names 1–40 and operation rules 30–1600. Raw JSON is bounded to 6000 characters. Duplicate IDs fail closed.

There is no time oracle, deadline, payable operation, funding requirement or appeal method.

## Semantic boundary

The operation-major vector has exactly `2 × N` cells. A cell result is a destination index **string**, `BLOCKED`, or `UNKNOWN`. BLOCKED means explicit non-enablement; UNKNOWN means ambiguous, missing, inconsistent or out-of-model behavior. A specified no-op returns its starting index.

The leader independently compiles the specification. Each validator independently compiles the same original input, rather than asking the model whether the leader is reasonable. It requires exact equality of all result labels. A difference in an unused cell still rejects equivalence. Each side validates shape, allowed labels, 6–400-character verbatim rule quotes and 8–400-character reasons. Quote and explanation wording may differ across participants; interpretation cannot. Any malformed response, invalid quote or disagreement aborts the transaction without accepting a business result.

The prompt identifies input as untrusted data. This reduces but cannot eliminate prompt-injection or common-mode model risk. Quotes establish textual support location; an exact quote alone is not semantic proof.

## Partial composition

Let A and B be partial functions on the named state universe. A path stops at the first BLOCKED/UNKNOWN result. Otherwise it applies the second operation to the intermediate state. For every state s, code records both `B(A(s))` and `A(B(s))`, including intermediate states.

| Row kind | Meaning |
| --- | --- |
| SAME | Both paths complete with the same named state |
| DIFFERENT | Different final state, or only one path completes |
| BOTH_BLOCKED | Neither composition is defined |
| UNKNOWN | At least one composition traverses an unresolved cell |

Overall precedence is deliberately conservative: **any UNKNOWN cell anywhere → REVIEW**; else any DIFFERENT row → ORDER_SENSITIVE; else at least one SAME row → COMMUTES; else NO_COMMON_DOMAIN. Unknown cells cannot be hidden by an early stop in a selected path. COMMUTES is equality of these partial compositions with a nonempty executable domain, not a claim that both operations are enabled everywhere. A BOTH_BLOCKED row is never a valid rehearsal start.

## State and methods

`SEALED → COMMUTES | ORDER_SENSITIVE | REVIEW | NO_COMMON_DOMAIN`.

Only COMMUTES can become REHEARSED. All other assessed states are terminal. Any caller may trigger comparison; only the owner may rehearse. There is one rehearsal per case. No upgrade or specification amendment is supported.

| Method | Access and effect |
| --- | --- |
| `open_case(tag, payload)` | Sender seals new immutable input |
| `compare(owner, tag)` | Anyone; SEALED only; accepts full consensus table and deterministic proof atomically |
| `rehearse(tag, certificate, start, order)` | Owner namespace only; COMMUTES, exact certificate, valid SAME row, AB/BA only |
| `get_case(owner, tag)` | Public finalized record; missing case returns empty string |
| `get_protocol()` | Returns `orderglass-1` |

Record fields are `protocol`, `owner`, `tag`, `spec`, `input_hash`, `state`, `cells`, `proof`, `certificate`, `rehearsal`. The proof retains every row, all counterexample start indices and all usable starts. The certificate hashes protocol, input hash, complete accepted vector and proof. All hashes are SHA-256 over sorted-key compact UTF-8 JSON. No floats cross the nondeterministic boundary.

## Failure behavior

Guards include NOT_FOUND, ALREADY_EXISTS, NOT_SEALED, NOT_COMMUTING, STALE_CERTIFICATE, NO_COMMON_START, INVALID_REHEARSAL, INVALID_MATRIX and UNSUPPORTED_QUOTE. A different sender cannot rehearse an existing owner's case because the write derives its namespace from the signer. Missing/malformed model output never becomes an accepted REVIEW. Guard proofs on Studio use finalized error execution plus complete unchanged-state readback; a readable receipt error string is not required.
