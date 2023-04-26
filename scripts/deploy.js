const { Framework } = require("@superfluid-finance/sdk-core");
// const { ethers } = require("hardhat");
const { ethers } = require("ethers");
const { network } = require("hardhat");
const {
  deployTestFramework,
} = require("@superfluid-finance/ethereum-contracts/dev-scripts/deploy-test-framework");
const TestToken = require("@superfluid-finance/ethereum-contracts/build/contracts/TestToken.json");

async function deploy() {
  let sfDeployer;
  let contractsFramework;
  let sf;
  let dai;
  let daix;
  let accounts;

  const provider = new ethers.providers.Web3Provider(network.provider);
  provider._networkPromise = Promise.resolve({
    chainId: network.chainId,
    name: "unknown",
  });

  console.log(
    "--------------------------------Provider--------------------------"
  );
  console.log(provider);

  const accountOne = await provider.getSigner(1);
  const accountTwo = await provider.getSigner(2);

  // const privateKey =
  //   "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  // const wallet = new ethers.Wallet(privateKey);
  // const owner = wallet.connect(provider);
  // const signerAddress = wallet.address;

  const owner = await provider.getSigner(0);

  // Get the third account from Hardhat's accounts array

  // Print the addresses of the second and third accounts
  console.log("Second account address:", await owner.getAddress());

  console.log("---------------------Owner-------------------");
  console.log(owner);

  console.log("-------------------------all accounts-------------------------");
  accounts = await provider.listAccounts();
  console.log(accounts);

  // --------------------------------------------------------------------------framework deployment
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
      // console.log(sf);
      console.log("-------------------all addresses---------------------");
      // console.log("Config:", sf.contracts);
      console.log(sf.settings.config);
      console.log(sf.settings.config.hostAddress);
    }
    // console.log(sf);
  } catch (err) {
    console.log(err);
  }

  //-----------------------------------------------------------------------------token deployment
  try {
    // Deploy DAI and DAI wrapper super token
    const tokenDeployment = await sfDeployer.deployWrapperSuperToken(
      "Fake DAI Token",
      "fDAI",
      18,
      ethers.utils.parseEther("100000000").toString()
    );
    daix = await sf.loadSuperToken("fDAIx");
    dai = new ethers.Contract(
      daix.underlyingToken.address,
      TestToken.abi,
      owner
    );

    console.log("fdaix address:" + daix.underlyingToken.address);

    const thousandEther = ethers.utils.parseEther("10000");

    const mint = await dai
      .connect(accountOne)
      .mint(accountOne.getAddress(), thousandEther);

    await dai
      .connect(accountOne)
      .approve(daix.address, ethers.constants.MaxInt256);

    const account1Upgrade = daix.upgrade({ amount: thousandEther });
    await account1Upgrade.exec(accountOne);

    if (mint) {
      console.log(await accountOne.getAddress());
      const daiBal = await daix.balanceOf({
        account: await accountOne.getAddress(),
        providerOrSigner: accountOne,
      });
      console.log("daix bal for acct 1: ", daiBal);
    }

    // const createFlowOperation = daix.createFlow({
    //   receiver: await accountTwo.getAddress(),
    //   flowRate: "100000000",
    // });

    const createFlowOperation = daix.createFlow({
      sender: await accountOne.getAddress(),
      receiver: await accountTwo.getAddress(),
      flowRate: "100000000",
      // userData?: string
    });
    console.log("instance");
    console.log("Creating your stream...");

    const result = await createFlowOperation.exec(accountOne);
    console.log(result);

    await result.wait();

    console.log("stream started");

    const appFlowRate = await daix.getNetFlow({
      account: await accountTwo.getAddress(),
      providerOrSigner: accountOne,
    });
    console.log("flowRate:" + appFlowRate);

    const appFinalBalance = await daix.balanceOf({
      account: await accountOne.getAddress(),
      providerOrSigner: accountOne,
    });
    console.log("Account 2 balance:" + appFinalBalance);
  } catch (err) {
    console.log(err);
  }

  // ______________________________________________________________________________________________ start stream
}

deploy();
