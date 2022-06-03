# Rock Paper Scissors
Templated from Scaffold-Eth Typescript

## Typescript

This was the typescript repo of scaffold.eth. Check out the directories:

```bash
packages/vite-app-ts/
packages/hardhat-ts/
```

## Quick Start

Running the app

1. install dependencies

   ```bash
   yarn install
   ```

2. start a hardhat node

   ```bash
   yarn chain
   ```

3. run the app, `you'll need to open a new command prompt`

   ```bash
   yarn contracts:build
   yarn deploy
   yarn start
   ```

## Overview

Everything you need to build on Ethereum! 🚀

🧪 Quickly experiment with Solidity using a frontend that adapts to your smart contract.

## Building on scaffold-eth-typescript

🔏 Edit your smart contracts in `packages/hardhat-ts/contracts`

📝 Edit your frontend in `packages/vite-app-ts/src`

💼 Edit your deployment scripts in `packages/hardhat-ts/deploy`

📱 Open http://localhost:3000 to see the app

## Installing Dependencies

Node Version Manager (nvm)
```bash
touch ~/.bash_profile
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.1/install.sh | bash
exec $SHELL
source ~/.bash_profile
nvm --version
```
Node Version 14
```bash
nvm install 14
```
Yarn
```bash
curl -o- -L https://yarnpkg.com/install.sh | bash
exec $SHELL
```

## Compile Circuits

1. Run ceremony
```bash
./scripts/ptau.sh
```
2. Setup circom
```bash
./scripts/setup_circom.sh
```
3. Compile circuit
```bash
./scripts/circuits.sh
```
4. (optional) Generate a proof
```bash
./scripts/generate_proof.sh
```
