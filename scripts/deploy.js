const inquirer = require("inquirer");
const { Framework } = require("@superfluid-finance/sdk-core");
const { ethers } = require("ethers");
const { network } = require("hardhat");
const fs = require("fs");

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
    { name: "re-execute everything?", value: "reexecute" },
    { name: "Clear all transactions?", value: "clear" },
    { name: "Exit console", value: "exit" },
  ];

  let sfDeployer;
  let contractsFramework;
  let sf;
  let dai;
  let daix;
  let accounts;
  let superSigner;
  const txHashes = [];

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
  const accountTwo = await provider.getSigner(address.account + 1);

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

  async function checkBalance(accountAddress, providerOrSigner) {
    try {
      const daixBalance = await daix.balanceOf({
        account: accountAddress,
        providerOrSigner: providerOrSigner,
      });
      console.log(`DAIx balance for ${accountAddress} is: ${daixBalance}🤑💸`);
    } catch (err) {
      console.log(err);
    }
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
        //------------------------------------------------------------------------------------------------------ Start stream
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
            console.log("Transaction Hash: " + result.hash);
            txHashes.push(result.hash);

            fs.writeFileSync("txHashes.json", JSON.stringify(txHashes));
            console.log("Transactions recorded and saved to txHashes.json");

            const receipt = await result.wait();
            if (receipt) {
              console.log(
                `stream successfully started from "${await accountOne.getAddress()}" with flowrate: "${
                  flowRate.flowrate
                }"to: "${receiverAddress.address}" \u{1F60E}`
              );
              console.log("Transaction hash:", receipt.transactionHash);
            }
            prompt();
          } // -----------------------------------------------------------------------------------ELse Part(default accounts)
          else {
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
            console.log("Transaction Hash: " + result.hash);
            txHashes.push(result.hash);

            fs.writeFileSync("txHashes.json", JSON.stringify(txHashes));
            console.log("Transactions recorded and saved to txHashes.json");

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

          // try {
          //   const daixBalance = await daix.balanceOf({
          //     account: await viewBalanceAddress.address,
          //     providerOrSigner: accountTwo,
          //   });
          //   console.log("account balance: " + daixBalance);
          //   console.log(
          //     `DAIx balance for ${viewBalanceAddress.address} is: ${daixBalance}🤑💸`
          //   );
          // } catch (err) {
          //   console.log(err);
          // }
          await checkBalance(await viewBalanceAddress.address, accountOne);
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
            //------
            console.log("Transaction Hash: " + resultDelete.hash);
            txHashes.push(resultDelete.hash);

            fs.writeFileSync("txHashes.json", JSON.stringify(txHashes));
            console.log(
              "----------Transactions recorded and saved to txHashes.json"
            );

            if (receiptDelete) {
              console.log("stream deleted!🙂");
            }
          } catch (err) {
            console.log(err);
          }
          prompt();
        }

        if (answers.selectedOption === "reexecute") {
          const txHashes = JSON.parse(fs.readFileSync("txHashes.json"));
          let nonce = await accountOne.getTransactionCount();
          for (const txHash of txHashes) {
            console.log("Hash going to deploy again: " + txHash);
            const tx = await accountOne.provider.getTransaction(txHash);
            const newTx = {
              nonce: nonce++,
              gasPrice: tx.gasPrice,
              gasLimit: tx.gasLimit,
              to: tx.to,
              value: tx.value,
              data: tx.data,
              chainId: tx.chainId,
            };
            const txSend = await accountOne.sendTransaction(newTx);
            const receipt = await txSend.wait();
            console.log(`Transaction ${txHash} replayed`);
            console.log(receipt);
          }

          console.log("All transactions replayed");
          prompt();
        }
        if (answers.selectedOption === "clear") {
          fs.writeFileSync("txHashes.json", "[]");

          console.log("All transactions cleared!");
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
