# OrderGlass

[Open Schedule Studio](https://gqzy999.github.io/orderglass-genlayer/) · [Open the pair workspace](https://gqzy999.github.io/orderglass-genlayer/pair.html)

Schedule Studio evaluates **all six orders of three configuration operations**.
Choose a starting state, rotate the 3D model, and select a path to inspect or
replay its intermediate states. Completed and stopped paths remain readable
through keyboard-accessible order buttons, including where WebGL is unavailable.
The pair workspace retains the original two-operation comparison and evidence.

## Three-operation schedules

1. Open a published case to inspect a finalized schedule without a wallet.
2. Choose a start and an order. The workbench shows each destination, the final
   state, or the first operation that was blocked or unspecified.
3. To try new rules, connect an EIP-1193 wallet on Stable Studionet or create a
   temporary test account, then seal a case with 2–6 states and three rules.
4. Run **Compare with GenLayer**. After finality, the owner may record one
   completed order from the selected start using the exact certificate.
   REVIEW and NO SCHEDULE block rehearsals. Rehearsal records abstract states.

Validators independently compile the original text into a complete
operation-major vector of destination indices, BLOCKED or UNKNOWN. They must
agree on every cell. The accepted evidence quotes must occur in the rule of
the corresponding operation. Deterministic code simulates each permutation
from every declared start, stops at the first invalid transition, and binds
the exact paths to a certificate. An order can be viable even if other orders
are blocked or end elsewhere. The browser checks the deployed source, protocol,
input hash, quotes, recomputed paths and any recorded rehearsal.

The accepted [two-operation baseline](https://github.com/gqzy999/orderglass-genlayer/tree/9467a427d6b7f03b647737867fc4cbc4e34536bd)
compares 2 orders. The schedules deployment enumerates 6, exposes per-start
blocking and divergence, and authorizes a specific complete path rather than
requiring all orders to commute.

[Live schedule contract](https://explorer-studio.genlayer.com/address/0x4Ab127A88f23E3D1cA98a87A79143D46200a310B) · [Contract source](contracts/orderglass_schedules.py) ·
[Finalized receipts and readbacks](evidence/schedules-studionet.json) ·
[Official SDK lint](evidence/schedules-lint.json)

```sh
npm ci
npm test
python3 -B -m unittest discover -s contract-tests -v
npm run build
npm run verify:schedules
```

`verify:schedules` re-reads the stored hashes, verifies their finalized
execution, checks deployed source byte parity and recomputes the finalized
schedule proofs. The scheduled-workspace transport uses genlayer-js 2.0.0
under the `genlayer-studio` alias to include the current network fee policy.
Writes use test GEN for network fees and transfer zero value to the contract.

## Original pair workspace

**Same actions. Different ending?**

OrderGlass makes a narrow configuration question inspectable: do two written operations produce the same result when their order is exchanged? A quiet-mode change can disable a refresh that would otherwise occur. The desk places both paths side by side, shows their intermediate states, and preserves the exact starting state that exposes the difference.

The application includes its Intelligent Contract source. The browser writes real transactions, waits for successful finality and reads finalized state. No backend, paid model API key, token, deposit or real configuration access is required.

## Explore

- **Explore** contains three authored examples, explicitly labelled as illustrations. Switch starting states to compare both compositions. These interactions send no transactions.
- **On GenLayer** reads the three published cases without a wallet. Source, protocol, input hash, quoted evidence, complete composition proof and certificate are verified in the browser.
- **Conditional refresh** exposes a different ending from `loud-cached`: A→B ends `quiet-cached`, while B→A ends `quiet-fresh`.
- **Independent edits** sets quiet and fresh independently. Both orders agree at every starting state. Its owner may record one certificate-bound pair rehearsal.
- **An omitted mode** leaves one operation unspecified in `loud`. It becomes REVIEW; no identity transition is invented.

## Use your own model

1. Connect an injected EIP-1193 wallet on Stable Studionet, or select the explicitly labelled temporary browser evaluation account. Temporary keys stay in page memory and disappear on reload; this is not an extension-wallet signature.
2. Enter a fresh case ID and a specification with a title, scope, 2–6 unique atomic states and exactly two named operation rules. Examples are in [examples/](examples/).
3. **Seal these inputs** stores an immutable specification in the signing address's namespace. Wait for FINALIZED / SUCCESS and finalized readback.
4. **Compare with GenLayer** independently compiles every operation/state cell through consensus, then deterministically compares both orders at every start.
5. Inspect the complete table, original rules, accepted quotes, reasons and certificate. ORDER_SENSITIVE and REVIEW block rehearsals. A corrected specification requires a new ID.
6. If COMMUTES, the owner may record a supported starting state and AB or BA order using the exact certificate. REHEARSED is terminal. This changes only the contract's abstract journal; it never runs a shell command or edits an external service.

All input is public metadata. Do not include secrets, credentials, private configuration or personal information. Reads require no signer. Writes transfer zero value and stop if the reported gas price is nonzero. Saved hashes resume tracking after refresh; ambiguous submissions are never automatically resent.

## Why GenLayer

The model interprets ordinary-language operations as finite partial functions. The leader's proposed table is not trusted alone: validators independently compile the original specification and compare the full ordered destination/enablement/unknown vector. Each quote must occur verbatim in the corresponding operation rule. Reasons and quote choices may differ. The model never chooses whether operations commute.

Deterministic contract code composes both functions, detects changes in results or enablement, identifies the common executable domain, and binds that proof to the immutable input. Other clients can inspect one shared accepted interpretation rather than relying on one application's model response.

## Development

Node.js 22+, Python 3.12+:

```sh
npm ci
npm test
python -m unittest discover -s contract-tests -v
npm run build
npm run dev
```

Production output is `dist/`. The pair workspace retains its original `genlayer-js` 1.1.8 transport. Use the schedules workspace for writes when the network requires fee allocation parameters. The contract's runner is pinned in its dependency header. A newer-runner lint advisory is informational; Studio schema compilation is a separate compatibility check.

[Mechanism and state design](MECHANISM.md) · [Validation and limits](VALIDATION.md) · [Deployment coordinates](evidence/deployment.json) · [Recorded transactions](evidence/live.json) · [Contract source](contracts/orderglass.py)

## Model limits

The declared states must exhaust all relevant configuration dimensions, and operations must be atomic and sequential. Hidden state, concurrency, timing, external I/O, retries, crashes and output events are outside this finite model. Equal final states do not establish equivalent side effects. A common blocked outcome means neither sequence completes; it does not authorize a rehearsal. Consensus agreement is not a proof that the specification describes a real system correctly. No actual configuration or funds are modified.
