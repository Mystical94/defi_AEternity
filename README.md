# defi_AEternity

A collection of three DEFI contracts, namely Staking, Lending Pool, and Vault, which are required as the first step in developing a DEFI protocol.

## Lending Pool Contract

--> Create a pool contract that accepts deposit from lenders and borrow money to the borrowers

- Lenders can lend any amount of money and earn some interest for it.
- User or borrower can borrow some amount of tokens (limited) , and pay back with interest for some time period.
- Interest is calculated according the interest rate and borrowing time peroid
- Lender can withdraw the amount later with extra interest earning
- Other functions can be called to determine the balance at any point of time , and the rewards earned

## Vault Contract

--> Sharing of Yield For the no. of shares owned

- user can deposit their money
- Some shares are minted according to the value deposited
- Vault generate some yield by a puropose and the value of share increases
- user can withdraw the amount by burning those share at any point of time .

## Staking Contract

--> Rewards user for staking their tokens in the contract

- User can withdraw and deposit at an point of time
- Tokens Earned can be withdrawed any time
- Rewards are calculated with reward rate and time period staked for
- The balance and reward earned can be checked at any point of time

## Local Development

Clone the repository

move into the frontend folder

```sh
cd frontend
```

install dependencies using **yarn** or **npm**

```sh
npm install

or

yarn
```

start the development server
```sh
npm run dev

or

yarn dev
```

build with production mode
```sh
npm run build

or

yarn build
```
