const { expect } = require("chai");
const { ethers } = require("hardhat");
const snarkjs = require("snarkjs");
const path = require("path");

describe("PrivateVotingFinal", function () {
  let verifier, voting, owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy the Groth16Verifier
    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();
    await verifier.waitForDeployment();

    // Deploy the PrivateVoting contract
    const Voting = await ethers.getContractFactory("PrivateVoting");
    const verifierAddress = await verifier.getAddress();
    voting = await Voting.deploy(verifierAddress);
    await voting.waitForDeployment();
  });

  it("should allow a registered user to cast a valid vote", async function () {
    // 1. Add a candidate
    await voting.addCandidate("Candidate 1", "Description 1");

    // 2. Set voting period
    const now = Math.floor(Date.now() / 1000);
    const registrationStart = now - 60;
    const registrationEnd = now + 300;
    const votingStart = registrationEnd + 1;
    const votingEnd = votingStart + 600;
    await voting.setVotingPeriod(registrationStart, registrationEnd, votingStart, votingEnd);

    // 3. Register a voter
    const secret = "12345";
    const commitment = BigInt(secret) * BigInt(secret);
    await voting.connect(addr1).registerVoter(commitment);

    // 4. Increase time to voting period
    await ethers.provider.send("evm_increaseTime", [301]);
    await ethers.provider.send("evm_mine");


    // 5. Generate a valid proof
    const wasmPath = path.join(__dirname, "../../circuits/vote.wasm");
    const zkeyPath = path.join(__dirname, "../../circuits/vote_0001.zkey");

    const nullifier = BigInt('0x' + ethers.keccak256(new TextEncoder().encode(secret)).slice(2));

    const input = {
        secret: BigInt(secret),
        nullifier: nullifier,
        vote: 0, // voting for candidate 0
        commitment: commitment,
        nullifierHash: nullifier * nullifier
    };

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    const argv = JSON.parse("[" + calldata + "]");
    const [a, b, c, pubSignals_] = argv;

    // 6. Cast the vote
    await expect(voting.connect(addr1).castVote(a, b, c, pubSignals_)).to.not.be.reverted;
  });

  it("should reject a double vote", async function () {
    // 1. Add a candidate
    await voting.addCandidate("Candidate 1", "Description 1");

    // 2. Set voting period
    const now = Math.floor(Date.now() / 1000);
    const registrationStart = now - 60;
    const registrationEnd = now + 300;
    const votingStart = registrationEnd + 1;
    const votingEnd = votingStart + 600;
    await voting.setVotingPeriod(registrationStart, registrationEnd, votingStart, votingEnd);

    // 3. Register a voter
    const secret = "12345";
    const commitment = BigInt(secret) * BigInt(secret);
    await voting.connect(addr1).registerVoter(commitment);

    // 4. Increase time to voting period
    await ethers.provider.send("evm_increaseTime", [301]);
    await ethers.provider.send("evm_mine");

    // 5. Generate a valid proof
    const wasmPath = path.join(__dirname, "../../circuits/vote.wasm");
    const zkeyPath = path.join(__dirname, "../../circuits/vote_0001.zkey");
    const nullifier = BigInt('0x' + ethers.keccak256(new TextEncoder().encode(secret)).slice(2));
    const input = { secret: BigInt(secret), nullifier: nullifier, vote: 0, commitment: commitment, nullifierHash: nullifier * nullifier };
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    const argv = JSON.parse("[" + calldata + "]");
    const [a, b, c, pubSignals_] = argv;

    // Cast the first vote
    await voting.connect(addr1).castVote(a, b, c, pubSignals_);

    // Attempt to cast the second vote
    await expect(voting.connect(addr1).castVote(a, b, c, pubSignals_)).to.be.revertedWith("Vote already cast");
  });

  it("should reject an invalid proof", async function () {
    // 1. Add a candidate
    await voting.addCandidate("Candidate 1", "Description 1");

    // 2. Set voting period
    const now = Math.floor(Date.now() / 1000);
    const registrationStart = now - 60;
    const registrationEnd = now + 300;
    const votingStart = registrationEnd + 1;
    const votingEnd = votingStart + 600;
    await voting.setVotingPeriod(registrationStart, registrationEnd, votingStart, votingEnd);

    // 3. Register a voter
    const secret = "12345";
    const commitment = BigInt(secret) * BigInt(secret);
    await voting.connect(addr1).registerVoter(commitment);

    // 4. Increase time to voting period
    await ethers.provider.send("evm_increaseTime", [301]);
    await ethers.provider.send("evm_mine");

    // 5. Generate a valid proof
    const wasmPath = path.join(__dirname, "../../circuits/vote.wasm");
    const zkeyPath = path.join(__dirname, "../../circuits/vote_0001.zkey");

    const nullifier = BigInt('0x' + ethers.keccak256(new TextEncoder().encode(secret)).slice(2));

    const input = {
        secret: BigInt(secret),
        nullifier: nullifier,
        vote: 0, // voting for candidate 0
        commitment: commitment,
        nullifierHash: nullifier * nullifier
    };

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    const argv = JSON.parse("[" + calldata + "]");
    const [a, b, c, pubSignals_] = argv;

    // Tamper with the proof
    const tamperedA = [...a];
    tamperedA[0] = (BigInt(tamperedA[0]) + 1n).toString();

    // Attempt to cast the vote with the tampered proof
    await expect(voting.connect(addr1).castVote(tamperedA, b, c, pubSignals_)).to.be.revertedWith("Invalid proof");
  });
});