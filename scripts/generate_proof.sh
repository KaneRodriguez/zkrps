cd zk/makeChoice_js
node generate_witness.js makeChoice.wasm ../input.json witness.wtns 
snarkjs groth16 prove ../zkey/makeChoice_final.zkey witness.wtns proof.json public.json
snarkjs groth16 verify ../zkey/choice_verification_key.json public.json proof.json
cat public.json