# FirmaStation Restake Scheduler

## How to build
### 1. Install npm

- Install npm modules

  ```bash
    $ npm install
  ```

### 2. Prepare the config file

- Copy config file

  ```bash
  $ cp config.sample.ts config.ts
  ```

- Set the variables in config.
  
  ```bash
  MONGODB_URI
   - mongodb://'The address where MongoDB is installed'/'Database name'

  RESTAKE_MNEMONIC
   - This is Mnmonic of the wallet that is doing Restake.

  MINIMUM_UFCT_REWARD_AMOUNT
   - Minimum amount of Rewards subject to Restake.

  FREEQUANCY
   - Determines the scheduling time.

  BATCH_TX_COUNT
   - One transaction (Authz Exec) contains as many targets as you set.

  PRODUCTION_MODE # PRODUCTION | DEVELOPMENT | TEST
   - The ecosystem type is determined. 
  ```

### 3. Run scheduler

- Start the Restake Scheduler
  ```bash
  # Start according to PRODUCTION_MODE
  $ npm run start

  # start:dev enables the --watch option.
  $ npm run start:dev
  ```
