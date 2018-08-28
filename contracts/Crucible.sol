pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract Crucible is Ownable {
  string public name;
  uint public startDate;
  uint public closeDate;
  uint public endDate;
  uint256 public minimumAmount;
//  ufixed16x8 public fee;
  address[] public participants;
  mapping (address => Commitment) public commitments;

  struct Commitment {
    uint256 amount;
    // TODO(godsflaw): change to ENUM with (waiting, false, true)
    bool metGoal;
  }

  constructor(address _owner, string _name, uint _startDate, uint _closeDate, uint _endDate, uint256 _minimumAmount) public {
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

    require(_minimumAmount > 0, "minimumAmount must be > 0");

    minimumAmount = _minimumAmount;
  }

  function kill() external onlyOwner {
    // TODO(godsflaw): this should distribute funds back to participants
    selfdestruct(owner);
  }

  // TODO(godsflaw): test
  function add(address _participant, uint256 _amount) public onlyOwner {
    require(
      minimumAmount <= _amount, "amount must be at least minimumAmount"
    );
    // TODO(godsflaw): make sure participant doesn't already exist
    // TODO(godsflaw): can only add if state is open
    commitments[_participant] = Commitment(_amount, false);
    participants.push(_participant);
  }

}
