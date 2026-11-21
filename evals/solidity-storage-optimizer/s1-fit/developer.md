# What the developer answers

Answer only what the run asks, from these positions.

- The vault is not deployed, and nothing reads its storage yet.
- `MAX_SUPPLY` is enforced by the VAULT token, which lives in another repository. Treat it as given; the report should list it as an assumption.
- Choose the lossless option, without either library. Rounding a staker's balance is not worth one more slot.
- `Account` stays the type callers see. A storage-only packed struct behind it, a getter that returns what `accounts(address)` returns today, and a new error for a value past its field are all fine.
- Once the plan is approved: build it, measure against the contract as it is today, and report as the skill asks.
