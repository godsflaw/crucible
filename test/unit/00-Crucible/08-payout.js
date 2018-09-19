const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const { expectThrow } = require('../../fixtures/expectThrow');
const { EVMRevert } = require('../../fixtures/EVMRevert');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - payout', async (accounts) => {
  let cu;
  let fee;
  let address;
  let crucible;
  let count = 0;
  let feeNumerator = 100;
  let feeDenominator = 1000;
  let startBalances = {};
  let addTx = {};

  beforeEach(async () => {
    address = new Address();
    cu = new CrucibleUtils(address);

    crucible = await Crucible.new(
      address.oracle,
      'test',
      cu.startDate(),
      cu.lockDate(2),
      cu.endDate(4),
      cu.minAmountWei,
      8,
      cu.feeNumerator,
      { from: address.oracle }
    );

    for (var i = 1; i <= 3; i++) {
      startBalances['user' + i] = await web3.eth.getBalance(address['user' + i]);
      var tx = await cu.add(crucible, 'user' + i);
      addTx['user' + i] = tx;
    }

    feeNumerator = await crucible.feeNumerator();
    feeDenominator = await crucible.feeDenominator();
    fee = cu.riskAmountWei.times(feeNumerator).dividedBy(feeDenominator);
    count = await crucible.count();

    await cu.sleep(2000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
    await cu.sleep(2000);
  });

  afterEach(async () => {
    await crucible.kill({ from: address.oracle });
  });

  it('cannot payout in LOCKED state', async () => {
    await expectThrow(
      crucible.payout.sendTransaction(0, count, { 'from': address.oracle }
    ), EVMRevert);
  });

  it('can payout with participants in PASS, FAIL, and WAITING', async () => {
    var tx;

    // set user2 to FAIL
    tx = await crucible.setGoal.sendTransaction(
      address.user2, false, { 'from': address.oracle }
    );

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // set user1 to PASS
    tx = await crucible.setGoal.sendTransaction(
      address.user1, true, { 'from': address.oracle }
    );

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // NOTE: we left user3 in WAITING state

    // balances before payout
    await cu.assertStartBalances(
      crucible, cu.riskAmountWei, startBalances, addTx
    );

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // The correct fee is was sent to the oracle
    cu.assertEventSent(evdata, 'FeeSent', address.oracle, fee);

    // trigger payout
    tx = await crucible.payout.sendTransaction(
      0, count, { 'from': address.oracle }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // balances after payout
    await cu.assertBalanceZero(crucible);

    // This participant passed, calculate payout
    var bonus = cu.riskAmountWei.minus(fee);
    cu.assertEventSent(
      evdata, 'PaymentSent', address.user1, cu.riskAmountWei.plus(bonus)
    );
    cu.assertUserWalletBalance(
      'user1',
      startBalances['user1']
        .minus(await cu.gasCost(addTx['user1']))
        .plus(
          cu.riskAmountWei.minus(fee)
        ).toNumber()
    );

    // This participant failed, so there was no payout
    cu.assertUserWalletBalance(
      'user2',
      startBalances['user2']
        .minus(await cu.gasCost(addTx['user2']))
        .minus(cu.riskAmountWei)
        .toNumber()
    );

    // This participant was stuck WAITING, so there was a refund
    cu.assertEventSent(evdata, 'RefundSent', address.user3, cu.riskAmountWei);
    cu.assertUserWalletBalance(
      'user3',
      startBalances['user3'].minus(await cu.gasCost(addTx['user3'])).toNumber()
    );

    // We are in the paid state, and got the event
    await cu.assertCrucibleState(
      crucible,
      evdata,
      'CrucibleStateChange',
      cu.crucibleStateIsFinished,
      cu.crucibleStateIsPaid
    );
  });

  it('[regression] payout in reverse WAITING, FAIL, and PASS', async () => {
    var tx;

    // set user3 to PASS
    tx = await crucible.setGoal.sendTransaction(
      address.user3, true, { 'from': address.oracle }
    );

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // set user2 to FAIL
    tx = await crucible.setGoal.sendTransaction(
      address.user2, false, { 'from': address.oracle }
    );

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // NOTE: we left user1 in WAITING state

    // balances before payout
    await cu.assertStartBalances(
      crucible, cu.riskAmountWei, startBalances, addTx
    );

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // The correct fee is was sent to the oracle
    cu.assertEventSent(evdata, 'FeeSent', address.oracle, fee);

    // trigger payout
    tx = await crucible.payout.sendTransaction(
      0, count, { 'from': address.oracle }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // balances after payout
    await cu.assertBalanceZero(crucible);

    // This participant passed, calculate payout
    var bonus = cu.riskAmountWei.minus(fee);
    cu.assertEventSent(
      evdata, 'PaymentSent', address.user3, cu.riskAmountWei.plus(bonus)
    );
    cu.assertUserWalletBalance(
      'user3',
      startBalances['user3']
        .minus(await cu.gasCost(addTx['user3']))
        .plus(
          cu.riskAmountWei.minus(fee)
        ).toNumber()
    );

    // This participant failed, so there was no payout
    cu.assertUserWalletBalance(
      'user2',
      startBalances['user2']
        .minus(await cu.gasCost(addTx['user2']))
        .minus(cu.riskAmountWei)
        .toNumber()
    );

    // This participant was stuck WAITING, so there was a refund
    cu.assertEventSent(evdata, 'RefundSent', address.user1, cu.riskAmountWei);
    cu.assertUserWalletBalance(
      'user1',
      startBalances['user1'].minus(await cu.gasCost(addTx['user1'])).toNumber()
    );

    // We are in the paid state, and got the event
    await cu.assertCrucibleState(
      crucible,
      evdata,
      'CrucibleStateChange',
      cu.crucibleStateIsFinished,
      cu.crucibleStateIsPaid
    );
  });

  it('can payout with participants all in PASS state', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // all participants PASS the crucible
    for (var i = 1; i <= 3; i++) {
      tx = await crucible.setGoal.sendTransaction(
        address['user' + i], true, { 'from': address.oracle }
      );
    }

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // balances before payout
    await cu.assertStartBalances(
      crucible, cu.riskAmountWei, startBalances, addTx
    );

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // no fee to pay
    truffleAssert.eventNotEmitted(evdata, 'FeeSent');

    // trigger payout
    tx = await crucible.payout.sendTransaction(
      0, count, { 'from': address.oracle }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // balances after payout
    await cu.assertBalanceZero(crucible);

    // all participants PASSed, check payout
    for (var i = 1; i <= 3; i++) {
      cu.assertEventSent(
        evdata, 'PaymentSent', address['user' + i], cu.riskAmountWei
      );
      cu.assertUserWalletBalance(
        'user' + i,
        startBalances['user' + i].minus(await cu.gasCost(addTx['user' + i])).toNumber()
      );
    }

    // events NOT emitted
    truffleAssert.eventNotEmitted(evdata, 'RefundSent');

    // We are in the paid state, and got the event
    await cu.assertCrucibleState(
      crucible,
      evdata,
      'CrucibleStateChange',
      cu.crucibleStateIsFinished,
      cu.crucibleStateIsPaid
    );
  });

  it('can payout with participants all in WAITING state', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });
    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // NOTE: we left all participants in the waiting state

    // balances before payout
    await cu.assertStartBalances(
      crucible, cu.riskAmountWei, startBalances, addTx
    );

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // no fee to pay
    truffleAssert.eventNotEmitted(evdata, 'FeeSent');

    // trigger payout
    tx = await crucible.payout.sendTransaction(
      0, count, { 'from': address.oracle }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // balances after payout
    await cu.assertBalanceZero(crucible);

    // all participants are WAITING, check refund
    for (var i = 1; i <= 3; i++) {
      cu.assertEventSent(
        evdata, 'RefundSent', address['user' + i], cu.riskAmountWei
      );
      cu.assertUserWalletBalance(
        'user' + i,
        startBalances['user' + i].minus(await cu.gasCost(addTx['user' + i])).toNumber()
      );
    }

    // events NOT emitted
    truffleAssert.eventNotEmitted(evdata, 'PaymentSent');

    // We are in the paid state, and got the event
    await cu.assertCrucibleState(
      crucible,
      evdata,
      'CrucibleStateChange',
      cu.crucibleStateIsFinished,
      cu.crucibleStateIsPaid
    );
  });

  it('can payout with participants all in FAIL state', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // set all participants to the FAIL state
    for (var i = 1; i <= 3; i++) {
      tx = await crucible.setGoal.sendTransaction(
        address['user' + i], false, { 'from': address.oracle }
      );
    }

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // balances before payout
    await cu.assertStartBalances(
      crucible, cu.riskAmountWei, startBalances, addTx
    );

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // The correct fee is was sent to the oracle
    cu.assertEventSent(
      evdata, 'FeeSent', address.oracle, cu.riskAmountWei.times(3)
    );

    // We are in the paid state, and got the event
    await cu.assertCrucibleState(
      crucible,
      evdata,
      'CrucibleStateChange',
      cu.crucibleStateIsFinished,
      cu.crucibleStateIsPaid
    );

    // trigger payout
    await expectThrow(
      crucible.payout.sendTransaction(0, count, { 'from': address.oracle }
    ), EVMRevert);

    // balances after payout
    await cu.assertBalanceZero(crucible);

    // all three participants failed
    for (var i = 1; i <= 3; i++) {
      cu.assertUserWalletBalance(
        'user' + i,
        startBalances['user' + i]
          .minus(await cu.gasCost(addTx['user' + i]))
          .minus(cu.riskAmountWei)
          .toNumber()
      );
    }
  });

  it('can partial payout with participants in PASS, FAIL, and WAITING', async () => {
    var tx;

    // set user2 to FAIL
    tx = await crucible.setGoal.sendTransaction(
      address.user2, false, { 'from': address.oracle }
    );

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // set user1 to PASS
    tx = await crucible.setGoal.sendTransaction(
      address.user1, true, { 'from': address.oracle }
    );

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // NOTE: we left user3 in WAITING state

    // balances before payout
    await cu.assertStartBalances(
      crucible, cu.riskAmountWei, startBalances, addTx
    );

    // trigger partial payout
    tx = await crucible.payout.sendTransaction(
      0, 1, { 'from': address.user1 }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // This participant passed, calculate payout
    var bonus = cu.riskAmountWei.minus(fee);
    cu.assertEventSent(
      evdata, 'PaymentSent', address.user1, cu.riskAmountWei.plus(bonus)
    );
    cu.assertUserWalletBalance(
      'user1',
      startBalances['user1']
        .minus(await cu.gasCost(addTx['user1']))
        .minus(await cu.gasCost(tx))
        .plus(
          cu.riskAmountWei.minus(fee)
        ).toNumber()
    );

    // events NOT emitted
    truffleAssert.eventNotEmitted(evdata, 'FeeSent');
    truffleAssert.eventNotEmitted(evdata, 'RefundSent');
    truffleAssert.eventNotEmitted(evdata, 'CrucibleStateChange');

    // trigger partial payout
    tx = await crucible.payout.sendTransaction(
      1, 1, { 'from': address.user2 }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // This participant failed, so there was no payout
    cu.assertUserWalletBalance(
      'user2',
      startBalances['user2']
        .minus(await cu.gasCost(addTx['user2']))
        .minus(await cu.gasCost(tx))
        .minus(cu.riskAmountWei)
        .toNumber()
    );

    // events NOT emitted
    truffleAssert.eventNotEmitted(evdata, 'FeeSent');
    truffleAssert.eventNotEmitted(evdata, 'PaymentSent');
    truffleAssert.eventNotEmitted(evdata, 'RefundSent');
    truffleAssert.eventNotEmitted(evdata, 'CrucibleStateChange');

    // trigger partial payout
    tx = await crucible.payout.sendTransaction(
      2, 1, { 'from': address.user3 }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // This participant was stuck WAITING, so there was a refund
    cu.assertEventSent(evdata, 'RefundSent', address.user3, cu.riskAmountWei);
    cu.assertUserWalletBalance(
      'user3',
      startBalances['user3']
        .minus(await cu.gasCost(addTx['user3']))
        .minus(await cu.gasCost(tx))
        .toNumber()
    );

    // events NOT emitted
    truffleAssert.eventNotEmitted(evdata, 'PaymentSent');
    truffleAssert.eventNotEmitted(evdata, 'FeeSent');

    // We are in the paid state, and got the event
    await cu.assertCrucibleState(
      crucible,
      evdata,
      'CrucibleStateChange',
      cu.crucibleStateIsFinished,
      cu.crucibleStateIsPaid
    );

    // balances after payout
    await cu.assertUserBalances(crucible, 0);
    await cu.assertContractBalance(crucible, fee);

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // The correct fee is was sent to the oracle
    cu.assertEventSent(evdata, 'FeeSent', address.oracle, fee);

    // balances after fee payout
    await cu.assertBalanceZero(crucible);
  });

  it('can partial payout with participants all in PASS state', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // all participants PASS the crucible
    for (var i = 1; i <= 3; i++) {
      tx = await crucible.setGoal.sendTransaction(
        address['user' + i], true, { 'from': address.oracle }
      );
    }

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // balances before payout
    await cu.assertStartBalances(
      crucible, cu.riskAmountWei, startBalances, addTx
    );

    var evdata;
    var payoutTx = {};
    for (var i = 0; i < 3; i++) {
      // trigger payout
      tx = await crucible.payout.sendTransaction(
        i, 1, { 'from': address['user' + (i + 1)] }
      );
      evdata = await truffleAssert.createTransactionResult(crucible, tx);

      payoutTx['user' + (i + 1)] = tx;

      // events emitted
      truffleAssert.eventEmitted(evdata, 'PaymentSent');

      // events NOT emitted
      truffleAssert.eventNotEmitted(evdata, 'FeeSent');
      truffleAssert.eventNotEmitted(evdata, 'RefundSent');
    }

    // balances after payout
    await cu.assertBalanceZero(crucible);

    // all participants PASSed, check payout
    for (var i = 1; i <= 3; i++) {
      cu.assertUserWalletBalance(
        'user' + i,
        startBalances['user' + i]
          .minus(await cu.gasCost(addTx['user' + i]))
          .minus(await cu.gasCost(payoutTx['user' + i]))
          .toNumber()
      );
    }

    // We are in the paid state, and got the event
    await cu.assertCrucibleState(
      crucible,
      evdata,
      'CrucibleStateChange',
      cu.crucibleStateIsFinished,
      cu.crucibleStateIsPaid
    );

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    truffleAssert.eventNotEmitted(evdata, 'FeeSent');

    // balances after fee payout
    await cu.assertBalanceZero(crucible);
  });

  it('can partial payout with participants all in WAITING state', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });
    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // NOTE: we left all participants in the waiting state

    // balances before payout
    await cu.assertStartBalances(
      crucible, cu.riskAmountWei, startBalances, addTx
    );

    var reserve = await crucible.reserve();
    assert.equal(
      reserve.toNumber(),
      cu.riskAmountWei.times(3).toNumber(),
      'reserve is correct'
    );

    var evdata;
    var payoutTx = {};
    for (var i = 0; i < 3; i++) {
      // trigger payout
      tx = await crucible.payout.sendTransaction(
        i, 1, { 'from': address['user' + (i + 1)] }
      );
      evdata = await truffleAssert.createTransactionResult(crucible, tx);

      payoutTx['user' + (i + 1)] = tx;

      // events emitted
      truffleAssert.eventEmitted(evdata, 'RefundSent');

      // events NOT emitted
      truffleAssert.eventNotEmitted(evdata, 'FeeSent');
      truffleAssert.eventNotEmitted(evdata, 'PaymentSent');

      // reserves fall by expected amounts
      reserve = await crucible.reserve();
      assert.equal(
        reserve.toNumber(),
        cu.riskAmountWei.times(2 - i),
        'reserve is as expected'
      );
    }

    // balances after payout
    await cu.assertBalanceZero(crucible);

    // all participants are WAITING, check refund
    for (var i = 1; i <= 3; i++) {
      cu.assertUserWalletBalance(
        'user' + i,
        startBalances['user' + i]
          .minus(await cu.gasCost(addTx['user' + i]))
          .minus(await cu.gasCost(payoutTx['user' + i]))
          .toNumber()
      );
    }

    // We are in the paid state, and got the event
    await cu.assertCrucibleState(
      crucible,
      evdata,
      'CrucibleStateChange',
      cu.crucibleStateIsFinished,
      cu.crucibleStateIsPaid
    );

    reserve = await crucible.reserve();
    assert.equal(reserve.toNumber(), 0, 'reserve is 0 again');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    truffleAssert.eventNotEmitted(evdata, 'FeeSent');

    // balances after fee payout
    await cu.assertBalanceZero(crucible);
  });

  it('can partial payout with participants all in FAIL state', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    var calculateFee = await crucible.calculateFee();
    assert.equal(calculateFee, false, '_calculateFee() not run yet');

    var penalty = await crucible.penalty();
    assert.equal(penalty.toNumber(), 0, 'penalty = 0');

    // set all participants to the FAIL state
    for (var i = 1; i <= 3; i++) {
      tx = await crucible.setGoal.sendTransaction(
        address['user' + i], false, { 'from': address.oracle }
      );
    }

    penalty = await crucible.penalty();
    assert.equal(
      penalty.toNumber(),
      cu.riskAmountWei.times(3).toNumber(),
      'penalty is as expected'
    );

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // balances before payout
    await cu.assertStartBalances(
      crucible, cu.riskAmountWei, startBalances, addTx
    );

    var evdata;
    for (var i = 0; i < 3; i++) {
      // the first time around, the entire payout is taken as a fee, and the
      // crucible is marked as paid.  The next two iterations it should throw
      // an error.
      if (i === 0) {
        // trigger payout
        tx = await crucible.payout.sendTransaction(
          i, 1, { 'from': address.oracle }
        );
        evdata = await truffleAssert.createTransactionResult(crucible, tx);

        // events NOT emitted
        truffleAssert.eventNotEmitted(evdata, 'FeeSent');
        truffleAssert.eventNotEmitted(evdata, 'RefundSent');
        truffleAssert.eventNotEmitted(evdata, 'PaymentSent');

        // balances after payout
        await cu.assertUserBalances(crucible, 0);
        await cu.assertContractBalance(crucible, cu.riskAmountWei.times(3));

        // all three participants failed
        for (var i = 1; i <= 3; i++) {
          cu.assertUserWalletBalance(
            'user' + i,
            startBalances['user' + i]
              .minus(await cu.gasCost(addTx['user' + i]))
              .minus(cu.riskAmountWei)
              .toNumber()
          );
        }

        // We are in the paid state, and got the event
        await cu.assertCrucibleState(
          crucible,
          evdata,
          'CrucibleStateChange',
          cu.crucibleStateIsFinished,
          cu.crucibleStateIsPaid
        );

        // penalty is still where it was, we never
        penalty = await crucible.penalty();
        assert.equal(penalty.toNumber(), 0, 'penalty is 0 becasue of max fee');

        calculateFee = await crucible.calculateFee();
        assert.equal(calculateFee, true, '_calculateFee() run');
      } else {
        calculateFee = await crucible.calculateFee();
        assert.equal(calculateFee, true, '_calculateFee() run');

        await expectThrow(crucible.payout.sendTransaction(
          i, 1, { 'from': address.oracle }
        ), EVMRevert);
      }
    }

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // The correct fee is was sent to the oracle
    cu.assertEventSent(
      evdata, 'FeeSent', address.oracle, cu.riskAmountWei.times(3)
    );

    // balances after fee payout
    await cu.assertBalanceZero(crucible);
  });

  it('revert if _records = 0', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // all participants PASS the crucible
    for (var i = 1; i <= 3; i++) {
      tx = await crucible.setGoal.sendTransaction(
        address['user' + i], true, { 'from': address.oracle }
      );
    }

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    await expectThrow(crucible.payout.sendTransaction(
      0, 0, { 'from': address.oracle }
    ), EVMRevert);
  });

  it('bounds check payout _startIndex = x, _records = y', async () => {
    var tx;
    var evdata;

    for (var x = 0; x < 5; x++) {
      crucible = await Crucible.new(
        address.oracle,
        'test',
        cu.startDate(),
        cu.lockDate(2),
        cu.endDate(4),
        cu.minAmountWei,
        cu.timeout,
        cu.feeNumerator,
        { from: address.oracle }
      );

      for (var i = 1; i <= 3; i++) {
        startBalances['user' + i] = await web3.eth.getBalance(address['user' + i]);
        tx = await cu.add(crucible, 'user' + i);
        addTx['user' + i] = tx;
      }

      feeNumerator = await crucible.feeNumerator();
      feeDenominator = await crucible.feeDenominator();
      fee = cu.riskAmountWei.times(feeNumerator).dividedBy(feeDenominator);
      count = await crucible.count();

      await cu.sleep(2000);
      tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
      await cu.sleep(2000);
      tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

      // all participants PASS the crucible
      for (var i = 1; i <= 3; i++) {
        tx = await crucible.setGoal.sendTransaction(
          address['user' + i], true, { 'from': address.oracle }
        );
      }

      tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

      // balances before payout
      await cu.assertStartBalances(
        crucible, cu.riskAmountWei, startBalances, addTx
      );

      var state = await crucible.state();
      for (var y = 1; y < 5 && !cu.crucibleStateIsPaid(state); y++) {
        // trigger payout
        tx = await crucible.payout.sendTransaction(
          x, y, { 'from': address.oracle }
        );
        evdata = await truffleAssert.createTransactionResult(crucible, tx);

        // we only get PaymentSent when we have not already processed it
        if ((x + y) < 4 || ((x > 2) && (y === 1))) {
          truffleAssert.eventEmitted(evdata, 'PaymentSent');
        } else {
          truffleAssert.eventNotEmitted(evdata, 'PaymentSent');
        }

        // events NOT emitted
        truffleAssert.eventNotEmitted(evdata, 'FeeSent');
        truffleAssert.eventNotEmitted(evdata, 'RefundSent');

        state = await crucible.state();
      }

      // this is the only time we payout the entire crucible
      if (x === 0) {
        // balances after payout
        await cu.assertBalanceZero(crucible);

        // all participants PASSed, check payout
        for (var i = 1; i <= 3; i++) {
          cu.assertUserWalletBalance(
            'user' + i,
            startBalances['user' + i]
              .minus(await cu.gasCost(addTx['user' + i]))
              .toNumber()
          );
        }

        // We are in the paid state, and got the event
        await cu.assertCrucibleState(
          crucible,
          evdata,
          'CrucibleStateChange',
          cu.crucibleStateIsFinished,
          cu.crucibleStateIsPaid
        );
      }
    }
  });

  // This is super important.  Obviously, the more folks one tries to payout
  // in a single call to payout will cost more gas; however, we need a single
  // participant payout to consume a constant amount of gas.  If they don't
  // then we would need to set a participant limit to prevent the crucible from
  // eventually passing the block gas limit.
  it('gasUsed does not grow with data set for a single payout', async () => {
    var tx;
    var evdata;

    crucible = await Crucible.new(
      address.oracle,
      'test',
      cu.startDate(),
      cu.lockDate(2),
      cu.endDate(4),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
      { from: address.oracle }
    );

    for (var i = 1; i <= 2; i++) {
      startBalances['user' + i] = await web3.eth.getBalance(address['user' + i]);
      tx = await cu.add(crucible, 'user' + i);
      addTx['user' + i] = tx;
    }

    feeNumerator = await crucible.feeNumerator();
    feeDenominator = await crucible.feeDenominator();
    fee = cu.riskAmountWei.times(feeNumerator).dividedBy(feeDenominator);
    count = await crucible.count();

    await cu.sleep(2000);
    tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
    await cu.sleep(2000);
    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // all participants PASS the crucible
    for (var i = 1; i <= 2; i++) {
      tx = await crucible.setGoal.sendTransaction(
        address['user' + i], true, { 'from': address.oracle }
      );
    }

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // trigger payout
    tx = await web3.eth.getTransactionReceipt(
      await crucible.payout.sendTransaction(0, 1, { 'from': address.oracle })
    );

    var firstGasUsed = tx.gasUsed;

    tx = await web3.eth.getTransactionReceipt(
      await crucible.payout.sendTransaction(1, 1, { 'from': address.oracle })
    );

    var lastGasUsed = tx.gasUsed;

    crucible = await Crucible.new(
      address.oracle,
      'test',
      cu.startDate(),
      cu.lockDate(2),
      cu.endDate(4),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
      { from: address.oracle }
    );

    for (var i = 1; i <= 3; i++) {
      startBalances['user' + i] = await web3.eth.getBalance(address['user' + i]);
      tx = await cu.add(crucible, 'user' + i);
      addTx['user' + i] = tx;
    }

    feeNumerator = await crucible.feeNumerator();
    feeDenominator = await crucible.feeDenominator();
    fee = cu.riskAmountWei.times(feeNumerator).dividedBy(feeDenominator);
    count = await crucible.count();

    await cu.sleep(2000);
    tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
    await cu.sleep(2000);
    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // all participants PASS the crucible
    for (var i = 1; i <= 3; i++) {
      tx = await crucible.setGoal.sendTransaction(
        address['user' + i], true, { 'from': address.oracle }
      );
    }

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // trigger payout
    tx = await web3.eth.getTransactionReceipt(
      await crucible.payout.sendTransaction(0, 1, { 'from': address.oracle })
    );

    // NOTE: firstGasUsed is the most expensive payout call, users should
    // always send a gas limit of 100,000 to this function.
    assert.equal(
      tx.gasUsed,
      firstGasUsed,
      'the first payout call uses constant gas as the data set grows'
    );

    tx = await web3.eth.getTransactionReceipt(
      await crucible.payout.sendTransaction(1, 1, { 'from': address.oracle })
    );

    tx = await web3.eth.getTransactionReceipt(
      await crucible.payout.sendTransaction(2, 1, { 'from': address.oracle })
    );

    assert.equal(
      tx.gasUsed,
      lastGasUsed,
      'the last payout call uses constant gas as the data set grows'
    );

  });

  it('payout will work if state moves to BROKEN', async () => {
    var tx;

    // set user2 to FAIL
    tx = await crucible.setGoal.sendTransaction(
      address.user2, false, { 'from': address.oracle }
    );

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // set user1 to PASS
    tx = await crucible.setGoal.sendTransaction(
      address.user1, true, { 'from': address.oracle }
    );

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // Simulate at this point that the oracle is no longer active.
    // This will allow users to trigger broken state.

    // balances before payout
    await cu.assertStartBalances(
      crucible, cu.riskAmountWei, startBalances, addTx
    );

    // participants have to wait until timeout past endDate
    await cu.sleep(8000);

    // trigger payout (user1 wants their money)
    tx = await crucible.payout.sendTransaction(
      0, 1, { 'from': address.user1 }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    cu.assertUserWalletBalance(
      'user1',
      startBalances['user1']
        .minus(await cu.gasCost(addTx['user1']))
        .minus(await cu.gasCost(tx))
        .plus(
          cu.riskAmountWei.minus(fee)
        ).toNumber()
    );

    // This participant failed, so there was no payout
    cu.assertUserWalletBalance(
      'user2',
      startBalances['user2']
        .minus(await cu.gasCost(addTx['user2']))
        .minus(cu.riskAmountWei)
        .toNumber()
    );

    tx = await crucible.payout.sendTransaction(
      2, 1, { 'from': address.user3 }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // This participant was stuck WAITING, so there was a refund
    cu.assertEventSent(evdata, 'RefundSent', address.user3, cu.riskAmountWei);
    cu.assertUserWalletBalance(
      'user3',
      startBalances['user3']
        .minus(await cu.gasCost(addTx['user3']))
        .minus(await cu.gasCost(tx))
        .toNumber()
    );
  });


  // TODO(godsflaw): what happens if we try to pay, refund, or pay the fee to a
  // payable contract with a payable function that exceeds the gas stipend.
});
