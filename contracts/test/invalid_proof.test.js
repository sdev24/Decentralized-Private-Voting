const { expect } = require("chai");
const { ethers } = require("hardhat");
const snarkjs = require("snarkjs");
const path = require("path");

describe("PrivateVoting - Invalid Proof", function () {
  let verifier, voting, owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();
    await verifier.waitForDeployment();

    const Voting = await ethers.getContractFactory("PrivateVoting");
    const verifierAddress = await verifier.getAddress();
    voting = await Voting.deploy(verifierAddress);
    await voting.waitForDeployment();
  });

  it("should reject an invalid proof", async function () {
    await voting.addCandidate("Candidate 1", "Description 1");

    const latestBlock = await ethers.provider.getBlock("latest");
    const now = latestBlock.timestamp;
    const registrationStart = now + 1;
    const registrationEnd = registrationStart + 300;
    const votingStart = registrationEnd + 1;
    const votingEnd = votingStart + 600;
    await voting.setVotingPeriod(registrationStart, registrationEnd, votingStart, votingEnd);

    const secret = "12345";
    const commitment = BigInt(secret) * BigInt(secret);
    await voting.connect(addr1).registerVoter(commitment);

    await ethers.provider.send("evm_increaseTime", [301]);
    await ethers.provider.send("evm_mine");

    const wasmPath = path.join(__dirname, "../../circuits/vote.wasm");
    const zkeyPath = path.join(__dirname, "../../circuits/vote_0001.zkey");

    const nullifier = BigInt('0x' + ethers.keccak256(new TextEncoder().encode(secret)).slice(2));

    const input = {
        secret: BigInt(secret),
        nullifier: nullifier,
        vote: 0,
        commitment: commitment,
        nullifierHash: nullifier * nullifier
    };

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    const argv = JSON.parse("[" + calldata + "]");
    const [a, b, c, pubSignals_] = argv;

    const tamperedA = [...a];
    tamperedA[0] = (BigInt(tamperedA[0]) + 1n).toString();

    await expect(voting.connect(addr1).castVote(tamperedA, b, c, pubSignals_)).to.be.revertedWith("Invalid proof");
  });
});
