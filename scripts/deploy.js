const inquirer = require("inquirer");
const { Framework } = require("@superfluid-finance/sdk-core");
const { ethers } = require("ethers");
const { network } = require("hardhat");
const fs = require("fs");
const chalk = require("chalk");

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

  const address = await inquirer.prompt([
    {
      type: "number",
      name: "account",
      message: "Which account you want to interact with: (0-19): ",
    },
  ]);

  const accountOne = await provider.getSigner(address.account);
  const accountTwo = await provider.getSigner(address.account + 1);

  // -----------------------------------------------------------use this code if want to stream with your choise of account

  /* const privateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  const wallet = new ethers.Wallet(privateKey);
  const owner = wallet.connect(provider);
  const signerAddress = wallet.address; */

  const owner = await provider.getSigner(0);
  console.log(
    `${chalk.yellow(
      ">> The account you will be interacting with through out this session will be:"
    )} ${chalk.bold.green(await accountOne.getAddress())}\n`
  );

  // console.log("owner account address:", await owner.getAddress());
  console.log(
    `${chalk.yellow(">> Owner account address:")} ${chalk.bold.green(
      await owner.getAddress()
    )}\n`
  );

  console.log(
    `${chalk.cyan(
      "=========================== All Hardhat Accounts ==========================="
    )} \n`
  );
  accounts = await provider.listAccounts();
  console.log(accounts);
  console.log(
    `${chalk.cyan(
      "==============================================================="
    )} \n`
  );

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
      console.log(
        `${chalk.yellow(">> sf Instance deployed successfully! 🥳🥳🥳")} \n`
      );

      console.log(
        `${chalk.cyan(
          "=========================== SuperFluid Addresses ==========================="
        )}`
      );
      console.log(sf.settings.config);

      superSigner = sf.createSigner({
        signer: owner,
        provider: provider,
      });
    }
  } catch (err) {
    console.log(err);
  }
  console.log(
    `${chalk.cyan(
      "==============================================================="
    )} \n`
  );

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

    // console.log("fdaix token address:" + daix.underlyingToken.address);
    console.log(
      `${chalk.yellow(">> fdaix token address: ")}${chalk.bold.green(
        daix.underlyingToken.address
      )}\n`
    );

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
      // console.log(`Successfully minted ${daiBal} fDaix token 🥳`);
      console.log(
        `${chalk.yellow(">> Successfully minted ")}${chalk.bold.green(
          daiBal
        )} ${chalk.yellow("fDaix token 🥳🥳🥳")} \n`
      );
    }
  } catch (err) {
    console.log(err);
  }

  async function promptForAddress(message) {
    const address = await inquirer.prompt([
      {
        type: "input",
        name: "address",
        message: message,
      },
    ]);
    return address.address;
  }

  async function promptForFlowrate() {
    const flowRate = await inquirer.prompt([
      {
        type: "number",
        name: "flowrate",
        message: "Enter Flowrate per second: ",
      },
    ]);
    return flowRate.flowrate;
  }

  async function checkBalance(accountAddress, providerOrSigner) {
    try {
      const daixBalance = await daix.balanceOf({
        account: accountAddress,
        providerOrSigner: providerOrSigner,
      });
      // console.log(`DAIx balance for ${accountAddress} is: ${daixBalance}`);
      console.log(
        `${chalk.yellow(">> DAIx balance for ")}${chalk.bold.green(
          accountAddress
        )} ${chalk.yellow("is:")} ${chalk.bold.green(daixBalance)} 🪙🪙🪙\n`
      );
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
            // console.log("You choosed to go with manual address!📝📝📝");
            console.log(
              `${chalk.yellow(
                ">> You choosed to go with manual address!📝📝📝"
              )} \n`
            );
            // receiver address
            const address = await promptForAddress(
              "Please enter the receiver address: "
            );
            const flowrate = await promptForFlowrate();

            console.log(
              `${chalk.cyan(
                "==============================================================="
              )} \n`
            );
            // console.log(
            //   `Creating your stream to: ${address} with flowrate: ${flowrate}`
            // );
            console.log(
              `${chalk.yellow(
                ">> Creating your stream to: "
              )}${chalk.bold.green(address)} ${chalk.yellow(
                "with flowrate: "
              )}${chalk.bold.green(flowrate)}\n`
            );

            // starting the stream with manual address
            let createFlowOperation = daix.createFlow({
              sender: await accountOne.getAddress(),
              receiver: address.toString(),
              flowRate: flowrate.toString(),
              // userData?: string
            });

            const result = await createFlowOperation.exec(accountOne);
            console.log(result);
            console.log(
              `${chalk.yellow(">> Transaction hash: ")}${chalk.bold.green(
                result.hash
              )}\n`
            );

            txHashes.push(result.hash);
            fs.writeFileSync("txHashes.json", JSON.stringify(txHashes));

            console.log(
              `${chalk.yellow(
                ">> Transactions recorded and saved to txHashes.json!💾💾💾"
              )}\n`
            );

            const receipt = await result.wait();
            if (receipt) {
              console.log(
                `${chalk.yellow(
                  ">> Stream successfully started from "
                )}\n${chalk.bold.green(
                  await accountOne.getAddress()
                )} ${chalk.yellow("with flowrate: ")}${chalk.bold.green(
                  flowrate
                )} ${chalk.yellow("to: ")}${chalk.bold.green(address)}\n`
              );
            }
            console.log(
              `${chalk.cyan(
                "==============================================================="
              )} \n`
            );
            prompt();
          } // -----------------------------------------------------------------------------------ELse Part(default accounts)
          else {
            const flowrate = await promptForFlowrate();
            console.log(
              `${chalk.cyan(
                "==============================================================="
              )} \n`
            );

            console.log(
              `${chalk.yellow(
                ">> Creating your stream from: "
              )}${chalk.bold.green(
                await accountOne.getAddress()
              )} ${chalk.yellow("to:")} ${chalk.bold.green(
                await accountTwo.getAddress()
              )} ${chalk.yellow("with flowrate: ")}${chalk.bold.green(
                flowrate
              )}\n`
            );

            let createFlowOperation = daix.createFlow({
              sender: await accountOne.getAddress(),
              receiver: await accountTwo.getAddress(),
              flowRate: flowrate.toString(),
              // userData?: string
            });

            const result = await createFlowOperation.exec(accountOne);
            console.log(result);

            const receipt = await result.wait();

            console.log(
              `${chalk.yellow(">> ### Transaction Hash: ")}${chalk.bold.green(
                result.hash
              )}\n`
            );

            txHashes.push(result.hash);
            fs.writeFileSync("txHashes.json", JSON.stringify(txHashes));

            console.log(
              `${chalk.yellow(
                ">> Transactions recorded and saved to txHashes.json!💾💾💾"
              )}\n`
            );

            if (receipt) {
              console.log(
                `${chalk.yellow(
                  ">> Stream started with hardhat accounts! \u{1F60E}"
                )}\n`
              );
            }
            console.log(
              `${chalk.cyan(
                "==============================================================="
              )} \n`
            );
            prompt();
          }
        }

        if (answers.selectedOption === "update") {
          const address = await promptForAddress(
            "Please enter the receiver address: "
          );
          const flowrate = await promptForFlowrate();
          console.log(
            `${chalk.cyan(
              "==============================================================="
            )} \n`
          );
          console.log(`${chalk.yellow("Updating the stream...")} \n`);

          try {
            let updateFlowOperation = daix.updateFlow({
              sender: await accountOne.getAddress(),
              receiver: await address,
              flowRate: flowrate,
            });

            const result = await updateFlowOperation.exec(accountOne);
            console.log(result);

            const receiptUpdate = await result.wait();
            console.log(
              `${chalk.yellow(">> ### Transaction Hash: ")}${chalk.bold.green(
                result.hash
              )}\n`
            );

            txHashes.push(result.hash);
            fs.writeFileSync("txHashes.json", JSON.stringify(txHashes));
            console.log(
              `${chalk.yellow(
                ">> Transactions recorded and saved to txHashes.json!💾💾💾"
              )}\n`
            );

            if (receiptUpdate) {
              console.log(
                `${chalk.yellow(">> Stream updated for: ")}${chalk.bold.green(
                  address
                )} ${chalk.yellow("with flowrate: ")}${chalk.bold.green(
                  flowrate
                )}🥳🥳🥳\n`
              );
            }
          } catch (err) {
            console.log(err);
          }
          console.log(
            `${chalk.cyan(
              "==============================================================="
            )} \n`
          );
          prompt();
        }

        if (answers.selectedOption === "delete") {
          const address = await promptForAddress(
            "Please enter the receiver address: "
          );
          console.log(
            `${chalk.cyan(
              "==============================================================="
            )} \n`
          );
          console.log(`${chalk.yellow("Deleting the stream...")} \n`);
          try {
            let updateFlowOperation = daix.deleteFlow({
              sender: await accountOne.getAddress(),
              receiver: await address,
            });

            const result = await updateFlowOperation.exec(accountOne);
            console.log(result);

            const receipt = await result.wait();
            console.log(
              `${chalk.yellow(">> ### Transaction Hash: ")}${chalk.bold.green(
                result.hash
              )}\n`
            );

            txHashes.push(result.hash);

            fs.writeFileSync("txHashes.json", JSON.stringify(txHashes));
            console.log(
              `${chalk.yellow(
                ">> Transactions recorded and saved to txHashes.json!💾💾💾"
              )}\n`
            );

            if (receipt) {
              console.log("stream deleted successfully!🙂");
            }
          } catch (err) {
            console.log(err);
          }
          console.log(
            `${chalk.cyan(
              "==============================================================="
            )} \n`
          );
          prompt();
        }

        if (answers.selectedOption === "reexecute") {
          const txHashes = JSON.parse(fs.readFileSync("txHashes.json"));
          let nonce = await accountOne.getTransactionCount();
          for (const txHash of txHashes) {
            console.log(
              `${chalk.yellow(
                ">> Hash going to deploy again: "
              )}${chalk.bold.green(txHash)}\n`
            );
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
            console.log(txSend);
            console.log(
              `${chalk.yellow(
                ">> ### New transaction Hash: "
              )}${chalk.bold.green(txSend.hash)}\n`
            );
            console.log(
              `${chalk.yellow(">> Transaction: ")}${chalk.bold.green(
                txHash
              )} ${chalk.yellow("re-deployed")}\n`
            );
            console.log(
              `${chalk.cyan(
                "==============================================================="
              )} \n`
            );
          }

          console.log(
            `${chalk.yellow("All transactions re-deployed!🔄🔄🔄")}\n`
          );
          prompt();
        }

        if (answers.selectedOption === "balanceof") {
          const address = await promptForAddress(
            "Please enter the address to check balanceOf: "
          );
          console.log(
            `${chalk.cyan(
              "==============================================================="
            )} \n`
          );
          await checkBalance(await address, accountOne);
          console.log(
            `${chalk.cyan(
              "==============================================================="
            )} \n`
          );
          prompt();
        }

        if (answers.selectedOption === "viewnet") {
          const address = await promptForAddress(
            "Please enter the address to view net flow rate: "
          );
          console.log(
            `${chalk.cyan(
              "==============================================================="
            )} \n`
          );
          try {
            const appFlowRate = await daix.getNetFlow({
              account: await address,
              providerOrSigner: superSigner,
            });

            console.log(
              `${chalk.yellow(">> Net flow rate of: ")}${chalk.bold.green(
                address
              )} ${chalk.yellow("is")} ${chalk.bold.green(appFlowRate)}\n`
            );
          } catch (err) {
            console.log(err);
          }
          console.log(
            `${chalk.cyan(
              "==============================================================="
            )} \n`
          );
          prompt();
        }

        if (answers.selectedOption === "viewflow") {
          const address = await promptForAddress(
            "Please enter the address to view the Flow details: "
          );
          console.log(
            `${chalk.cyan(
              "==============================================================="
            )} \n`
          );
          try {
            const appFlowRate = await daix.getFlow({
              sender: await accountOne.getAddress(),
              receiver: address,
              providerOrSigner: superSigner,
            });
            console.log(appFlowRate);
          } catch (err) {
            console.log(err);
          }
          console.log(
            `${chalk.cyan(
              "==============================================================="
            )} \n`
          );
          prompt();
        }

        if (answers.selectedOption === "viewaccountflow") {
          const address = await promptForAddress(
            "Please enter the address to view Account flow info: "
          );
          console.log(
            `${chalk.cyan(
              "==============================================================="
            )} \n`
          );
          try {
            const appFlowRate = await daix.getAccountFlowInfo({
              account: await address,
              providerOrSigner: superSigner,
            });
            console.log(appFlowRate);
          } catch (err) {
            console.log(err);
          }
          console.log(
            `${chalk.cyan(
              "==============================================================="
            )} \n`
          );
          prompt();
        }

        if (answers.selectedOption === "clear") {
          fs.writeFileSync("txHashes.json", "[]");

          console.log(
            `\n${chalk.yellow(
              "All transactions cleared from txHashes array!"
            )} \n`
          );

          prompt();
        }
        if (answers.selectedOption === "exit") {
          console.log(
            `\n${chalk.bold.green(
              "Thank you for visiting superFluid developer dashboard!💚💚"
            )}\n`
          );
        }
      });
  }
  prompt();
}

deploy();
