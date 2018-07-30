pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

contract Crucible {
  address public owner;
  string public name;
//  ufixed16x8 public fee;

  constructor(string _name) public {
    owner = msg.sender;
    name = _name;
//    fee = _fee;
  }
}
