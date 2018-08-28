pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Crucible.sol";

contract Foundry is Ownable {
  address[] public crucibles;

  constructor() public {
    owner = msg.sender;
  }

  function kill() external onlyOwner {
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
  function newCrucible(address _owner, string _name, uint _startDate, uint _closeDate, uint _endDate, uint256 _minimumAmount) public returns(address)
  {
    Crucible crucible = new Crucible(
      _owner, _name, _startDate, _closeDate, _endDate, _minimumAmount
    );
    crucibles.push(crucible);
    emit CrucibleCreated(crucible);
    return crucible;
  }

  event CrucibleCreated(address contractAddress);
}
