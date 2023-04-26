const { Framework } = require("@superfluid-finance/sdk-core");
// const { ethers } = require("hardhat");
const { ethers } = require("ethers");
const { network } = require("hardhat");
const {
  deployTestFramework,
} = require("@superfluid-finance/ethereum-contracts/dev-scripts/deploy-test-framework");
const TestToken = require("@superfluid-finance/ethereum-contracts/build/contracts/TestToken.json");

const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function deploy() {
  let sfDeployer;
  let contractsFramework;
  let sf;
  let dai;
  let daix;
  let accounts;
  let superSigner;

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

  console.log("owner account address:", await owner.getAddress());

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

      superSigner = sf.createSigner({
        signer: owner,
        provider: provider,
      });
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
      ethers.utils.parseEther("10000000000000000000000000").toString()
    );
    daix = await sf.loadSuperToken("fDAIx");
    dai = new ethers.Contract(
      daix.underlyingToken.address,
      TestToken.abi,
      owner
    );

    console.log("fdaix address:" + daix.underlyingToken.address);

    const thousandEther = "10000000000000000000000000";

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

    console.log("before starting the stream balance:" + getAppFinalBalance());
    console.log("Creating your stream...");
    let createFlowOperation = daix.createFlow({
      sender: await accountOne.getAddress(),
      receiver: await accountTwo.getAddress(),
      flowRate: "100000000000000000000", //10000000000000000000000
      // userData?: string
    });

    const result = await createFlowOperation.exec(accountOne);
    console.log(result);

    const receipt = await result.wait();

    if (receipt) {
      console.log("stream started!");
    }

    const appFlowRate = await daix.getNetFlow({
      account: await accountTwo.getAddress(),
      providerOrSigner: superSigner,
    });
    console.log("flowRate:" + appFlowRate);

    const appFlowRateOwner = await daix.getNetFlow({
      account: await accountOne.getAddress(),
      providerOrSigner: superSigner,
    });
    console.log("flowRateOwner:" + appFlowRateOwner);

    let res = await daix.getFlow({
      sender: await accountOne.getAddress(),
      receiver: await accountTwo.getAddress(),
      providerOrSigner: accountOne,
    });

    console.log("getFlow:" + res);

    const daixBalance = await daix.balanceOf({
      account: await accountTwo.getAddress(),
      providerOrSigner: accountTwo,
    });
    console.log("receiver" + daixBalance);

    const daixBalanceOwner = await daix.balanceOf({
      account: await accountOne.getAddress(),
      providerOrSigner: accountOne,
    });
    console.log("owner balance " + daixBalanceOwner);

    console.log("Waiting");
    // Wait for 5 seconds using Promise and async/await
    await new Promise((resolve) => setTimeout(resolve, 60000));

    let flowOp = daix.deleteFlow({
      sender: await accountOne.getAddress(),
      receiver: await accountTwo.getAddress(),
      // userData?: string
    });

    const resultDelete = await flowOp.exec(accountOne);
    console.log(resultDelete);

    const receiptDelete = await result.wait();

    if (receiptDelete) {
      console.log("stream started!");
    }

    const appFinalBalanceAgain = await daix.balanceOf({
      account: await accountTwo.getAddress(),
      providerOrSigner: accountTwo,
    });
    const appFinalBalanceAgainOwner = await daix.balanceOf({
      account: await accountOne.getAddress(),
      providerOrSigner: accountOne,
    });
    console.log("Account 2 balance (after 5 seconds):" + appFinalBalanceAgain);
    console.log(
      "Account 2 balance (after 5 seconds):" + appFinalBalanceAgainOwner
    );
    console.log("hello");
  } catch (err) {
    console.log(err);
  }

  async function getAppFinalBalance() {
    try {
      const appFinalBalance = await daix.balanceOf({
        account: await accountTwo.getAddress(),
        providerOrSigner: superSigner,
      });
      console.log("Account 2 balance:" + appFinalBalance);
      return appFinalBalance;
    } catch (err) {
      console.log(err);
    }
  }

  function askUserForInput() {
    return new Promise((resolve) => {
      const recursiveQuestion = () => {
        rl.question(
          "Enter any character to get appFinalBalance, or enter 'x' to exit: ",
          (answer) => {
            if (answer === "x") {
              console.log("Exiting...");
              return resolve(answer);
            } else {
              console.log("Getting appFinalBalance...");
              getAppFinalBalance();
              recursiveQuestion();
            }
          }
        );
      };
      recursiveQuestion();
    });
  }

  async function handleUserInput() {
    let userInput;
    do {
      userInput = await askUserForInput();
      if (userInput === "x") {
        await getAppFinalBalance();
      }
    } while (userInput !== "x");
    rl.close();
  }
  // handleUserInput();

  // ______________________________________________________________________________________________ start stream
}

deploy();
