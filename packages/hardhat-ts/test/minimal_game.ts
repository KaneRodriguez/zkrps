import { ethers, network } from 'hardhat';
import { expect } from 'chai';
const snarkjs = require('snarkjs')
const { mimcSpongecontract, buildMimcSponge } = require("circomlibjs")
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

/**
 * Build contract call args
 * @dev 'massage' circom's proof args into format parsable by solidity
 * @notice further mutation of pi_b occurs @ in our smart contract 
 *         calldata as subgraphs cannot handle nested arrays
 * 
 * @param {Object} proof - the proof generated from circom circuit
 * @returns - array of uint256 representing proof parsable in solidity
 */
function buildProofArgs(proof: any): any {
    return [
        proof.pi_a.slice(0, 2), // pi_a
        // genZKSnarkProof reverses values in the inner arrays of pi_b
        proof.pi_b[0].slice(0).reverse(),
        proof.pi_b[1].slice(0).reverse(),
        proof.pi_c.slice(0, 2), // pi_c
    ]
}

async function buildChoice(choice: Number, salt: string) {
    let input = {
        choice: choice,
        salt: salt
    }
    // TODO look into snarkjs generatecall

    // compute witness and run through groth16 circuit for proof / signals
    let { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        path.join(__dirname, '../../../zk/makeChoice_js', 'makeChoice.wasm'),
        path.join(__dirname, '../../../zk/zkey', 'makeChoice_final.zkey')
    )

    const proofArgs = buildProofArgs(proof)


    const choiceVerificationKey = require(
        path.join(__dirname, '../../../zk/zkey', 'choice_verification_key.json')
    )

    // verify proof locally
    let validProof = await snarkjs.groth16.verify(
        choiceVerificationKey,
        publicSignals,
        proof
    )

    if (validProof == false) {
        console.warn("Proof invalid!", choice, salt)
    }

    return { proofArgs, publicSignals };
}


describe("MinimalGame", function () {
    it("should TODO", async function () {


        const contract = {
            contractName: 'Hasher',
            abi: mimcSpongecontract.abi,
            bytecode: mimcSpongecontract.createCode('mimcsponge', 220),
        }

        const outputPath = path.join(__dirname, '../generated/artifacts', 'Hasher.json')
        fs.writeFileSync(outputPath, JSON.stringify(contract))

        const ChoiceVerifier = await ethers.getContractFactory("ChoiceVerifier");
        const choiceVerifier = await ChoiceVerifier.deploy();

        const Hasher = await ethers.getContractFactory("Hasher");
        const hasher = await Hasher.deploy();

        const MinimalGame = await ethers.getContractFactory("MinimalGame");
        const minimalGame = await MinimalGame.deploy(choiceVerifier["address"], hasher["address"]);

        // adapted from https://stackoverflow.com/a/63163746
        function getSalt(saltLengthBytes: number): string {
            const randomBytes = crypto.randomBytes(saltLengthBytes);

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
        // test that salt generation works
        expect(BigInt(getSalt(32)).toString(2).length).to.be.greaterThanOrEqual(250); // verifies that we created a >250 bit number

        // set players
        const signers = await ethers.getSigners()
        let operator = signers[0];
        let alice = signers[1];
        let aliceChoice = 0;
        let aliceSalt = getSalt(32);

        let bob = signers[2];
        let bobChoice = 1;
        let bobSalt = getSalt(32);

        let charlie = signers[3];
        let charlieChoice = 2;
        let charlieSalt = getSalt(32);

        let delta = signers[4];
        let deltaChoice = 1;
        let deltaSalt = getSalt(32);

        let echo = signers[5];
        let echoChoice = 0;
        let echoSalt = getSalt(32);

        let foxtrot = signers[6];
        let foxtrotChoice = 2;
        let foxtrotSalt = getSalt(32);

        // alice chooses rock
        let zkChoice = await buildChoice(aliceChoice, aliceSalt);
        let tx = await (await minimalGame.connect(alice).joinGame(
            ...zkChoice['proofArgs'],
            zkChoice['publicSignals']
        )).wait()

        // bob chooses paper
        zkChoice = await buildChoice(bobChoice, bobSalt);
        tx = await (await minimalGame.connect(bob).joinGame(
            ...zkChoice['proofArgs'],
            zkChoice['publicSignals']
        )).wait()

        // charlie chooses scissors
        zkChoice = await buildChoice(charlieChoice, charlieSalt);
        tx = await (await minimalGame.connect(charlie).joinGame(
            ...zkChoice['proofArgs'],
            zkChoice['publicSignals']
        )).wait()

        // delta chooses paper
        zkChoice = await buildChoice(deltaChoice, deltaSalt);
        tx = await (await minimalGame.connect(delta).joinGame(
            ...zkChoice['proofArgs'],
            zkChoice['publicSignals']
        )).wait()

        // echo chooses rock
        zkChoice = await buildChoice(echoChoice, echoSalt);
        tx = await (await minimalGame.connect(echo).joinGame(
            ...zkChoice['proofArgs'],
            zkChoice['publicSignals']
        )).wait()

        // foxtrot chooses scissors
        zkChoice = await buildChoice(foxtrotChoice, foxtrotSalt);
        tx = await (await minimalGame.connect(foxtrot).joinGame(
            ...zkChoice['proofArgs'],
            zkChoice['publicSignals']
        )).wait()

        let gameId = await minimalGame.connect(alice).getGameId();
        expect(Number(gameId)).to.equal(1);
        gameId = await minimalGame.connect(bob).getGameId();
        expect(Number(gameId)).to.equal(1);
        gameId = await minimalGame.connect(charlie).getGameId();
        expect(Number(gameId)).to.equal(2);
        gameId = await minimalGame.connect(delta).getGameId();
        expect(Number(gameId)).to.equal(2);
        gameId = await minimalGame.connect(echo).getGameId();
        expect(Number(gameId)).to.equal(3);
        gameId = await minimalGame.connect(foxtrot).getGameId();
        expect(Number(gameId)).to.equal(3);

        // bob beats alice
        await (await minimalGame.connect(alice).revealChoice(aliceChoice, aliceSalt)).wait();
        await (await minimalGame.connect(bob).revealChoice(bobChoice, bobSalt)).wait();

        let game1Winner = await minimalGame.getGameWinner(1);
        expect(game1Winner).to.equal(bob.address);

        // charlie beats delta
        await (await minimalGame.connect(charlie).revealChoice(charlieChoice, charlieSalt)).wait();
        await (await minimalGame.connect(delta).revealChoice(deltaChoice, deltaSalt)).wait();

        let game2Winner = await minimalGame.getGameWinner(2);
        expect(game2Winner).to.equal(charlie.address);

        // foxtrot is still playing
        await (await minimalGame.connect(echo).revealChoice(echoChoice, echoSalt)).wait();

        let game3Winner = await minimalGame.getGameWinner(3);
        expect(game3Winner).to.equal("0x0000000000000000000000000000000000000000");

        // have foxtrot try to lie about choice
        let didCheat = false;
        try {
            await (await minimalGame.connect(foxtrot).revealChoice(1, foxtrotSalt)).wait();
        } catch {
            didCheat = true;
        }
        expect(didCheat).to.equal(true);

        // have foxtrot try to lie about salt
        didCheat = false;
        try {
            await (await minimalGame.connect(foxtrot).revealChoice(foxtrotChoice, foxtrotSalt.slice(0, foxtrotSalt.length - 3) + "123")).wait();
        } catch {
            didCheat = true;
        }
        expect(didCheat).to.equal(true);

        await (await minimalGame.connect(foxtrot).revealChoice(foxtrotChoice, foxtrotSalt)).wait();

        // echo should beat foxtrot
        game3Winner = await minimalGame.getGameWinner(3);
        expect(game3Winner).to.equal(echo.address);

        // foxtrot should not be able to try revealing again after game has already been won
        let rejectedReveal = false;
        try {
            await (await minimalGame.connect(foxtrot).revealChoice(foxtrotChoice, foxtrotSalt)).wait();
        } catch (e) {
            rejectedReveal = true;
        }
        expect(rejectedReveal).to.equal(true);

        // alice and echo should be able to rejoin another game
        zkChoice = await buildChoice(aliceChoice, aliceSalt);
        tx = await (await minimalGame.connect(alice).joinGame(
            ...zkChoice['proofArgs'],
            zkChoice['publicSignals']
        )).wait()

        zkChoice = await buildChoice(echoChoice, echoSalt);
        tx = await (await minimalGame.connect(echo).joinGame(
            ...zkChoice['proofArgs'],
            zkChoice['publicSignals']
        )).wait()

        gameId = await minimalGame.connect(alice).getGameId();
        expect(Number(gameId)).to.equal(4);
        gameId = await minimalGame.connect(echo).getGameId();
        expect(Number(gameId)).to.equal(4);

        // alice can't end game until a timeout has been reached
        let triedEnding = false;
        try {
            await (await minimalGame.connect(alice).endGame()).wait();
        } catch {
            triedEnding = true;
        };
        expect(triedEnding).to.equal(true);

        // do something with the blockchain so the timestamp advances (simulate half a day)
        await network.provider.send("evm_increaseTime", [86400 / 2])

        // let it fail again
        triedEnding = false;
        try {
            await (await minimalGame.connect(alice).endGame()).wait();
        } catch {
            triedEnding = true;
        };
        expect(triedEnding).to.equal(true);

        // advance the other half day
        await network.provider.send("evm_increaseTime", [86400 / 2])

        // now alice can end the game
        await (await minimalGame.connect(alice).endGame()).wait();

        // alice and echo left game since alice ended it
        gameId = await minimalGame.connect(alice).getGameId();
        expect(Number(gameId)).to.equal(0);

        gameId = await minimalGame.connect(echo).getGameId();
        expect(Number(gameId)).to.equal(0);

        // ensure alice can get into a game again
        zkChoice = await buildChoice(aliceChoice, aliceSalt);
        tx = await (await minimalGame.connect(alice).joinGame(
            ...zkChoice['proofArgs'],
            zkChoice['publicSignals']
        )).wait()
        gameId = await minimalGame.connect(alice).getGameId();
        expect(Number(gameId)).to.equal(5);

        // ensure alice gets rejected
        let isRejected = false;
        try {
            tx = await (await minimalGame.connect(alice).joinGame(
                ...zkChoice['proofArgs'],
                zkChoice['publicSignals']
            )).wait()
        } catch {
            isRejected = true;
        }
        expect(isRejected).to.equal(true);

        // alice can't end a game that someone else hasn't joined
        await network.provider.send("evm_increaseTime", [86400 + 1])

        // let it fail again
        triedEnding = false;
        try {
            await (await minimalGame.connect(alice).endGame()).wait();
        } catch {
            triedEnding = true;
        };
        expect(triedEnding).to.equal(true);

        let dev_address = "0xc5f13621A1F8a4DEdD8a219F7745401963Ab14ee";

        // test for behavior when there is a tie between alice and bob
        zkChoice = await buildChoice(aliceChoice, aliceSalt);
        tx = await (await minimalGame.connect(bob).joinGame(
            ...zkChoice['proofArgs'],
            zkChoice['publicSignals']
        )).wait()

        // verify same game
        gameId = await minimalGame.connect(alice).getGameId();
        expect(Number(gameId)).to.equal(5);
        gameId = await minimalGame.connect(bob).getGameId();
        expect(Number(gameId)).to.equal(5);

        await (await minimalGame.connect(alice).revealChoice(aliceChoice, aliceSalt)).wait();
        await (await minimalGame.connect(bob).revealChoice(aliceChoice, aliceSalt)).wait();

        let game5Winner = await minimalGame.getGameWinner(5);
        expect(game5Winner).to.equal(dev_address);
        console.log(game5Winner)
    });
});
