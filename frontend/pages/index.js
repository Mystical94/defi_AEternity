import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import logo from "../src/assets/logo.png";
import aeternity from "../src/assets/aeternity.png";
import title from "../src/assets/title.png";
import Link from "next/link";
import { useEffect } from "react";

import Prism from "prismjs";

import "prismjs/themes/prism-okaidia.css";
import "prismjs/components/prism-jsx.js";
import "prismjs/plugins/line-numbers/prism-line-numbers.js";
import "prismjs/plugins/line-numbers/prism-line-numbers.css";

export default function Home() {
  useEffect(() => {
    Prism.highlightAll();
  }, []);

  const lending = `// ISC License
  //
  // Copyright (c) 2017, aeternity developers
  //
  // Permission to use, copy, modify, and/or distribute this software for any
  // purpose with or without fee is hereby granted, provided that the above
  // copyright notice and this permission notice appear in all copies.
  //
  // THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  // REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  // AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  // INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  // LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE
  // OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  // PERFORMANCE OF THIS SOFTWARE.
  
  
  // THIS IS NOT SECURITY AUDITED
  // DO NEVER USE THIS WITHOUT SECURITY AUDIT FIRST
  
  @compiler >= 5
  
  // - Create a pool contract that accepts deposit from lenders , who earn interest on lending
  // - User  or borrower can borrow some amount of tokens (limited) , and pay back with some interest for some time period.
  // - lender can withdraw the amount later with some interest
  
  include "List.aes"
  include "Option.aes"
  //include "./IAEX9Minimal.aes"
  
  // interface of the tokens to be awarded as rewards for the user
  contract interface FungibleToken =
    record meta_info ={ 
      name : string
      , symbol : string
      , decimals : int 
      }
  
    record allowance_accounts = { from_account : address, for_account : address }
    type allowances = map(allowance_accounts, int)
  
    datatype event =
      Transfer(address, address, int)
      | Allowance(address, address, int)
  //    | Burn(address, int)
  //    | Mint(address, int)
  //    | Swap(address, int)
  
    entrypoint aex9_extensions               : ()                      => list(string)
    entrypoint meta_info                     : ()                      => meta_info
    entrypoint total_supply                  : ()                      => int
    entrypoint owner                         : ()                      => address
    entrypoint balances                      : ()                      => map(address, int)
    entrypoint balance                       : (address)               => option(int)
    stateful entrypoint transfer             : (address, int)          => unit
    stateful entrypoint transferFrom         : (address, address, int) => unit
    entrypoint allowances                    : ()                      => allowances
    entrypoint allowance                     : (allowance_accounts)    => option(int)
    entrypoint allowance_for_caller          : (address)               => option(int)
    stateful entrypoint transfer_allowance   : (address, address, int) => unit
    stateful entrypoint create_allowance     : (address, int)          => unit
    stateful entrypoint change_allowance     : (address, int)          => unit
    stateful entrypoint reset_allowance      : (address)               => unit
    //stateful entrypoint burn                 : (int)                   => unit
    //stateful entrypoint mint                 : (address, int)          => unit
    //stateful entrypoint swap                 : ()                      => unit
    //entrypoint check_swap                    : (address)               => int
    //entrypoint swapped                       : ()                      => map(address, int)
  
  
  contract LiquidityPool =
      /// intialize token
      type token = address
  
      record amount = {
                amount   : int
              , start    : int
      }
  
      // This is a type alias to check if the address has lended any amount
      type lendAmount = map(address, amount)
  
      // This is a type alias for the interest earned by the lender
      type earnedInterest = map(address, int)
  
      // This is a type alias to store the info about lender & borrowers
      type lenders = map(address, bool)
      type borrowers = map(address, bool)
  
      // This is a type alias to check if the address has borrowed any amount
      type borrowAmount = map(address, amount)
  
      // This is a type alias for the interest to be paid by the borrower
      type payInterest = map(address, int)
  
  
      record state = {
                //token area
                total_supply      : int
              , lendAmount        : lendAmount
              , earnedInterest    : earnedInterest
              , lenders           : lenders
              , borrowers         : borrowers
              , borrowAmount      : borrowAmount
              , payInterest       : payInterest  
              , lendRate          : int
              , borrowRate        : int
              , periodBorrowed    : int
              , amount_           : int
              , start_            : int
              , _amount           : int
              , token             : address
              , debug_time        : option(int)
      }
  
  
      entrypoint init(
            token: address
          , debug_time: option(int)       // If this is set to Some(...) the pair will enter in debug mode
                                          // and 'timestamp()' will get the value from it. After this point,
                                          // to modify it's value 'set_debug_time' should be called.
                                          // Otherwise if the contract initialization sets 'debug_time' to 'None',
                                          // 'timestamp()' will be reflected by the Chain.timestamp
                                          // and any further set_debug_time call will result with an error
          ) = {
                total_supply           = 0
              , lendAmount             = {}
              , earnedInterest         = {}
              , lenders                = {}
              , borrowers              = {}
              , borrowAmount           = {}  
              , payInterest            = {}
              , lendRate               = 100
              , borrowRate             = 130
              , periodBorrowed         = 0
              , amount_                = 0
              , start_                 = 0
              , _amount                = 0
              , token                  = FungibleToken(_tokenAddress)
              , debug_time             = debug_time
          }
  
      //------------------------------------------------------------------------------
      // VIEWERS
      //------------------------------------------------------------------------------
  
      entrypoint meta_info(): IAEX9Minimal.meta_info =
          let meta = state.token.meta_info()
          {   name     = meta.name
            , symbol   = meta.symbol
            , decimals = 18 }
  
      entrypoint aex9_extensions() : list(string) = ["allowances"]
  
      entrypoint total_supply() : int = state.total_supply
  
      entrypoint token() = state.token
  
  
      stateful entrypoint set_debug_time(time: int) =
          require_positive([time])
          require(Option.is_some(state.debug_time), "AedexV2Pair: NOT_DEBUG_MODE")
          put( state { debug_time = Some(time) } )
  
  
      /// @dev - to lend the amount by  , add liquidity
      /// @param _amount - the amount to be lender
      payable stateful entrypoint lend(_amount: int): unit =
          require_positive([_amount])
          token.transferFrom(Call.caller, Call.origin, _amount)
  
          put(lendAmount[Call.caller].amount = _amount )
          put(lendAmount[Call.caller].start  = Chain.timestamp )
          put(lenders[Call.caller]           = true )
          
          put(totalSupply     = totalSupply + _amount )
      
  
  
      /// @dev - to borrow token
      /// @param _amount - amount to be withdraw
  
      payable stateful entrypoint borrow(_amount: int): unit =
          require_positive([_amount])
          put(borrowAmount[Call.caller].amount = _amount )
          put(borrrowAmount[Call.caller].start = Chain.timestamp )
          put(totalSupply                 = totalSupply - _amount )
  
          token.transfer(Call.caller, _amount)
          put(borrowers[Call.caller]           = true )
      
  
      /// @dev  - repay the whole loan
      payable stateful entrypoint repay(): unit =  
          require(borrowers[Call.caller], " not a borrower")
          put(amount_ = borrowAmount[Call.caller].amount )
          put(start_ = borrowAmount[Call.caller].start )
          put(_amount = (amount_ + (amount_ * ((Chain.timestamp - start_) * borrowRate * 1e18)) / totalSupply)
  
          require(_amount != 0, " amount can not be 0")
  
          token.transferFrom(Call.caller, Call.origin, _amount)
  
          put(borrowAmount[msg.sender] = {} )
          put(borrowers[msg.sender]    = false )
          
          put(totalSupply = totalSupply + _amount )
  
  
      /// @dev  - to withdraw the amount for the lender
      payable stateful entrypoint withdraw(): unit =  
          require(lenders[Call.caller], " you are not a lender")
  
          put(amount_ = lendAmount[Call.caller].amount )
          put(start_ = lendAmount[Call.caller].start )
          put(_amount = (amount_ + (amount_ * ((Chain.timestamp - start_) * lendRate * 1e18)) / totalSupply)
  
          require(_amount != 0, " amount can not be 0")
  
          put(lendAmount[msg.sender] = {} )
          put(lenders[msg.sender]    = false )
          
          put(totalSupply = totalSupply - _amount )
  
          token.transferFrom(Call.caller, _amount)
      `;

  const staking = `// ISC License
  //
  // Copyright (c) 2017, aeternity developers
  //
  // Permission to use, copy, modify, and/or distribute this software for any
  // purpose with or without fee is hereby granted, provided that the above
  // copyright notice and this permission notice appear in all copies.
  //
  // THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  // REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  // AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  // INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  // LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE
  // OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  // PERFORMANCE OF THIS SOFTWARE.
  
  
  // THIS IS NOT SECURITY AUDITED
  // DO NEVER USE THIS WITHOUT SECURITY AUDIT FIRST
  
  // ISC License
  
  @compiler >= 5
  
  include "Option.aes"
  include "List.aes"
  
  payable contract Stake =
    record state =
    { owner : address,
        contract_address : address,
        currentPositionId : int,
        tiers : map(int, int),
        lockPeriods : map(int, int),
        lockPeriodsIndex : int,
        borrowPositionId : int,
        positions : map(int, position),
        borrowers : map(int, borrower),
        borrowerIdByAddress: map(address, int),
        positionIdsByAddress: map(address, list(int))}
  
    record position = { 
      positionId : int,
      walletAddress : address,
      createdDate : int,
      unlockDate : int,
      percentInterest : int,
      aeStaked : int,
      aeInterest : int,
      open : bool}
    
    record borrower = { 
      positionId : int,
      walletAddress : address,
      createdDate : int,
      endDate : int,
      percentInterest : int,
      aeBorrowed : int,
      aeInterest : int,
      paid : bool}
  
    // Declaration and structure of datatype event
    // and events that will be emitted on changes
    datatype event = Stake(int, address, int) | Withdraw(int, address, int) | Borrow(address, int, int) | Paid(address, int, bool)
  
    stateful entrypoint init() : state  =
    { owner = Call.caller, borrowPositionId = 1, borrowers = {}, contract_address = Contract.address, lockPeriodsIndex = 3, positions = {}, currentPositionId = 0, tiers = {[30] = 700, [90] = 1000, [180] = 1200}, lockPeriods = {[0] = 30, [1] = 90, [2] = 180}, positionIdsByAddress = {}, borrowerIdByAddress = {} }
  
    entrypoint owner() : address =
      state.owner
  
    entrypoint contract_tiers(value: int) : int =
      state.tiers[value]
    
    entrypoint contract_lockPeriods(value: int) : int =
      state.lockPeriods[value]
  
    entrypoint contract_currentPositionId() : int =
      state.currentPositionId
  
    payable stateful entrypoint stakeAE(numDays: int) =
      require(state.tiers[numDays] > 0, "Mapping not found")
      let new_position : position = {
          positionId = state.currentPositionId,
          walletAddress = Call.caller,
          createdDate = Chain.timestamp,
          unlockDate = Chain.timestamp + ( numDays * 86400),
          percentInterest = state.tiers[numDays],
          aeStaked = Call.value,
          aeInterest = calculateInterest(state.tiers[numDays], Call.value),
          open = true}
  
      put(state{positions[state.currentPositionId] = new_position})
      put(state{currentPositionId = state.currentPositionId + 1 })
      let newPositionIdsByAddress = state.positionIdsByAddress{[Call.caller = []] @ positions = positions ++ [state.currentPositionId]}
      put(state{positionIdsByAddress = newPositionIdsByAddress })
      Chain.spend(Contract.address, Call.value)
      Chain.event(Stake(state.currentPositionId, Call.caller, calculateInterest(state.tiers[numDays], Call.value)))
  
    entrypoint calculateInterest(basisPoints: int, aeAmount : int) : int =
     ( basisPoints * aeAmount )
  
    stateful entrypoint modifyLockPeriods(numDays: int, basisPoints : int) =
      require(Call.caller == state.owner, "The caller is different than the owner")
      
      put(state{tiers[numDays] = basisPoints})
      put(state{lockPeriods[state.lockPeriodsIndex] = numDays})
      put(state{lockPeriodsIndex = state.lockPeriodsIndex + 1 })
  
    entrypoint getInterestRate(value: int) : int =
      state.tiers[value]
    
    entrypoint getPositionById(positionId: int) : position =
      state.positions[positionId]
  
    entrypoint getPositionIdForAddress(walletAddress : address) : list(int) =
      state.positionIdsByAddress[walletAddress]
  
    entrypoint getPositionIdForBorrower(walletAddress : address) : int =
      state.borrowerIdByAddress[walletAddress]
  
    entrypoint caller_balance() : int = Chain.balance(Call.caller)
  
    entrypoint getContactAddress() : address =
      state.contract_address
  
    entrypoint getContactBalance() : int = Chain.balance(state.contract_address)
  
    stateful entrypoint changeUnlockDate(positionId : int, newUnlockDate : int) =
      require(state.owner == Call.caller, "Only owner may modify staking period")
      put(state{positions[positionId].unlockDate = newUnlockDate })
    
    stateful entrypoint closePosition(positionId : int) =
      require(state.positions[positionId].walletAddress == Call.caller, "only position creator may modify positon")
      require(state.positions[positionId].open == true, "Position is closed")
      put(state{positions[positionId].open = false})
  
      if(Chain.timestamp > state.positions[positionId].unlockDate)
        let amount = state.positions[positionId].aeStaked + ( state.positions[positionId].aeInterest / 10000 )
        Chain.spend(Call.caller, amount)
        Chain.event(Withdraw(positionId, Call.caller, amount))
      else
        Chain.spend(Call.caller, state.positions[positionId].aeStaked)
        Chain.event(Withdraw(positionId, Call.caller, state.positions[positionId].aeStaked))
    
    stateful entrypoint borrowFunds(amount : int, sendTo : address, endDate : int) =
      require(state.owner == Call.caller, "Only owner can create a borrower")
      let new_borrower : borrower = {
          positionId = state.borrowPositionId,
          walletAddress = sendTo,
          createdDate = Chain.timestamp,
          endDate = Chain.timestamp + ( endDate * 86400),
          percentInterest = 4000,
          aeBorrowed = amount,
          aeInterest =  (8 * amount) / 100,
          paid = false}
  
      put(state{borrowers[state.borrowPositionId] = new_borrower})
      put(state{borrowerIdByAddress[sendTo] = state.borrowPositionId })
      Chain.event(Borrow(sendTo, amount, state.borrowPositionId))
      put(state{borrowPositionId = state.borrowPositionId + 1})
      Chain.spend(sendTo, amount)
  
    payable stateful entrypoint payBorrowedFund(borrower : address) =
      require(state.borrowerIdByAddress[borrower] > 0, "Key does not exist")
      let borrowerId = getPositionIdForBorrower(borrower)
      let amount = state.borrowers[borrowerId].aeInterest + state.borrowers[borrowerId].aeBorrowed
      require(Call.value >= amount, "amount is not complete")
      require(state.borrowers[borrowerId].paid == false, "debts has been paid")
  
      put(state{borrowers[borrowerId].paid = true})
      Chain.spend(Contract.address, Call.value)
      Chain.event(Paid(Contract.address, Call.value, state.borrowers[borrowerId].paid))`;

  const vault = `// ISC License
  //
  // Copyright (c) 2017, aeternity developers
  //
  // Permission to use, copy, modify, and/or distribute this software for any
  // purpose with or without fee is hereby granted, provided that the above
  // copyright notice and this permission notice appear in all copies.
  //
  // THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  // REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  // AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  // INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  // LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE
  // OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  // PERFORMANCE OF THIS SOFTWARE.
  
  
  // THIS IS NOT SECURITY AUDITED
  // DO NEVER USE THIS WITHOUT SECURITY AUDIT FIRST
  
  @compiler >= 5
  
  /// user can deposit his money
  /// it wll mint some share
  /// vault generate some yield
  /// user can withdraw the shares with the increased amount
  
  contract Vault =
      //IERC20 public immutable token;
      type token = address
  
      type balanceOf = map(address, int)
  
      record state = {
                //token area
                total_supply      : int
              , balanceOf         : balanceOf
              , token             : FungibleToken(_tokenAddress)
      }
  
      entrypoint init(
            token: address
          ) = {
                total_supply           = 0
              , balanceOf              = {}
              , token                  = FungibleToken(_tokenAddress)
          }
  
      payable stateful entrypoint lend(_amount: int): unit =
          require_positive([_amount])
          token.transferFrom(Call.caller, Call.origin, _amount)
  
          put(lendAmount[Call.caller].amount = _amount )
          put(lendAmount[Call.caller].start  = Chain.timestamp )
          put(lenders[Call.caller]           = true )
          
          put(totalSupply     = totalSupply + _amount )
      
  
      payable stateful entrypoint mint(_to: address, shares: int) unit =
          put(totalSupply = totalSupply + shares )
          put(balanceOf[_to] = balanceOf[_to] + shares)
      
  
      payable stateful entrypoint burn(_from: address, shares: int) unit =
          put(totalSupply = totalSupply - shares )
          put(balanceOf[_from] = balanceOf[_from] - shares)
  
      payable stateful entrypoint deposit(_amount: int) unit =
          let shares
          if (totalSupply == 0)
              put(shares = _amount)
          else
              put(shares = (_amount * totalSupply) / token.balanceOf(address(Call.origin))
              mint(Call.caller, shares)
              token.transferFrom(Call.caller, Call.origin, _amount)
  
  
      payable stateful entrypoint withdraw(_shares: int) unit =
              put(amount = (_shares * token.balanceOf(address(this))) /  totalSupply
              burn(Call.caller, _shares)
              token.transfer(Call.caller, amount)
  
  
  contract interface FungibleToken =
    record meta_info ={ 
      name : string
      , symbol : string
      , decimals : int 
      }
  
    record allowance_accounts = { from_account : address, for_account : address }
    type allowances = map(allowance_accounts, int)
  
    datatype event =
      Transfer(address, address, int)
      | Allowance(address, address, int)
  //    | Burn(address, int)
  //    | Mint(address, int)
  //    | Swap(address, int)
  
    entrypoint aex9_extensions               : ()                      => list(string)
    entrypoint meta_info                     : ()                      => meta_info
    entrypoint total_supply                  : ()                      => int
    entrypoint balanceOf                     : ()                      => map(address, int)
    entrypoint balance                       : (address)               => option(int)
    stateful entrypoint transfer             : (address, int)          => unit
    stateful entrypoint transferFrom         : (address, address, int) => unit
    entrypoint allowances                    : ()                      => allowances
    entrypoint allowance                     : (allowance_accounts)    => option(int)
    entrypoint allowance_for_caller          : (address)               => option(int)
    stateful entrypoint transfer_allowance   : (address, address, int) => unit
    stateful entrypoint create_allowance     : (address, int)          => unit
    stateful entrypoint change_allowance     : (address, int)          => unit
    stateful entrypoint reset_allowance      : (address)               => unit
    //stateful entrypoint burn                 : (int)                   => unit
    //stateful entrypoint mint                 : (address, int)          => unit
    //stateful entrypoint swap                 : ()                      => unit
    //entrypoint check_swap                    : (address)               => int
    //entrypoint swapped                       : ()                      => map(address, int)
  `;

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <div>
          <Image src={title} />
        </div>
        <div className={styles.æternity}>
          <Image src={aeternity} />
        </div>
        <p className={styles.about}>
          We have built a collection of DeFi Smart-Contracts for æternity chain
        </p>

        <h1 className={styles.contract}>Contracts</h1>
        <hr className={styles.hr} />
        <p id="lending" className={styles.contract}>
          Lending Contract
        </p>

        <span className={styles.features}>
          <ul>
            <li>Create a pool contract that accepts deposit from lenders and borrow money to the borrowers</li>
            <li>Lenders can lend any amount of money and earn some interest for it.</li>
            <li>User or borrower can borrow some amount of tokens (limited) , and pay back with interest for some time period.</li>
            <li>Interest is calculated according the interest rate and borrowing time peroid</li>
            <li>Lender can withdraw the amount later with extra interest earning</li>
            <li>Other functions can be called to determine the balance at any point of time , and the rewards earned</li>
          </ul>
        </span>
        <button className={styles.button}>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/Mystical94/defi_AEternity/blob/main/contracts/LendingPool.aes"
            className={styles.navlink}
          >
            View on GitHub ↗
          </a>
        </button>
        <span className={styles.code}>
          <pre className="line-numbers">
            <code className="language-jsx">{lending}</code>
          </pre>
        </span>

        <p id="staking" className={styles.contract}>
          Staking Contract
        </p>
         <span className={styles.features}>
         <ul>
            <li>Rewards user for staking their tokens in the contract</li>
            <li>User can withdraw and deposit at an point of time</li>
            <li>Tokens Earned can be withdrawed any time</li>
            <li>
              Rewards are calculated with reward rate and time period staked for
            </li>
            <li>
              The balance and reward earned can be checked at any point of time
            </li>
          </ul>
        </span>
        <button className={styles.button}>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/Mystical94/defi_AEternity/blob/main/contracts/Staking.aes"
            className={styles.navlink}
          >
            View on GitHub ↗
          </a>
        </button>

        <span className={styles.code}>
          <pre className="line-numbers">
            <code className="language-jsx">{staking}</code>
          </pre>
        </span>

        <p id="vault" className={styles.contract}>
          Vault Contract
        </p>
         <span className={styles.features}>
         <ul>
            <li> Sharing of Yield For the no. of shares owned</li>
            <li>User can deposit their money</li>
            <li>Some shares are minted according to the value deposited</li>
            <li>Vault generate some yield by a puropose and the value of share increases</li>
            <li>user can withdraw the amount by burning those share at any point of time .</li>
          </ul>
          
        </span>
        <button className={styles.button}>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/Mystical94/defi_AEternity/blob/main/contracts/Vault.aes"
            className={styles.navlink}
          >
            View on GitHub ↗
          </a>
        </button>
        <span className={styles.code}>
          <pre className="line-numbers">
            <code className="language-jsx">{vault}</code>
          </pre>
        </span>

        <p id="vault" className={styles.contract}>
          More Contracts Coming Soon...So Stay Tuned 😉
        </p>
        <p id="vault" className={styles.contract}>
          æternity assemble
        </p>
      </main>
    </div>
  );
}
