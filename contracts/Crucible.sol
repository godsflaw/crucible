pragma solidity ^0.4.15;

import 'openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

contract Crucible is StandardToken {
  address public owner;
  string public name = 'TireFireToken';
  string public symbol = 'TFT';
  // 100,000 total tokens, with 2 points of precision
  uint public decimals = 2;
  uint public INITIAL_SUPPLY = 10000000;

  constructor() public {
    owner = msg.sender;
    totalSupply_ = INITIAL_SUPPLY;
    balances[owner] = INITIAL_SUPPLY;
  }
}
