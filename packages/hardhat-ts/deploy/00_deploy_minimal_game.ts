import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const { mimcSpongecontract } = require("circomlibjs")
const fs = require('fs')
const path = require('path')

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { getNamedAccounts, deployments } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const contract = {
    contractName: 'Hasher',
    abi: mimcSpongecontract.abi,
    bytecode: mimcSpongecontract.createCode('mimcsponge', 220),
  }

  const outputPath = path.join(__dirname, '../generated/artifacts', 'Hasher.json')
  fs.writeFileSync(outputPath, JSON.stringify(contract))

  const Hasher = await deployments.getArtifact("Hasher");

  const hasher = await deploy('Hasher', {
    from: deployer,
    contract: {
      abi: Hasher.abi,
      bytecode: Hasher.bytecode,
    },
    log: true
  })

  const choiceVerifier = await deploy('ChoiceVerifier', {
    from: deployer,
    log: true,
  })

  await deploy('MinimalGame', {
    from: deployer,
    log: true,
    args: [choiceVerifier["address"], hasher["address"]]
  });

};
export default func;
func.tags = ['MinimalGame'];
