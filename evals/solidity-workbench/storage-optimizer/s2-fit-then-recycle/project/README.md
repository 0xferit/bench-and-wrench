# Listings

The listing book of our marketplace: fixed-price listings paid in the native currency.

Status: in development, not deployed. Listings are short-lived: on the current testnet build about
nine in ten are bought or delisted within a day, and the number open at any time stays roughly flat.

Dependencies are managed with Soldeer (`foundry.toml`, `soldeer.lock`).

```sh
forge build
forge test
```
