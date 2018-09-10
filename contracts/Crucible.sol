pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract Crucible is Ownable {
  using SafeMath for uint256;

  string public name;
  bool public processedWaiting = false;   // TODO(godsflaw): test in constructor
  bool public processedFailed = false;    // TODO(godsflaw): test in constructor
  bool public processedFeePayout = false; // TODO(godsflaw): test in constructor
  uint public startDate;
  uint public lockDate;
  uint public endDate;
  uint public timeout = 2419200;          // TODO(godsflaw): put in constructor
  uint256 public minimumAmount;
  uint256 public penalty = 0;
  uint256 public released = 0;
  uint256 public feeNumerator = 100;      // TODO(godsflaw): put in constructor
  uint256 public feeDenominator = 1000;   // TODO(godsflaw): put in constructor
  CrucibleState public state = CrucibleState.OPEN;

  address[] public participants;
  mapping (address => Commitment) public commitments;

  enum CrucibleState {
    OPEN,
    LOCKED,
    JUDGEMENT,
    FINISHED,
    PAID,
    BROKEN
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

  event FundsReceived(address fromAddress, uint256 amount);
  event CrucibleStateChange(CrucibleState fromState, CrucibleState toState);
  event CommitmentStateChange(
    address participant, GoalState fromState, GoalState toState
  );

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

    // TODO(godsflaw): check initial balance.  Attackers can send ETH to a
    // contract address before the constructor is called.  Just make sure we
    // don't already have a balance and adjust accordingly.
  }

  function () external payable {
    emit FundsReceived(msg.sender, msg.value);
  }

  // TODO(godsflaw): test this
  function kill() external onlyOwner {
    if (state == CrucibleState.PAID) {
      // TODO(godsflaw): clean up Foundry?
      selfdestruct(owner);
    }
  }

  // TODO(godsflaw): test this
  function _markPaidIfPaid() internal returns (bool) {
    bool isPaid = true;

    for (uint256 i = 0; i < participants.length; i++) {
      if (commitments[participants[i]].amount > 0) {
        isPaid = false;
        break;
      }
    }

    if (isPaid) {
      state = CrucibleState.PAID;
      emit CrucibleStateChange(CrucibleState.FINISHED, CrucibleState.PAID);
      return true;
    } else {
      return false;
    }
  }

  // TODO(godsflaw): test this
  function _processFailed() internal {
    if (processedFailed) {
      return;
    }

    for (uint i = 0; i < participants.length; i++) {
      address participant = participants[i];

      // calculate penalty by taking the risked amount from those that failed
      if (commitments[participant].amount > 0 &&
          commitments[participant].metGoal == GoalState.FAIL) {
        commitments[participant].amount = 0;
        penalty = penalty.add(commitments[participant].amount);
      }
    }

    processedFailed = true;
  }

  // TODO(godsflaw): test this
  function _processFeePayout() internal {
    require(processedFailed, "_processFailed() must complete first");

    if (processedFeePayout) {
      return;
    }

    uint256 payment = penalty.mul(feeNumerator).div(feeDenominator);
    penalty = penalty.sub(payment);

    if (payment == 0 || owner.send(payment)) {
      processedFeePayout = true;
    }
  }

  // TODO(godsflaw): test this
  function _processPayouts(uint _startIndex, uint _records) internal {
    require(processedFailed, "_processFailed() must complete first");
    require(processedFeePayout, "_processedFeePayout() must complete first");

    // bound check and normalize _start
    if (_startIndex >= participants.length) {
      _startIndex = participants.length - 1;
    }

    // bound check and normalize _records
    if ((_startIndex + _records) > participants.length) {
      _records = participants.length - _startIndex;
    }

    for (uint i = _startIndex; i < (_startIndex + _records); i++) {
      address participant = participants[i];

      // try to reward everyone that passed the crucible
      if (commitments[participant].amount > 0 ) {
        if (commitments[participant].metGoal == GoalState.PASS ||
            commitments[participant].metGoal == GoalState.WAITING) {

          uint256 totalFunds = address(this).balance.add(released);

          uint256 bonus = penalty
            .mul(commitments[participant].amount)
            .div(totalFunds);

          uint256 payment = commitments[participant].amount.add(bonus);

          if (participant.send(payment)) {
            released = released.add(payment);
            commitments[participant].amount = 0;
          }

        }
      }
    }
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

    commitments[_participant] = Commitment({
      exists: true,
      amount: msg.value,
      metGoal: GoalState.WAITING
    });
    participants.push(_participant);

    // TODO(godsflaw): test this
    emit FundsReceived(_participant, msg.value);
  }

  function setGoal(address _participant, bool _metGoal) public onlyOwner {
    require(
      state == CrucibleState.LOCKED || state == CrucibleState.JUDGEMENT,
      "can only setGoal when in LOCKED or JUDGEMENT state"
    );

    require(
      participantExists(_participant) == true, "participant doesn't exist"
    );

    if (_metGoal) {
      commitments[_participant].metGoal = GoalState.PASS;
    } else {
      commitments[_participant].metGoal = GoalState.FAIL;
    }

    emit CommitmentStateChange(
      _participant, GoalState.WAITING, commitments[_participant].metGoal
    );
  }

  // TODO(godsflaw): test this
  function broken() public {
    require(
      endDate <= (now + timeout),
      'can only moved to BROKEN state timeout past endDate'
    );

    CrucibleState currentState = state;
    state = CrucibleState.BROKEN;

    emit CrucibleStateChange(currentState, CrucibleState.BROKEN);
  }

  function lock() public {
    require(lockDate <= now, 'can only moved to LOCKED state after lockDate');
    require(state == CrucibleState.OPEN, 'state can only move OPEN -> LOCKED');

    state = CrucibleState.LOCKED;

    emit CrucibleStateChange(CrucibleState.OPEN, CrucibleState.LOCKED);
  }

  function judgement() public onlyOwner {
    require(endDate <= now, 'can only moved to JUDGEMENT state after endDate');
    require(
      state == CrucibleState.LOCKED, 'state can only move JUDGEMENT -> LOCKED'
    );

    state = CrucibleState.JUDGEMENT;

    emit CrucibleStateChange(CrucibleState.LOCKED, CrucibleState.JUDGEMENT);
  }

  function finish() public onlyOwner {
    require(
      state == CrucibleState.JUDGEMENT,
      'state can only move JUDGEMENT -> FINISHED'
    );

    // Set all WAITING commitments to PASS.  This solves the problem of an
    // oracle not setting the state for a participant.  If the oracle does not
    // set the state, we will not penalize the participant.  That is, by default
    // if one has made it trough the judgement state and still has no PASS/FAIL
    // status, the contract will assume the participant passed.  This also means
    // oracles need only concern themselves with setting the goal status of
    // participants that failed the crucible.
    for (uint i = 0; i < participants.length; i++) {
      address participant = participants[i];
      if (commitments[participant].metGoal == GoalState.WAITING) {
        setGoal(participant, true);
      }
    }

    state = CrucibleState.FINISHED;
    emit CrucibleStateChange(CrucibleState.JUDGEMENT, CrucibleState.FINISHED);
  }

  // TODO(godsflaw): test this
  // payout() will process as many records in participants[] as specified and
  // refund or payout that many records.  This method may be called many times,
  // and will eventually move the crucible to the PAID state.
  function payout(uint _startIndex, uint _records) public {
    require(
      state == CrucibleState.FINISHED, 'can only payout if in FINISHED state'
    );
    require(_records > 0, 'cannot request 0 records');

    // The following functions only ever run once, but must run over the entire
    // set of commitments so we have the correct values for payouts.
    _processFailed();
    _processFeePayout();

    // this function will process payouts for a range of commitments.
    _processPayouts(_startIndex, _records);

    // check if we can move this crucible into the PAID state
    _markPaidIfPaid();
  }

  // TODO(godsflaw): implement a BROKEN state that allows withdrawl.
  //   this state should be available a month after endDate and probably
  //   means the oracle failed to do its job.
  // TODO(godsflaw): implement and test pull withdraw in BROKEN state
}
