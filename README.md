# OrderGlass

[Open the experiment desk](https://gqzy999.github.io/orderglass-genlayer/)

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

Production output is `dist/`. The JavaScript SDK is pinned to `genlayer-js` 1.1.8 for Stable Studionet compatibility. The contract's runner is pinned in its dependency header. A newer-runner lint advisory is informational; Studio schema compilation is a separate compatibility check.

[Mechanism and state design](MECHANISM.md) · [Validation and limits](VALIDATION.md) · [Deployment coordinates](evidence/deployment.json) · [Recorded transactions](evidence/live.json) · [Contract source](contracts/orderglass.py)

## Model limits

The declared states must exhaust all relevant configuration dimensions, and operations must be atomic and sequential. Hidden state, concurrency, timing, external I/O, retries, crashes and output events are outside this finite model. Equal final states do not establish equivalent side effects. A common blocked outcome means neither sequence completes; it does not authorize a rehearsal. Consensus agreement is not a proof that the specification describes a real system correctly. No actual configuration or funds are modified.
