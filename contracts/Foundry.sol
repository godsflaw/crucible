pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Crucible.sol";

contract Foundry is Ownable {
  address[] public crucibles;

  event CrucibleCreated(address contractAddress);

  constructor() public {
    owner = msg.sender;
  }

  function kill() external onlyOwner {
    selfdestruct(owner);
  }

  // total number of Crucibles produced by the Foundry
  function getCount()
    external
    view
    returns(uint)
  {
    return crucibles.length;
  }

  // deploy a new crucible
  function newCrucible(
    address _owner,
    address _beneficiary,
    uint _startDate,
    uint _lockDate,
    uint _endDate,
    uint256 _minimumAmount,
    uint _timeout,
    uint256 _feeNumerator
  ) external returns(address) {

    Crucible crucible = new Crucible(
      _owner,
      _beneficiary,
      _startDate,
      _lockDate,
      _endDate,
      _minimumAmount,
      _timeout,
      _feeNumerator
    );
    crucibles.push(crucible);
    emit CrucibleCreated(crucible);
    return crucible;
  }

}
