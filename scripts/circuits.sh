#!/bin/sh
set -e

# if zk/zkey does not exist, make folder
[ -d zk/zkey ] || mkdir zk/zkey

# if zk/contracts does not exist, make folder
[ -d zk/contracts ] || mkdir zk/contracts

# Compile circuit
circom zk/makeChoice.circom -o zk/ --r1cs --wasm

# Setup
snarkjs groth16 setup zk/makeChoice.r1cs zk/ptau/pot15_final.ptau zk/zkey/makeChoice_final.zkey

# Phase 2
snarkjs zkey export verificationkey zk/zkey/makeChoice_final.zkey zk/zkey/choice_verification_key.json

# Export choice verifier
snarkjs zkey export solidityverifier zk/zkey/makeChoice_final.zkey zk/contracts/ChoiceVerifier.sol

# Update contract name
sed -i'.bak' 's/contract Verifier/contract ChoiceVerifier/g' zk/contracts/ChoiceVerifier.sol

# Copy some artifacts over to packages
cp zk/contracts/ChoiceVerifier.sol packages/hardhat-ts/contracts/ChoiceVerifier.sol
cp zk/zkey/choice_verification_key.json packages/vite-app-ts/public/choice_verification_key.json 
cp zk/zkey/makeChoice_final.zkey packages/vite-app-ts/public/makeChoice_final.zkey
cp zk/makeChoice_js/makeChoice.wasm packages/vite-app-ts/public/makeChoice.wasm

# remove artifacts
rm zk/contracts/*.bak
