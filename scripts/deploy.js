const inquirer = require("inquirer");
const { Framework } = require("@superfluid-finance/sdk-core");
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
  const options = [
    { name: "Start Stream", value: "start" },
    { name: "Update stream", value: "update" },
    { name: "Delete stream", value: "delete" },
    { name: "getFlow", value: "viewflow" },
    { name: "getNetFlow", value: "viewnet" },
    { name: "getAccountFlowInfo", value: "viewaccountflow" },
    { name: "check DAIx balance", value: "balanceof" },
    { name: "Exit console", value: "exit" },
  ];
  /* const accountOptions = [
    { name: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 - 1", value: "0" },
    { name: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8 - 2", value: "1" },
    { name: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC - 3", value: "2" },
    { name: "0x90F79bf6EB2c4f870365E785982E1f101E93b906 - 4", value: "3" },
    { name: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 - 5", value: "4" },
    { name: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc - 6", value: "5" },
    { name: "0x976EA74026E726554dB657fA54763abd0C3a0aa9 - 7", value: "6" },
    { name: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955 - 8", value: "7" },
    { name: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f - 9", value: "8" },
    { name: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720 - 10", value: "9" },
    { name: "0xBcd4042DE499D14e55001CcbB24a551F3b954096 - 11", value: "10" },
    { name: "0x71bE63f3384f5fb98995898A86B02Fb2426c5788 - 12", value: "11" },
    { name: "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a - 13", value: "12" },
    { name: "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec - 14", value: "13" },
    { name: "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097 - 15", value: "14" },
    { name: "0xcd3B766CCDd6AE721141F452C550Ca635964ce71 - 16", value: "15" },
    { name: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30 - 17", value: "16" },
    { name: "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E - 18", value: "17" },
    { name: "0xdD2FD4581271e230360230F9337D5c0430Bf44C0 - 19", value: "18" },
    { name: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199 - 20", value: "19" },
  ]; */

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

  // inquirer
  //   .prompt([
  //     {
  //       type: "list",
  //       name: "selectedOption",
  //       message: "Please select an address to stream from:",
  //       choices: accountOptions,
  //     },
  //   ])
  //   .then((answers) => {
  //     console.log(answers.selectedOption);
  //   });

  const address = await inquirer.prompt([
    {
      type: "number",
      name: "account",
      message: "Which account you want to interact with: (0-19)",
    },
  ]);

  const accountOne = await provider.getSigner(address.account);
  const accountTwo = await provider.getSigner(2);

  // -----------------------------------------------------------use this code if want to stream with your choise of account

  // const privateKey =
  //   "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  // const wallet = new ethers.Wallet(privateKey);
  // const owner = wallet.connect(provider);
  // const signerAddress = wallet.address;

  const owner = await provider.getSigner(0);
  console.log(
    `The account you will be interacting with thru this session will be: ` +
      (await accountOne.getAddress())
  );

  console.log("owner account address:", await owner.getAddress());

  console.log(
    "----------------------------------- All Hardhat Accounts ----------------------------------- "
  );
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

    if (sf) {
      console.log("sf Instance deployed successfully! 🥳");

      console.log(
        "----------------------------------- SuperFluid Addresses ----------------------------------- "
      );
      // console.log("Config:", sf.contracts);
      console.log(sf.settings.config);

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
      ethers.utils.parseEther("1000000000000000000000").toString()
    );
    daix = await sf.loadSuperToken("fDAIx");
    dai = new ethers.Contract(
      daix.underlyingToken.address,
      TestToken.abi,
      owner
    );

    console.log("fdaix token address:" + daix.underlyingToken.address);

    const thousandEther = "1000000000000000000000";

    const mint = await dai
      .connect(accountOne)
      .mint(accountOne.getAddress(), thousandEther);

    await dai
      .connect(accountOne)
      .approve(daix.address, ethers.constants.MaxInt256);

    const account1Upgrade = daix.upgrade({ amount: thousandEther });
    await account1Upgrade.exec(accountOne);

    if (mint) {
      const daiBal = await daix.balanceOf({
        account: await accountOne.getAddress(),
        providerOrSigner: accountOne,
      });
      console.log(`Successfully minted ${daiBal} fDaix token 🥳`);
    }
  } catch (err) {
    console.log(err);
  }

  async function prompt() {
    const answers = await inquirer
      .prompt([
        {
          type: "list",
          name: "selectedOption",
          message: "Please select an option:",
          choices: options,
          pageSize: options.length,
        },
      ])
      .then(async (answers) => {
        if (answers.selectedOption === "start") {
          const choiseAddress = await inquirer.prompt([
            {
              type: "confirm",
              name: "confirm",
              message: "Do you want to manually enter the receiver address?",
            },
          ]);

          if (choiseAddress.confirm) {
            console.log("You choosed to go with manual address!");
            // receiver address
            const receiverAddress = await inquirer.prompt([
              {
                type: "input",
                name: "address",
                message: "Please enter an address:",
              },
            ]);

            // flowrate
            const flowRate = await inquirer.prompt([
              {
                type: "number",
                name: "flowrate",
                message: "Enter Flowrate per second: ",
              },
            ]);
            console.log(receiverAddress.address);
            console.log(flowRate.flowrate);
            console.log(
              `Creating your stream to: ${receiverAddress.address} with flowrate: ${flowRate.flowrate}`
            );

            // starting the stream with manual address
            let createFlowOperation = daix.createFlow({
              sender: await accountOne.getAddress(),
              receiver: await receiverAddress.address,
              flowRate: flowRate.flowrate.toString(),
              // userData?: string
            });

            const result = await createFlowOperation.exec(accountOne);
            console.log(result);

            const receipt = await result.wait();
            if (receipt) {
              console.log(
                `stream successfully started from "${await accountOne.getAddress()}" with flowrate: "${
                  flowRate.flowrate
                }"to: "${receiverAddress.address}" \u{1F60E}`
              );
            }
            prompt();
          } else {
            const flowRate = await inquirer.prompt([
              {
                type: "number",
                name: "flowrate",
                message: "Enter Flowrate per second: ",
              },
            ]);
            console.log("Creating your stream with hardhat account [2]...");
            console.log(
              `Creating your stream to: ${await accountTwo.getAddress()} with flowrate: ${
                flowRate.flowrate
              }`
            );

            let createFlowOperation = daix.createFlow({
              sender: await accountOne.getAddress(),
              receiver: await accountTwo.getAddress(),
              flowRate: flowRate.flowrate.toString(),
              // userData?: string
            });

            const result = await createFlowOperation.exec(accountOne);
            console.log(result);

            const receipt = await result.wait();

            if (receipt) {
              console.log("Stream started with hardhat accounts! \u{1F60E}");
            }
            prompt();
          }
        }

        if (answers.selectedOption === "balanceof") {
          const viewBalanceAddress = await inquirer.prompt([
            {
              type: "input",
              name: "address",
              message: "Enter an address to check balance of: ",
            },
          ]);

          try {
            const daixBalance = await daix.balanceOf({
              account: await viewBalanceAddress.address,
              providerOrSigner: accountTwo,
            });
            console.log("account balance: " + daixBalance);
            console.log(
              `DAIx balance for ${viewBalanceAddress.address} is: ${daixBalance}🤑💸`
            );
          } catch (err) {
            console.log(err);
          }
          prompt();
        }

        if (answers.selectedOption === "viewnet") {
          const viewFlowAddress = await inquirer.prompt([
            {
              type: "input",
              name: "address",
              message: "Enter an address to get the net flow of: ",
            },
          ]);
          try {
            const appFlowRate = await daix.getNetFlow({
              account: await viewFlowAddress.address,
              providerOrSigner: superSigner,
            });
            console.log("flowRate:" + appFlowRate);
            console.log(
              `Net flow rate of ${viewFlowAddress.address} is: ${appFlowRate}`
            );
            // const appFlowRateOwner = await daix.getNetFlow({
            //   account: await address,
            //   providerOrSigner: superSigner,
            // });
            // console.log("flowRateOwner:" + appFlowRateOwner);
            // let res = await daix.getFlow({
            //   sender: await accountOne.getAddress(),
            //   receiver: await accountTwo.getAddress(),
            //   providerOrSigner: accountOne,
            // });
            // console.log("getFlow:" + res);
          } catch (err) {
            console.log(err);
          }
          prompt();
        }

        if (answers.selectedOption === "viewflow") {
          const viewFlowAddress = await inquirer.prompt([
            {
              type: "input",
              name: "address",
              message: "Enter an address to get the flow of: ",
            },
          ]);
          try {
            const appFlowRate = await daix.getFlow({
              sender: await accountOne.getAddress(),
              receiver: viewFlowAddress.address,
              providerOrSigner: superSigner,
            });
            console.log(appFlowRate);
          } catch (err) {
            console.log(err);
          }
          prompt();
        }

        if (answers.selectedOption === "viewaccountflow") {
          const viewFlowAddress = await inquirer.prompt([
            {
              type: "input",
              name: "address",
              message: "Enter an address to get the Account Flow Info of: ",
            },
          ]);
          try {
            const appFlowRate = await daix.getAccountFlowInfo({
              account: await viewFlowAddress.address,
              providerOrSigner: superSigner,
            });
            console.log(appFlowRate);
          } catch (err) {
            console.log(err);
          }
          prompt();
        }

        if (answers.selectedOption === "update") {
          const address = await inquirer.prompt([
            {
              type: "input",
              name: "address",
              message: "Enter the recepient address: ",
            },
          ]);
          const flowRate = await inquirer.prompt([
            {
              type: "number",
              name: "flowrate",
              message: "Enter Flowrate per second: ",
            },
          ]);

          try {
            let updateFlowOperation = daix.updateFlow({
              sender: await accountOne.getAddress(),
              receiver: await address.address,
              flowRate: flowRate.flowrate,
            });

            const resultUpdate = await updateFlowOperation.exec(accountOne);
            console.log(resultUpdate);

            const receiptUpdate = await resultUpdate.wait();

            if (receiptUpdate) {
              console.log(
                `stream updated for ${address.address} with flowrate: ${flowRate.flowrate}!🥳`
              );
            }
          } catch (err) {
            console.log(err);
          }
          prompt();
        }

        if (answers.selectedOption === "delete") {
          const address = await inquirer.prompt([
            {
              type: "input",
              name: "address",
              message: "Enter the receiver address: ",
            },
          ]);

          try {
            let updateFlowOperation = daix.deleteFlow({
              sender: await accountOne.getAddress(),
              receiver: await address.address,
            });

            const resultDelete = await updateFlowOperation.exec(accountOne);
            console.log(resultDelete);

            const receiptDelete = await resultDelete.wait();

            if (receiptDelete) {
              console.log("stream deleted!🙂");
            }
          } catch (err) {
            console.log(err);
          }
          prompt();
        }

        if (answers.selectedOption === "exit") {
          console.log(
            "Thank you for visiting superFluid developer dashboard!💚💚"
          );
        }
      });
  }
  prompt();
}

deploy();
