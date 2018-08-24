pragma solidity ^0.4.24;

contract Crucible {
  address public owner;
  string public name;
  uint public startDate;
  uint public endDate;
  uint public closeDate;
//  ufixed16x8 public fee;

  constructor(address _owner, string _name, uint _startDate, uint _endDate, uint _closeDate) public {
    // TODO(godsflaw): think through this
    if (_owner == address(0x0)) {
      owner = msg.sender;
    } else {
      owner = _owner;
    }

    name = _name;
    startDate = _startDate;
    endDate = _endDate;
    closeDate = _closeDate;
//    fee = _fee;
  }

  function kill() external {
    require(msg.sender == owner, "only the owner can kill this contract");
    selfdestruct(owner);
  }
}
