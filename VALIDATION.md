# OrderGlass validation

## Network and compatibility

Stable Studionet only: chain ID 61999, `https://studio.genlayer.com/api`. The live preflight returned `0xf22f` and the pinned GenLayer SDK compiled the complete source using `getContractSchemaForCode`. The constructor has no arguments; there are three write methods and two views. The exact deployed source and `orderglass-1` protocol were read back. [Deployment](evidence/deployment.json), [linter result](evidence/lint.json).

The official [network table](https://docs.genlayer.com/developers/networks), [contract methods](https://docs.genlayer.com/api-references/genlayer-js/contracts), and [custom equivalence interface](https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle) describe the relevant boundaries. This application pins `genlayer-js` 1.1.8 and the source runner for the stable deployment; preview-network fee examples are not used.

## Recorded consensus

The fixture describes synthetic abstract configuration. It does not claim to observe an actual service. One disposable SDK account performs the live lifecycle, with no attached value or funding transaction. Normal consensus is used (`leaderOnly: false`). The accepted comparison receipts contain multiple validator votes; majority agreement is not described as unanimity.

| Case | Accepted result | Inspectable consequence |
| --- | --- | --- |
| `sensitive` | ORDER_SENSITIVE | Start 2: AB has steps 0,0; BA has steps 3,1 |
| `independent` | COMMUTES, then REHEARSED | All four rows agree; BA from 2 records steps 3,1 and final state 1 |
| `incomplete` | REVIEW | One operation does not define the loud mode; rehearsal is unavailable |

[Machine-readable lifecycle](evidence/live.json) contains transaction coordinates and accepted records. [Complete SDK receipts](evidence/receipts.json.gz) preserve consensus data. Expected guard failures are retained, not removed from the record.

Two deliberately rejected calls are bound to their transaction calldata and verified using FINALIZED / ERROR plus complete equal before/after records: attempting to rehearse the ORDER_SENSITIVE case, and attempting to rehearse the commuting case with a stale certificate. Guard names identify intended source branches; a readable error string in a receipt is not asserted as the proof. No Appeal or automatic transaction resend is used.

A separately constructed unauthenticated SDK client reads all three full finalized records and compares them with the lifecycle snapshots. The readback includes state, full cells, complete proof, certificate and rehearsal. `scripts/check-evidence.mjs` verifies archived evidence without network traffic. `scripts/read.mjs` is an optional read-only client; it sends no transactions.

## Local tests, distinct from consensus

- Nine mocked-host contract tests: both outcomes, uncertain cells, non-enablement, exact source quotes, independent-vector disagreement and rollback, owner namespace, stale certificates, duplicate IDs, numeric response rejection and one-time rehearsal. Atomic rollback in these tests is simulated; it is not a separate GenVM execution.
- Six JavaScript tests: exact counterexample paths, independent edits, unknown cells outside traversed paths, disabled-operation semantics, HTML escaping and finality/execution classification.
- GenVM lint passes AST and SDK validation. Its newer-runner advisory is informational. The production build targets ES2022 and separates the SDK chunk. The SDK chunk remains above the bundler's 500-kB advisory threshold; gzip is approximately 116 kB.

## Browser scope

Desktop browser controls read a real finalized case and verify exact source, protocol, immutable input hash, verbatim evidence, full deterministic composition and certificate. Selecting loud-cached displays the chain's differing intermediate and final states. Authored examples are explicitly separated from chain mode.

A 390-pixel embedded viewport measured 375 pixels of client width and 375 pixels of scroll width in the order-sensitive example, REVIEW example and temporary-account connection view. Browser temporary-account creation was exercised and labelled separately from injected wallets. These layout interactions sent no writes. See [browser observations](evidence/browser.json).

Live transaction evidence comes from the SDK lifecycle script. Browser form signing with physical wallet extensions, physical mobile devices and mobile wallet deep links are outside the recorded evidence. The UI's write methods are present, but the recorded browser session verifies reads, visual transitions and temporary signer creation rather than claiming a second UI-signed live loop.

## Limits

This checks final abstract state and partial-operation enablement under the declared finite universe. It does not establish equivalent output events, external effects, concurrent behavior, crash recovery, actual system configuration or model accuracy on arbitrary prose. An accepted UNKNOWN represents business uncertainty; infrastructure failure or rejected consensus must never be counted as accepted REVIEW. The source and certificate cannot prove that a supplied description is truthful.
