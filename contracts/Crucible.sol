pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract Crucible is Ownable {
  string public name;
  uint public startDate;
  uint public lockDate;
  uint public endDate;
  uint256 public minimumAmount;
  address[] public participants;
  mapping (address => Commitment) public commitments;
  CrucibleState public state;

  enum CrucibleState {
    OPEN,
    LOCKED,
    FINISHED
  }

  enum GoalState {
    WAITING,
    PASS,
    FAIL
  }

  struct Commitment {
    bool exists;
    // TODO(godsflaw): add _beneficiary for the case where money goes to enemy
    uint256 amount;
    GoalState metGoal;
  }

  constructor(address _owner, string _name, uint _startDate, uint _lockDate, uint _endDate, uint256 _minimumAmount) public {
    name = _name;

    if (_owner == address(0x0)) {
      owner = msg.sender;
    } else {
      owner = _owner;
    }

    require(
      _startDate < _lockDate && _lockDate < _endDate,
      "startDate must be < lockDate and lockDate must be < endDate"
    );

    startDate = _startDate;
    lockDate = _lockDate;
    endDate = _endDate;

    require(_minimumAmount > 0, "minimumAmount must be > 0");

    minimumAmount = _minimumAmount;
    state = CrucibleState.OPEN;
  }

  function participantExists(address _participant) public constant returns(bool) {
    return commitments[_participant].exists;
  }

  function count()
    public
    constant
    returns(uint)
  {
    return participants.length;
  }

  function kill() external onlyOwner {
    // TODO(godsflaw): call finish() or distribute funds?
    // TODO(godsflaw): clean up Foundry?
    selfdestruct(owner);
  }

  // add() will allow anyone to add themselves once to the contract.  It will
  // also alow the oracle to add a participant with the same unique constraint.
  function add(address _participant) public payable {
    require(
      minimumAmount <= msg.value, "value must be at least minimumAmount"
    );

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

  function setGoal(address _participant, bool _metGoal) public onlyOwner {
    require(
      state == CrucibleState.LOCKED, "can only setGoal when in locked state"
    );

    require(
      participantExists(_participant) == true, "participant doesn't exist"
    );

    if (_metGoal) {
      commitments[_participant].metGoal = GoalState.PASS;
    } else {
      commitments[_participant].metGoal = GoalState.FAIL;
    }

    // TODO(godsflaw): add state change event here
  }

  function lock() public {
    require(lockDate <= now, 'can only lock after lockDate');
    require(state == CrucibleState.OPEN, 'can only lock if in OPEN state');
    state = CrucibleState.LOCKED;

    // TODO(godsflaw): add state change event here
  }

  function finish() public onlyOwner {
    if (state == CrucibleState.FINISHED) {
      return;
    }

    require(endDate <= now, 'can only finish after endDate');
    require(state == CrucibleState.LOCKED, 'can only finish if in LOCKED state');

    // TODO(godsflaw): call distribution function

    state = CrucibleState.FINISHED;
    // TODO(godsflaw): add state change event here
  }

}
