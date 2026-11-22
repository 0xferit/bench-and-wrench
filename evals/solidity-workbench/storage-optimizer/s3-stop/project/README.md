# Treasury

Vesting grants for contributors, paid in the native currency.

Status: live on mainnet since block 21480313, behind an ERC-1967 proxy (see `deployments/mainnet.json`).
The proxy currently runs implementation version 3 and holds 312 grants, 188 of them still vesting.
Upgrades go out on Fridays through `upgradeToAndCall`, signed by the admin multisig.

Dependencies are managed with Soldeer (`foundry.toml`, `soldeer.lock`).

```sh
forge build
forge test
```
