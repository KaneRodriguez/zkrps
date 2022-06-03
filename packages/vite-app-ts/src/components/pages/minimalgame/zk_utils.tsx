import * as snarkjs from 'snarkjs'

/**
 * Build contract call args
 * @dev 'massage' circom's proof args into format parsable by solidity
 * @notice further mutation of pi_b occurs @ in our smart contract 
 *         calldata as subgraphs cannot handle nested arrays
 * 
 * @param {Object} proof - the proof generated from circom circuit
 * @returns - array of uint256 representing proof parsable in solidity
 */
export function buildProofArgs(proof: any): any {
    return [
        proof.pi_a.slice(0, 2), // pi_a
        // genZKSnarkProof reverses values in the inner arrays of pi_b
        proof.pi_b[0].slice(0).reverse(),
        proof.pi_b[1].slice(0).reverse(),
        proof.pi_c.slice(0, 2), // pi_c
    ]
}

export async function buildChoice(choice: Number, salt: string) {
    let input = {
        choice: choice,
        salt: salt
    }
    // compute witness and run through groth16 circuit for proof / signals
    let { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        './makeChoice.wasm',
        './makeChoice_final.zkey'
    )

    const proofArgs = buildProofArgs(proof)

    // TODO add in error handling for not passing local proof verification
    let choiceVerificationKey: any;

    // Fetch Function   
    await fetch("./choice_verification_key.json").then(
        function (res) {
            choiceVerificationKey = res.json()
        }).catch(
            function (err) {
                console.log(err, ' error')
            }
        )

    // verify proof locally
    let validProof = await snarkjs.groth16.verify(
        await choiceVerificationKey,
        publicSignals,
        proof
    )

    if (validProof == false) {
        console.warn("Proof invalid!", choice, salt)
    }

    return { proofArgs, publicSignals };
}

export function generateSalt(): string {
    let array = new Uint32Array(8);
    const randomBytes = window.crypto.getRandomValues(array);

    // convert byte array to hexademical representation
    let hex: any = [];

    randomBytes.forEach(function (i: any) {
        var h = i.toString(16);
        if (h.length % 2) { h = '0' + h; }
        hex.push(h);
    });

    const result = BigInt('0x' + hex.join(''));
    return result.toString();
}
