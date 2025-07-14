const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PrivateVoting", function () {
  let verifier, voting, owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy the Groth16Verifier
    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();
    console.log('Verifier address:', verifier.address);
    // await verifier.deployed();

    // Deploy the PrivateVoting contract
    const Voting = await ethers.getContractFactory("PrivateVoting");
    voting = await Voting.deploy(verifier.address);
    // await voting.deployed();
  });

  it("should deploy the contracts", async function () {
    expect(verifier.address).to.properAddress;
    expect(voting.address).to.properAddress;
  });

  // Additional tests for registration, voting, and zk proof verification will go here
}); 