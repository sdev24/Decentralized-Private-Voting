const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Deploying to Arbitrum...");
  console.log("Network:", hre.network.name);
  
  // Check if private key is loaded
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not found in environment variables");
  }
  
  // Get the deployer account
  const signers = await hre.ethers.getSigners();
  console.log("Available signers:", signers.length);
  
  if (signers.length === 0) {
    throw new Error("No signers available. Check your private key configuration.");
  }
  
  const deployer = signers[0];
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  // Deploy the verifier contract first
  // const VoteVerifier = await hre.ethers.getContractFactory("Groth16Verifier");
  // const verifier = await VoteVerifier.connect(deployer).deploy();
  // await verifier.waitForDeployment();
  
  // console.log("VoteVerifier deployed to:", await verifier.getAddress());
  const verifierAddress = "0xF023d64237264949251a12041C39f682AFC21f1a";
  
  // Deploy the main voting contract
  const PrivateVoting = await hre.ethers.getContractFactory("PrivateVoting");
  const voting = await PrivateVoting.connect(deployer).deploy(verifierAddress);
  await voting.waitForDeployment();
  
  console.log("PrivateVoting deployed to:", await voting.getAddress());
  
  // Load candidates from config and add them
  const candidatesConfig = JSON.parse(fs.readFileSync("../config/candidates.json", "utf8"));
  
  for (const candidate of candidatesConfig.candidates) {
    const tx = await voting.addCandidate(candidate.name, candidate.description);
    await tx.wait();
    console.log(`Added candidate: ${candidate.name}`);
  }
  
  // Set voting periods
  const periods = candidatesConfig.votingPeriods;
  const registrationStart = Math.floor(new Date(periods.registrationStart).getTime() / 1000);
  const registrationEnd = Math.floor(new Date(periods.registrationEnd).getTime() / 1000);
  const votingStart = Math.floor(new Date(periods.votingStart).getTime() / 1000);
  const votingEnd = Math.floor(new Date(periods.votingEnd).getTime() / 1000);
  
  console.log("Setting voting periods...");
  console.log(`Registration: ${periods.registrationStart} to ${periods.registrationEnd}`);
  console.log(`Voting: ${periods.votingStart} to ${periods.votingEnd}`);
  
  const periodTx = await voting.setVotingPeriod(
    registrationStart,
    registrationEnd,
    votingStart,
    votingEnd
  );
  await periodTx.wait();
  console.log("Voting periods set successfully");
  
  // Save deployment addresses
  const deployment = {
    verifier: verifierAddress,
    voting: await voting.getAddress(),
    network: hre.network.name,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync("deployment.json", JSON.stringify(deployment, null, 2));
  console.log("Deployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });