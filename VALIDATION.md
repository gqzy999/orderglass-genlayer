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


## Schedule Studio on Stable Studionet

[Schedule contract](https://explorer-studio.genlayer.com/address/0x4Ab127A88f23E3D1cA98a87A79143D46200a310B)
· [Deployment transaction](https://explorer-studio.genlayer.com/tx/0x6fd7e5d231d51235c2f3fd09dfc7252347d9e948eaee81cff209016d264714da)
· [Receipts and readbacks](evidence/schedules-studionet.json)
· [GenVM lint](evidence/schedules-lint.json)

Deployment, all five seals, all five comparisons and both completed rehearsals
reached FINALIZED / SUCCESS. The three rejected rehearsals reached FINALIZED
with the expected contract errors. The evidence includes the complete state and
certificate for every example, including paths that cannot be rehearsed.

| Case | Comparison state | Transactions |
| --- | --- | --- |
| Back up, switch, restart | ORDER_CONSTRAINED | [seal](https://explorer-studio.genlayer.com/tx/0xf2325b20ea89a737c3eed7a7e50690e79cd0ecf8a9b2f6382fb8da0f57e2e4c1) · [compare](https://explorer-studio.genlayer.com/tx/0x5b0967a05719eb1eeb802e46785b3fa832e6d667362616b7af29ac6c527c9734) · [reject](https://explorer-studio.genlayer.com/tx/0x99e1d8c2a4177a2711746d36eef19cfb9cf35e1a97f70212ee5a3bc4af2d67b2) · [rehearse](https://explorer-studio.genlayer.com/tx/0x2521bfb0d87bf7816a49d36cde6d44d78dbfffeb03673d2bacca2a53e4786075) |
| Conflicting cache policies | DIVERGENT | [seal](https://explorer-studio.genlayer.com/tx/0x78d55040bf65328c2c707dce58ea242ebbae4c46757e0d2c68e6aa20d9d102a5) · [compare](https://explorer-studio.genlayer.com/tx/0xe0a7dcd40c81678f24514d0364ded13ce3505b2793af5da3061fdf52d77e4e80) · [rehearse](https://explorer-studio.genlayer.com/tx/0xfe5243d8d07f657663761788e688b007f395208026e297cdb5c89c402ca3dec4) |
| Stable logging rollout | ORDER_FLEXIBLE | [seal](https://explorer-studio.genlayer.com/tx/0xa62ce51aa546128c11f0f67f9ba47af4c1041a0ef995d8ecc23283660229b672) · [compare](https://explorer-studio.genlayer.com/tx/0x746030311c64a4d32a91edd9f1c53450bc3a19096edd19d3dd7aad713939f9e5) |
| A missing restore rule | REVIEW | [seal](https://explorer-studio.genlayer.com/tx/0xda880275c26d8d624b757cf2368187f15a572b553b538533cea047e894c133bd) · [compare](https://explorer-studio.genlayer.com/tx/0x5b3ae818533aef1081c7e205543d84a4b5572f6f648b8a3d9ce6906e04fc1688) · [reject](https://explorer-studio.genlayer.com/tx/0x20e9e5867eb416a2030e36cba7dee3b6586408264b661c624a27a1ff9c40b9af) |
| Disabled release checkpoint | NO_SCHEDULE | [seal](https://explorer-studio.genlayer.com/tx/0x356f0df9b48a65e8dea639d933085929bd00c525e8ad845a77e11ac17d0f363d) · [compare](https://explorer-studio.genlayer.com/tx/0xacda3153d2fba7cb06e79483a6a6f9ee2c50519cce6ad34ca7f429488b5110dd) · [reject](https://explorer-studio.genlayer.com/tx/0xae7ab2c2a3bc87fe9654a57115868e2005da2b237867bcd1aa7de80fca3f3481) |

Run `npm run verify:schedules` to verify the source bytes, receipt destinations
and calldata, final status and state readback against Stable Studionet. The
Python tests exercise a stubbed VM, including third-operation disagreement and
rehearsal guards. The JavaScript tests recompute the schedule and reject a
tampered path. The historical pair evidence remains separately reproducible
with `npm run check:evidence`.
