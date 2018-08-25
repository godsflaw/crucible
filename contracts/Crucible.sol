pragma solidity ^0.4.24;

contract Crucible {
  address public owner;
  string public name;
  uint public startDate;
  uint public closeDate;
  uint public endDate;
  // uint public minimumEntry;
//  ufixed16x8 public fee;

  constructor(address _owner, string _name, uint _startDate, uint _closeDate, uint _endDate) public {
    name = _name;

    if (_owner == address(0x0)) {
      owner = msg.sender;
    } else {
      owner = _owner;
    }

    require(
      _startDate < _closeDate && _closeDate < _endDate,
      "startDate must be < closeDate and closeDate must be < endDate"
    );

    startDate = _startDate;
    closeDate = _closeDate;
    endDate = _endDate;

//    fee = _fee;
  }

  function kill() external {
    require(msg.sender == owner, "only the owner can kill this contract");
    selfdestruct(owner);
  }
}
