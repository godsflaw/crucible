pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract Crucible is Ownable {
  using SafeMath for uint256;

  string public name;
  uint public startDate;
  uint public lockDate;
  uint public endDate;
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
    FINISHED,
    PAID
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

  // TODO(godsflaw): test this
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
      emit CrucibleStateChange(CrucibleState.OPEN, CrucibleState.PAID);
      return true;
    } else {
      return false;
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

    // TODO(godsflaw): test this
    emit CommitmentStateChange(
      _participant, GoalState.WAITING, commitments[_participant].metGoal
    );
  }

  function lock() public {
    require(lockDate <= now, 'can only lock after lockDate');
    require(state == CrucibleState.OPEN, 'can only lock if in OPEN state');

    // TODO(godsflaw): test this (event emit)
    state = CrucibleState.LOCKED;
    emit CrucibleStateChange(CrucibleState.OPEN, CrucibleState.LOCKED);
  }

  function finish() public onlyOwner {
    if (state == CrucibleState.FINISHED) {
      return;
    }

    require(endDate <= now, 'can only finish after endDate');
    require(state == CrucibleState.LOCKED, 'can only finish if in LOCKED state');

    state = CrucibleState.FINISHED;

    // TODO(godsflaw): test this
    emit CrucibleStateChange(CrucibleState.LOCKED, CrucibleState.FINISHED);
  }

  // TODO(godsflaw): test this
  // payout() will process as many records in participants[] as specified and
  // refund, penalize, or payout that many records.  This function can be called
  // many times, and will eventually put the contract in the PAID state.
  function payout(uint _startIndex, uint _records) public {
    require(state == CrucibleState.FINISHED, 'can only payout if in FINISHED state');
    require(_records == 0, 'cannot request 0 records');

    uint i;
    uint256 reserve = 0;
    address participant;

    // bound check and normalize _start
    if (_startIndex >= participants.length) {
      _startIndex = participants.length - 1;
    }

    // bound check and normalize _records
    if ((_startIndex + _records) > participants.length) {
      _records = participants.length - _startIndex;
    }

    for (i = _startIndex; i < (_startIndex + _records); i++) {
      participant = participants[i];

      if (commitments[participant].amount > 0) {

        // try to refund commitments that were never judged as PASS/FAIL
        if (commitments[participant].metGoal == GoalState.WAITING) {
          if (participant.send(commitments[participant].amount)) {
            commitments[participant].amount = 0;
          } else {
            reserve = reserve.add(commitments[participant].amount);
          }
        }

        // calculate penalty by taking the risked amount from those that failed
        if (commitments[participant].metGoal == GoalState.FAIL) {
            penalty = penalty.add(commitments[participant].amount);
            commitments[participant].amount = 0;
        }

      }
    }

    // TODO(godsflaw): figure out what to do with the remainder
    uint256 pentaltyAmount = penalty.mul(feeNumerator).div(feeDenominator);
    penalty = penalty.sub(pentaltyAmount);

    for (i = _startIndex; i < (_startIndex + _records); i++) {
      participant = participants[i];

      // try to reward everyone that passed the crucible
      if (commitments[participant].amount > 0 &&
          commitments[participant].metGoal == GoalState.PASS) {
        uint256 totalFunds = address(this).balance
          .add(released)
          .sub(
            reserve.add(pentaltyAmount)
          );
        uint256 bonus = penalty
          .mul(commitments[participant].amount)
          .div(totalFunds);
        uint256 payment = commitments[participant].amount.add(bonus);

        if (participant.send(payment)) {
          released = released.add(payment);
          commitments[participant].amount = 0;
        } else {
          reserve = reserve.add(commitments[participant].amount);
        }
      }
    }

    _markPaidIfPaid();
  }

  // TODO(godsflaw): implement and test pull withdraw
}
