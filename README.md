# FirmaStation Restake Scheduler
![image](https://user-images.githubusercontent.com/93503020/179888980-a0e52cea-e4f1-49f7-ae66-81257cfb93ae.png)

## **Overview**
FirmaStation Restake Scheduler is a server application that automatically re-delegates rewards on behalf of delegators who have granted Delegation Authority to validators. The main advantage of this approach is that the validator performs the re-delegation, thus saving the delegators both transaction fees and time.

<br/>

## **Delegation Authority**
To participate in FirmaChain REStake, delegators must both <span style="color: #ffd33d">deposit</span> with and <span style="color: #ffd33d">grant Delegation Authority to</span> validators. Failure to satisfy either of these criteria will result in exclusion from REStake targets, and thus no re-delegation will occur.

<br/>

## **Deposit & Grant Authority**
Depositing and granting authority to validators can be done via [**FirmaStation**](https://station.firmachain.io).

<br/>

## **Setting Up**
Copy the config.sample.ts file to config.ts and set the values for each variable as follows.
```bash
# Copy config file
$ cp config.sample.ts config.ts
```

- MONGODB_URI: Enter the address where MongoDB is installed and the name of the database (e.g. mongodb://localhost:27017/mydatabase).

- RESTAKE_MNEMONIC: Enter the Mnmonic of the wallet performing the re-delegation.

- MINIMUM_UFCT_REWARD_AMOUNT: Set the minimum amount of rewards subject to re-delegation.

- FREQUENCY: Determines the scheduling time.

- BATCH_TX_COUNT: Set the number of targets included in one transaction (Authz Exec).

- PRODUCTION_MODE: Determines the ecosystem type. (PRODUCTION | DEVELOPMENT | TEST)

<br/>

## **Building the Project**
```bash
# Clone the repository
$ git clone https://github.com/FirmaChain/FirmaStation-Restake-Scheduler.git

# Navigate into the project folder
$ cd FirmaStation-Restake-Scheduler

# Install necessary packages
$ npm install

# Copy config.sample.ts to config.ts
$ cp config.sample.ts config.ts

# Edit the config.ts file and set each variable
$ nano config.ts
```

<br/>

## **How to Run**
```bash
# Start according to PRODUCTION_MODE
$ npm run start

# start:dev enables the --watch option.
$ npm run start:dev
```

<br/>

## **Notice**
By granting Delegation Authority, validators are able to perform re-delegation of rewards. However, they can not access your principal or perform any other actions on your behalf. You can revoke this authority at any time through the FirmaStation app.