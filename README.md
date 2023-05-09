# Superfluid developer dashboard console

### Prerequisites

Node.js (version 14 or later)

### clone this repo

```shell
git clone https://github.com/sarvagnakadiya/superfluid-developer-dashboard.git
cd superfluid-developer-dashboard
npm install
```

Now, the only thing you need to do is run this command:

```shell
npx hardhat run scripts/deploy.js
```

You will be prompted to enter the address index which you want to interact for the whole session (which will be your default signer)
it will be like:

```shell
? Which account you want to interact with: (0-19)
```

Here, you can enter the index number of account from 0 to 19

Now, as you enter the account and press enter:

Now it will show you all hardhat accounts, along with it there will be superFluid addresses too. (contract addresses)(deployed on local blockchain)

Then, Right away it will mint 1000 fDAIx token to the account which you choose. It will be something like this

```shell
Successfully minted 1000000000000000000000 fDaix token 🥳
```

Now you can interact with superfluid, <br>
you can create/update/delete/view streams using this prompt.

```shell
? Please select an option:
> Start Stream
  Update stream
  Delete stream
  getFlow
  getNetFlow
  getAccountFlowInfo
  check DAIx balance
  re-execute everything?
  Clear all transactions?
  Exit console
```

## when you choose start stream

It will ask:

```shell
? Do you want to manually enter the receiver address? (Y/n)
```

### It means that if you enter "y"

Then it will ask you the receiver address

```shell
You choosed to go with manual address!
? Please enter an address:
```

You can enter the receiver address from one of the hardhat accounts or the contract address.

Now, it will ask you the flowrate (in second)

```shell
? Enter Flowrate per second:
```

Reminder: the flowrate will be in form of "Wei"

###### Now, as you enter the flow rate, you will be asknowledged with trasaction details.

### But if you enter "n"

Then, by default it will choose the hardhat account[2]

###### You will be asked to enter the flowrate, and as you enter transaction will proceed and you will be acknowledged with transaction details

## When you choose "update stream"

It will ask for recepient address

```shell
? Enter the recepient address:
```

and the flowrate

```shell
? Enter Flowrate per second:
```

###### As you enter the flowrate, it will update the stream and you will be acknowledged with transaction details.

## When you choose "delete stream"

It will ask for recepient address

```shell
? Enter the recepient address:
```

###### As you enter the recepient address, it will delete the stream and you will be acknowledged with transaction details.

## When you choose "getFlow" / "getNetFlow" / "getAccountFlowInfo"

###### You will be acknowledged with the flow details response <br>

You can learn more about it on: <br>
https://docs.superfluid.finance/superfluid/developers/constant-flow-agreement-cfa/cfa-operations/read-methods

## When you choose "check DAIx balance"

It will ask you the address whose balance you want to view

```shell
? Enter an address to check balance of:
```

###### As you enter the address you will be acknowledged with the balance like this:

```shell
>> DAIx balance for 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 is: 1000000000000000000000 🪙🪙🪙
```

## When you choose "re-execute everything?"

So, basically all your transactions like start/update/delete will be recorded in a file, and as you select this option all the transactions you tried manually will be re-executed again.

It makes the testing process easier and efficient.
Helping developers to re-do all the transactions with just one click!!

## When you choose "Clear all transactions?"

When you choose this option, it will clear out all the transactions and you can head up with a frest start. <br>
Basically, it will clear all the transactions record.

## You can simply just exit the console by choosing "Exit console"

It will give you a nice thank you message

```shell
Thank you for visiting superFluid developer dashboard!💚💚
```
