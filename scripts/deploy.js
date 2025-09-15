const hre = require("hardhat");
  
async function main() {
  const ProofOfCarbon = await hre.ethers.getContractFactory("ProofOfCarbon");
  const proofOfCarbon = await ProofOfCarbon.deploy();

  
  await proofOfCarbon.deployed();

  
  console.log(
    `ProofOfCarbon deployed to Core Blockchain at address: ${proofOfCarbon.address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
