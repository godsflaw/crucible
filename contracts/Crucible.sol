pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract Crucible is Ownable {
  string public name;
  uint public startDate;
  uint public closeDate;
  uint public endDate;
  uint256 public minimumAmount;
  address[] public participants;
  mapping (address => Commitment) public commitments;
  CrucibleState public state;

  enum CrucibleState {
    OPEN,
    CLOSED,
    FINISHED
  }

  enum GoalState {
    WAITING,
    PASS,
    FAIL
  }

  struct Commitment {
    bool exists;
    uint256 amount;
    GoalState metGoal;
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
    state = CrucibleState.OPEN;
  }

  function participantExists(address _participant) public constant returns(bool) {
    return commitments[_participant].exists;
  }

  function kill() external onlyOwner {
    // TODO(godsflaw): this should distribute funds back to participants
    selfdestruct(owner);
  }

  // add() will allow anyone to add themselves once to the contract.  It will
  // also alow the oracle to add a participant with the same unique constraint.
  function add(address _participant) public payable {
    require(
      minimumAmount <= msg.value, "value must be at least minimumAmount"
    );

    // TODO(godsflaw): test this with close()
    require(
      state == CrucibleState.OPEN, "can only add when in the open state"
    );

    require(
      participantExists(_participant) == false, "participant already exists"
    );

    require(
      msg.sender == owner || msg.sender == _participant,
      "participants can only be added by themselves or the contract owner"
    );

    commitments[_participant] = Commitment(true, msg.value, GoalState.WAITING);
    participants.push(_participant);
    // TODO(godsflaw): add event here
  }

  function close() public {
    require(closeDate <= now, 'can only lock after closeDate');
    require(state == CrucibleState.OPEN, 'can only close if in OPEN state');
    state = CrucibleState.CLOSED;
    // TODO(godsflaw): add state change event here
  }

}
