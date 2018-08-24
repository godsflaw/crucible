pragma solidity ^0.4.24;

import "./Crucible.sol";

contract Foundry {
  address public owner;
  address[] public crucibles;

  constructor() public {
    owner = msg.sender;
  }

  function kill() external {
    require(msg.sender == owner, "only the owner can kill this contract");
    selfdestruct(owner);
  }

  // total number of Crucibles produced by the Foundry
  function getCount()
    public
    constant
    returns(uint)
  {
    return crucibles.length;
  }

  // deploy a new crucible
  function newCrucible(address _owner, string _name, uint _startDate, uint _endDate, uint _closeDate)
    public
    returns(address)
  {
    Crucible crucible = new Crucible(_owner, _name, _startDate, _endDate, _closeDate);
    crucibles.push(crucible);
    emit CrucibleCreated(crucible);
    return crucible;
  }

  event CrucibleCreated(address contractAddress);
}
