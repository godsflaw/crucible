pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract Crucible is Ownable {
  using SafeMath for uint256;

  address public beneficiary;
  bool public calculateFee = false;
  bool public feePaid = false;
  bool public penaltyPaid = false;
  uint public startDate;
  uint public lockDate;
  uint public endDate;
  uint public timeout = 2419200;          // 28 days in seconds
  uint256 public minimumAmount;
  uint256 public passCount = 0;
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
    BROKEN,
    KILLED
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
  event PenaltySent(address recipient, uint256 amount);
  event PaymentSent(address recipient, uint256 amount);
  event RefundSent(address recipient, uint256 amount);
  event FundsReceived(address fromAddress, uint256 amount);
  event FundsReceivedPayable(address fromAddress, uint256 amount);
  event CrucibleStateChange(CrucibleState fromState, CrucibleState toState);
  event CommitmentStateChange(
    address participant, GoalState fromState, GoalState toState
  );

  constructor(address _owner, address _beneficiary, uint _startDate, uint _lockDate, uint _endDate, uint256 _minimumAmount, uint _timeout, uint256 _feeNumerator) public {
    if (_owner == address(0x0)) {
      owner = msg.sender;
    } else {
      owner = _owner;
    }

    // set this if the penalty should be sent to a third party and not the pool
    beneficiary = _beneficiary;

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
    // balance, we will just shunt that into penalty when lock() runs.  This
    // means that the funds that already exist become a bonus for participants.
  }

  modifier notInState(CrucibleState _state) {
      require(
          state != _state,
          "Function cannot be called at this time."
      );
      _;
  }

  modifier inState(CrucibleState _state) {
      require(
          state == _state,
          "Function cannot be called at this time."
      );
      _;
  }

  modifier inEitherState(CrucibleState _stateA, CrucibleState _stateB) {
      require(
          state == _stateA || state == _stateB,
          "Function cannot be called at this time."
      );
      _;
  }

  function () external payable inState(CrucibleState.OPEN) {
    require(msg.data.length == 0);

    // The oracle is encouraged to listen for FundsReceivedPayable and either
    // add the user to the crucible by calling add() or wait until LOCKED, when
    // additional funds will be moved to penalty.
    emit FundsReceivedPayable(msg.sender, msg.value);
  }

  function kill() external onlyOwner {
    if (state == CrucibleState.PAID) {
      emit CrucibleStateChange(state, CrucibleState.KILLED);
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

    // if we have no beneficiary, and no participants pass,
    // then fee is the entire balance.
    if (passCount == 0 && !(hasBeneficiary())) {
      fee = penalty;
    } else {
      fee = penalty.mul(feeNumerator).div(feeDenominator);
    }

    penalty = penalty.sub(fee);

    calculateFee = true;
  }

  function _processPayouts(uint _startIndex, uint _records) internal {
    uint256 bonus;

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

          if (hasBeneficiary()) {
            // the entire penalty goes to the beneficiary
            bonus = 0;
          } else {
            // calculate a pooled bonus
            bonus = penalty
              .mul(commitments[participant].amount)
              .div(totalFunds);
          }

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

  //TODO(godsflaw): test this
  function canPayFee() public view returns(bool) {
    return (!(feePaid) && fee > 0 && address(this).balance >= fee);
  }

  //TODO(godsflaw): test this
  function hasBeneficiary() public view returns(bool) {
    return (beneficiary != address(0x0));
  }

  //TODO(godsflaw): test this
  function canPayBeneficiary() public view returns(bool) {
    return (
      hasBeneficiary() &&
      !(penaltyPaid) &&
      penalty > 0 &&
      address(this).balance >= penalty
    );
  }

  function count() external view returns(uint) {
    return participants.length;
  }

  // add() will allow anyone to add themselves once to the contract.  It will
  // also alow the oracle to add a participant with the same unique constraint.
  function add(address _participant)
    external
    payable
    inState(CrucibleState.OPEN) {

    require(
      minimumAmount <= msg.value, "value must be at least minimumAmount"
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

  function setGoal(address _participant, bool _metGoal)
    external
    onlyOwner
    inEitherState(CrucibleState.LOCKED, CrucibleState.JUDGEMENT) {

    require(
      participantExists(_participant) == true, "participant doesn't exist"
    );

    require(
      commitments[_participant].metGoal == GoalState.WAITING,
      "participant already set"
    );

    uint256 amount = commitments[_participant].amount;

    if (_metGoal) {
      passCount++;
      commitments[_participant].metGoal = GoalState.PASS;
    } else {
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

  function lock() external inState(CrucibleState.OPEN) {
    require(lockDate <= now, 'can only moved to LOCKED state after lockDate');

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

  function judgement() external inState(CrucibleState.LOCKED) {
    require(endDate <= now, 'can only moved to JUDGEMENT state after endDate');

    state = CrucibleState.JUDGEMENT;
    emit CrucibleStateChange(CrucibleState.LOCKED, CrucibleState.JUDGEMENT);
  }

  function finish() external onlyOwner inState(CrucibleState.JUDGEMENT) {
    state = CrucibleState.FINISHED;
    emit CrucibleStateChange(CrucibleState.JUDGEMENT, CrucibleState.FINISHED);
  }

  function paid()
    public
    inEitherState(CrucibleState.FINISHED, CrucibleState.BROKEN) {

    // TODO(godsflaw): apparently, one can still send money to the contract
    // so we need to check our own tracked balance against released.
    if (address(this).balance == 0) {
      CrucibleState currentState = state;
      state = CrucibleState.PAID;
      emit CrucibleStateChange(currentState, CrucibleState.PAID);
    }
  }

  function broken()
    external
     inEitherState(CrucibleState.JUDGEMENT, CrucibleState.FINISHED)
     notInState(CrucibleState.PAID) {

    require(
      (endDate + timeout) <= now,
      'can only moved to BROKEN state timeout seconds past endDate'
    );

    CrucibleState currentState = state;

    state = CrucibleState.BROKEN;
    emit CrucibleStateChange(currentState, CrucibleState.BROKEN);
  }

  // payout() will process as many records in participants[] as specified and
  // payout that many records.  This method may be called many times, and may
  // eventually move the crucible to the PAID state.
  function payout(uint _startIndex, uint _records)
    public
    inEitherState(CrucibleState.FINISHED, CrucibleState.BROKEN) {

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


  // collectFee() will payout any fees to _destination and any penalty to
  // the beneficiary if appropriate.  This method may be called many times, and
  // may eventually move the crucible to the PAID state.
  function collectFee(address _destination)
    external
    onlyOwner
    inEitherState(CrucibleState.FINISHED, CrucibleState.BROKEN) {

    _calculateFee();

    // send the fee payment off if there is one
    if (canPayFee() && _destination.send(fee)) {
      released = released.add(fee);
      feePaid = true;
      emit FeeSent(_destination, fee);
    }

    // send the beneficiary payment off if there is one
    if (canPayBeneficiary() && beneficiary.send(penalty)) {
      released = released.add(penalty);
      penaltyPaid = true;
      emit PenaltySent(beneficiary, penalty);
    }

    // possibly move to the paid state
    paid();
  }
}
