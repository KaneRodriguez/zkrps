#!/bin/sh
set -e

# if zk/ptau does not exist, make folder
[ -d zk/ptau ] || mkdir zk/ptau

# Phase 1 ceremony
snarkjs powersoftau new bn128 15 zk/ptau/pot15_0000.ptau -v

# Phase 2 ceremony
## TODO improve entropy
snarkjs powersoftau contribute zk/ptau/pot15_0000.ptau zk/ptau/pot15_0001.ptau \
    --name="First contribution" -v -e="$(head -n 4096 /dev/urandom | openssl sha1)"

# Prepare Phase 2
snarkjs powersoftau prepare phase2 zk/ptau/pot15_0001.ptau zk/ptau/pot15_final.ptau -v

# Verify the final ptau file.
snarkjs powersoftau verify zk/ptau/pot15_final.ptau

# TODO check if powersoftau beacon is needed. source: https://github.com/jp4g/BattleZips/blob/master/scripts/ptau.sh
