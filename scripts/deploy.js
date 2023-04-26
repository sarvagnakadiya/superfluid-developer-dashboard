const { Framework } = require("@superfluid-finance/sdk-core");
// const { ethers } = require("hardhat");
const { ethers } = require("ethers");
const { network } = require("hardhat");
const {
  deployTestFramework,
} = require("@superfluid-finance/ethereum-contracts/dev-scripts/deploy-test-framework");
const TestToken = require("@superfluid-finance/ethereum-contracts/build/contracts/TestToken.json");

async function deploy() {
  // let provider;
  // let owner;
  let sfDeployer;
  let contractsFramework;
  let sf;
  let dai;
  let daix;

  // Get provider and owner account
  // [owner] = await ethers.getSigners(); //1
  // provider = owner.provider;

  // console.log(
  //   "-------------------------------Provider-------------------------------""
  // );
  // console.log(provider);

  //------------------------------------------------------------------------------------------------------------------
  // const privateKey =
  //   "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  // const provider = new ethers.providers.JsonRpcProvider(
  //   "http://127.0.0.1:8545/",
  //   {
  //     chainId: 31337, // Rinkeby's chain ID is 4
  //     name: "local",
  //   }
  // );

  // console.log(
  //   "-------------------------------Provider-------------------------------"
  // );
  // console.log(provider);

  // const wallet = new ethers.Wallet(privateKey);
  // const signerAddress = wallet.address;
  // const owner = wallet.connect(provider);

  // owner = {
  //   signer: signer,
  //   address: signerAddress,
  // };

  // console.log(
  //   "-----------------------------------Owner address----------------------"
  // );
  // console.log("Owner address: ", owner.address);
  // console.log(owner);

  const provider = new ethers.providers.Web3Provider(network.provider);
  provider._networkPromise = Promise.resolve({
    chainId: network.chainId,
    name: "unknown",
  });

  console.log(
    "--------------------------------Provider--------------------------"
  );
  console.log(provider);

  const privateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  const wallet = new ethers.Wallet(privateKey);
  const signerAddress = wallet.address;
  const owner = wallet.connect(provider);

  console.log("---------------------Owner-------------------");
  console.log(owner);

  // const accounts = await provider.listAccounts();
  // console.log(accounts);

  try {
    // Deploy test framework
    sfDeployer = await deployTestFramework();

    // Deploy Superfluid framework
    contractsFramework = await sfDeployer.getFramework();
    sf = await Framework.create({
      chainId: 31337, // Hardhat's local chainId
      provider: provider,
      resolverAddress: contractsFramework.resolver,
      protocolReleaseVersion: "test",
    });

    console.log(
      "-----------------------------------SF Instance----------------------"
    );
    if (sf) {
      console.log("successful");
    }
    // console.log(sf);
  } catch (err) {
    console.log(err);
  }

  // Deploy DAI and DAI wrapper super token
  const tokenDeployment = await sfDeployer.deployWrapperSuperToken(
    "Fake DAI Token",
    "fDAI",
    18,
    ethers.utils.parseEther("100000000").toString()
  );
  daix = await sf.loadSuperToken("fDAIx");
  dai = new ethers.Contract(daix.underlyingToken.address, TestToken.abi, owner);

  console.log(
    "-----------------------------------SF Instance----------------------"
  );
  if (sf) {
    console.log("successful");
  }
  // console.log(sf);
  console.log("-----------------------------------DAI----------------------");

  console.log(dai);
  console.log("dai token address");
  console.log(daix.underlyingToken.address);
}

deploy();
