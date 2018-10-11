pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "zos-lib/contracts/migrations/Migratable.sol";
import "./Crucible.sol";

contract Foundry is Migratable, Ownable {
  address[] public crucibles;

  event CrucibleCreated(address contractAddress);
  event CrucibleDeleted(address contractAddress);

  function initialize(address _owner) isInitializer("Foundry", "0") public {
    if (_owner == address(0x0)) {
      owner = msg.sender;
    } else {
      owner = _owner;
    }
  }

  // total number of Crucibles produced by the Foundry
  function getCount()
    external
    view
    returns(uint)
  {
    return crucibles.length;
  }

  // find the index of a crucible in the list
  function getIndexOf(address _crucible)
    external
    view
    returns(uint)
  {
    for (uint i = 0; i < crucibles.length; i++) {
      if (crucibles[i] == _crucible) {
        return i;
      }
    }

    require(false, "crucible doesn't exist");
  }

  // deploy a new crucible and add it to crucibles
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

  // Delete a crucible from the list, but shuffle the list so there are
  // no empty slots.
  function deleteCrucible(address _address, uint _index) external onlyOwner {
    require(crucibles.length > 0, "crucible list isn't empty");
    require(crucibles[_index] == _address, "index doesn't match address");
    crucibles[_index] = crucibles[crucibles.length - 1];
    crucibles.length--;
    emit CrucibleDeleted(_address);
  }

}
