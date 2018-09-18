pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract Crucible is Ownable {
  using SafeMath for uint256;

  string public name;
  bool public calculateFee = false;
  bool public feePaid = false;
  uint public startDate;
  uint public lockDate;
  uint public endDate;
  uint public timeout = 2419200;          // 28 days in seconds
  uint256 public minimumAmount;
  uint256 public failedCount = 0;
  uint256 public penalty = 0;
  uint256 public fee = 0;
  uint256 public released = 0;
  uint256 public reserve = 0;
  uint256 public feeNumerator = 100;
  uint256 public feeDenominator = 1000;
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
    uint256 amount;
    GoalState metGoal;
  }

  // event Debug(string msg, uint256 data);
  event FeeSent(address recipient, uint256 amount);
  event PaymentSent(address recipient, uint256 amount);
  event RefundSent(address recipient, uint256 amount);
  event FundsReceived(address fromAddress, uint256 amount);
  event FundsReceivedPayable(address fromAddress, uint256 amount);
  event CrucibleStateChange(CrucibleState fromState, CrucibleState toState);
  event CommitmentStateChange(
    address participant, GoalState fromState, GoalState toState
  );

  constructor(address _owner, string _name, uint _startDate, uint _lockDate, uint _endDate, uint256 _minimumAmount, uint _timeout, uint256 _feeNumerator) public {
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
    feeNumerator = _feeNumerator;

    // This is the time before the crucible can be moved into the broken state.
    // Ensure that there is plenty of time after endDate before timeout.  We
    // do this by requiring timeout to be at least as long as the time between
    // startDate and endDate.
    require(
      _timeout >= (_endDate - _startDate),
      "timeout must be >= (endDate - startDate) seconds"
    );

    timeout = _timeout;

    require(_minimumAmount > 0, "minimumAmount must be > 0");

    minimumAmount = _minimumAmount;

    // It sounds strange, but even if an address doesn't exist yet, it can
    // have a balance.  If the address this contract lands on already has a
    // balance, we will just shunt that into penalty as a bonus to be
    // distributed to participants later on.
    penalty = address(this).balance;
  }

  function () external payable {
    require(
      state == CrucibleState.OPEN,
      'crucible only accepts funds while state is OPEN'
    );

    // The oracle is encouraged to listen for FundsReceivedPayable and either
    // add the user to the crucible by calling add() or wait until LOCKED, when
    // additional funds will be moved to penalty.
    emit FundsReceivedPayable(msg.sender, msg.value);
  }

  // TODO(godsflaw): test this
  function kill() external onlyOwner {
    if (state == CrucibleState.PAID) {
      // TODO(godsflaw): clean up Foundry?
      selfdestruct(owner);
    }
  }

  // This function calculates the fee for the oracle.  It should be noted
  // that this relationship with the oracle requires complete trust.  The
  // oracle can mark every commitment as FAILed and take the fee.  This
  // function can only run once.
  function _calculateFee() internal {
    if (calculateFee) {
      return;
    }

    // if we have participants and all failed, then fee is the entire balance
    if (failedCount == participants.length) {
      fee = address(this).balance;
    } else {
      fee = penalty.mul(feeNumerator).div(feeDenominator);
    }

    if (fee == 0) {
      feePaid = true;
    } else {
      penalty = penalty.sub(fee);
    }

    calculateFee = true;
  }

  function _processPayouts(uint _startIndex, uint _records) internal {
    for (uint i = _startIndex; i < (_startIndex + _records); i++) {
      address participant = participants[i];

      if (commitments[participant].amount > 0) {
        if (commitments[participant].metGoal == GoalState.PASS) {
          // Reward everyone that passed the crucible.  This code sends back
          // the participant's risked amount, plus pays out a bonus that is a
          // preportional slice of the sum of all the failed participants less
          // the oracle fee.  If the payout fails, no harm, it can be processed
          // again as the risked balance is still > 0.  Worst case, the
          // crucible gets marked as BROKEN, and the participant can call the
          // withdrawl function to get their risked amount back.
          uint256 totalFunds = address(this).balance
            .add(released)
            .sub(reserve)
            .sub(fee.add(penalty));

          uint256 bonus = penalty
            .mul(commitments[participant].amount)
            .div(totalFunds);

          uint256 payment = commitments[participant].amount.add(bonus);

          // The gas stipend should stop re-entrancy.
          if (participant.send(payment)) {
            released = released.add(payment);
            emit PaymentSent(participant, payment);
            commitments[participant].amount = 0;
          }
        } else if (commitments[participant].metGoal == GoalState.WAITING) {
          // Refund all WAITING commitments since we never got a PASS/FAIL.
          // This is because the oracle likely never reported on the commitment.
          // Either the oralce knows about it and didn't report, or the
          // participant added themselves in such a way that the oracle doesn't
          // know about them.  In the former case we should not FAIL the
          // commitment, after all the participant may have done the work.
          // However, if we assume that and default to PASS an attacker could
          // add a ton of commitments that the oracle doesn't know about, get
          // a default PASS, and then share in the profits while doing none of
          // the work.  If the oracle has not marked the commitment PASS or
          // FAIL at this point, we should make no assumptions and just refund
          // the participant.  If the participant is honest and did the work,
          // they would at least expect their risked commitment returned, and
          // if the participant is an attacker, they simply won't be counted in
          // the total or profit, thus denying influence or reward of the bonus.
          // The gas stipend should stop re-entrancy.
          if (participant.send(commitments[participant].amount)) {
            reserve = reserve.sub(commitments[participant].amount);
            emit RefundSent(participant, commitments[participant].amount);
            commitments[participant].amount = 0;
          }
        }
      }
    }
  }

  function participantExists(address _participant) public view returns(bool) {
    return commitments[_participant].exists;
  }

  function count() public view returns(uint) {
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

    reserve = reserve.add(commitments[_participant].amount);

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

    uint256 amount = commitments[_participant].amount;

    if (_metGoal) {
      commitments[_participant].metGoal = GoalState.PASS;
    } else {
      failedCount++;
      commitments[_participant].metGoal = GoalState.FAIL;
      penalty = penalty.add(amount);
      commitments[_participant].amount = 0;
    }

    // in either case, we can move this participant's balance from reserve
    reserve = reserve.sub(amount);

    emit CommitmentStateChange(
      _participant, GoalState.WAITING, commitments[_participant].metGoal
    );
  }

  function lock() public {
    require(lockDate <= now, 'can only moved to LOCKED state after lockDate');
    require(state == CrucibleState.OPEN, 'state can only move OPEN -> LOCKED');

    // Reserve should perfectly match the crucible balance.  Move any amount
    // from balance that is greater than the reserve from balance to penalty.
    // This handles both the case where the contract address already had a
    // balance, and the case where money is sent directly to the contract but
    // the oracle chose not to spend their own funds and add() it.
    if (address(this).balance > reserve) {
      uint256 delta = address(this).balance.sub(reserve);
      penalty = penalty.add(delta);
    }

    state = CrucibleState.LOCKED;
    emit CrucibleStateChange(CrucibleState.OPEN, CrucibleState.LOCKED);
  }

  function judgement() public {
    require(endDate <= now, 'can only moved to JUDGEMENT state after endDate');
    require(
      state == CrucibleState.LOCKED, 'state can only move LOCKED -> JUDGEMENT'
    );

    state = CrucibleState.JUDGEMENT;
    emit CrucibleStateChange(CrucibleState.LOCKED, CrucibleState.JUDGEMENT);
  }

  function finish() public onlyOwner {
    require(
      state == CrucibleState.JUDGEMENT,
      'state can only move JUDGEMENT -> FINISHED'
    );

    state = CrucibleState.FINISHED;
    emit CrucibleStateChange(CrucibleState.JUDGEMENT, CrucibleState.FINISHED);
  }

  // TODO(godsflaw): test this
  function paid() public {
    require(
      state == CrucibleState.FINISHED || state == CrucibleState.BROKEN,
      'state can only move (FINISHED | BROKEN) -> PAID'
    );

    // Check if we can move this crucible into the PAID state.  If balance is
    // 0 this is fairly straight forward; however, the oracle may not have
    // taken the fee yet.  If this is the last thing pending, which is what
    // the logic in this condition is checking for, then we will move to the
    // PAID state so that the contract can be killed and and let selfdestruct()
    // return the fee to the owner.
    if (address(this).balance == 0 ||
       (!(feePaid) && address(this).balance == fee)) {
      CrucibleState currentState = state;
      state = CrucibleState.PAID;
      emit CrucibleStateChange(currentState, CrucibleState.PAID);
    }
  }

  // TODO(godsflaw): test this
  function broken() public {
    require(
      (endDate + timeout) <= now,
      'can only moved to BROKEN state timeout past endDate'
    );
    require(state != CrucibleState.PAID, 'sorry PAID is the final state');

    CrucibleState currentState = state;

    state = CrucibleState.BROKEN;
    emit CrucibleStateChange(currentState, CrucibleState.BROKEN);
  }

  // payout() will process as many records in participants[] as specified and
  // payout that many records.  This method may be called many times, and will
  // eventually move the crucible to the PAID state.
  function payout(uint _startIndex, uint _records) public {
    // TODO(godsflaw): test broken state here
    require(
      state == CrucibleState.FINISHED || state == CrucibleState.BROKEN,
      'can only payout if in FINISHED or BROKEN state'
    );
    require(_records > 0, 'cannot request 0 records');

    // bound check and normalize _start
    if (_startIndex >= participants.length) {
      _startIndex = participants.length - 1;
    }

    // bound check and normalize _records
    if ((_startIndex + _records) > participants.length) {
      _records = participants.length - _startIndex;
    }

    // fee must be calculated before anyone can get paid out
    _calculateFee();

    // this function will process payouts for a range of commitments
    _processPayouts(_startIndex, _records);

    // possibly move to the paid state
    paid();
  }

  // TODO(godsflaw): test me
  function collectFee(address _destination) public onlyOwner {
    require(
      state == CrucibleState.FINISHED ||
      state == CrucibleState.BROKEN ||
      state == CrucibleState.PAID,
      'can only payout if in FINISHED, BROKEN, or PAID state'
    );

    _calculateFee();

    if (!(feePaid) && _destination.send(fee)) {
      released = released.add(fee);
      feePaid = true;
      emit FeeSent(_destination, fee);
    }

    // if not already in the PAID state, possibly move to the paid state
    if (state != CrucibleState.PAID) {
      paid();
    }
  }
}
