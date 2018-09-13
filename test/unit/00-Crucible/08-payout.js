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
    var balance;
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

    // trigger payout
    tx = await crucible.payout.sendTransaction(
      0, count, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

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
        .minus(cu.gasCost(addTx['user1']))
        .plus(
          cu.riskAmountWei.minus(fee)
        ).toNumber()
    );

    // This participant failed, so there was no payout
    cu.assertUserWalletBalance(
      'user2',
      startBalances['user2']
        .minus(cu.gasCost(addTx['user2']))
        .minus(cu.riskAmountWei)
        .toNumber()
    );

    // This participant was stuck WAITING, so there was a refund
    cu.assertEventSent(evdata, 'RefundSent', address.user3, cu.riskAmountWei);
    cu.assertUserWalletBalance(
      'user3',
      startBalances['user3'].minus(cu.gasCost(addTx['user3'])).toNumber()
    );

    // The correct fee is was sent to the oracle
    cu.assertEventSent(evdata, 'FeeSent', address.oracle, fee);

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
    var balance;
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

    // trigger payout
    tx = await crucible.payout.sendTransaction(
      0, count, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // balances after payout
    await cu.assertBalanceZero(crucible);

    // all participants PASSed, check payout
    for (var i = 1; i <= 3; i++) {
      cu.assertEventSent(
        evdata, 'PaymentSent', address['user' + i], cu.riskAmountWei
      );
      cu.assertUserWalletBalance(
        'user' + i,
        startBalances['user' + i].minus(cu.gasCost(addTx['user' + i])).toNumber()
      );
    }

    // events NOT emitted
    truffleAssert.eventNotEmitted(evdata, 'FeeSent');
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
    var balance;
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });
    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // NOTE: we left all participants in the waiting state

    // balances before payout
    await cu.assertStartBalances(
      crucible, cu.riskAmountWei, startBalances, addTx
    );

    // trigger payout
    tx = await crucible.payout.sendTransaction(
      0, count, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // balances after payout
    await cu.assertBalanceZero(crucible);

    // all participants are WAITING, check refund
    for (var i = 1; i <= 3; i++) {
      cu.assertEventSent(
        evdata, 'RefundSent', address['user' + i], cu.riskAmountWei
      );
      cu.assertUserWalletBalance(
        'user' + i,
        startBalances['user' + i].minus(cu.gasCost(addTx['user' + i])).toNumber()
      );
    }

    // events NOT emitted
    truffleAssert.eventNotEmitted(evdata, 'FeeSent');
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
    var balance;
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

    // trigger payout
    tx = await crucible.payout.sendTransaction(
      0, count, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // balances after payout
    await cu.assertBalanceZero(crucible);

    // all three participants failed
    for (var i = 1; i <= 3; i++) {
      cu.assertUserWalletBalance(
        'user' + i,
        startBalances['user' + i]
          .minus(cu.gasCost(addTx['user' + i]))
          .minus(cu.riskAmountWei)
          .toNumber()
      );
    }

    // oracle received the entire balance as a fee
    cu.assertEventSent(
      evdata, 'FeeSent', address.oracle, cu.riskAmountWei.times(3)
    );

    // events NOT emitted
    truffleAssert.eventNotEmitted(evdata, 'RefundSent');
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

  it('can partial payout with participants in PASS, FAIL, and WAITING', async () => {
    var balance;
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
      0, 1, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // The correct fee is was sent to the oracle
    cu.assertEventSent(evdata, 'FeeSent', address.oracle, fee);

    // This participant passed, calculate payout
    var bonus = cu.riskAmountWei.minus(fee);
    cu.assertEventSent(
      evdata, 'PaymentSent', address.user1, cu.riskAmountWei.plus(bonus)
    );
    cu.assertUserWalletBalance(
      'user1',
      startBalances['user1']
        .minus(cu.gasCost(addTx['user1']))
        .plus(
          cu.riskAmountWei.minus(fee)
        ).toNumber()
    );

    // trigger partial payout
    tx = await crucible.payout.sendTransaction(
      1, 1, { 'from': address.oracle }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // This participant failed, so there was no payout
    cu.assertUserWalletBalance(
      'user2',
      startBalances['user2']
        .minus(cu.gasCost(addTx['user2']))
        .minus(cu.riskAmountWei)
        .toNumber()
    );

    // trigger partial payout
    tx = await crucible.payout.sendTransaction(
      2, 1, { 'from': address.oracle }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // This participant was stuck WAITING, so there was a refund
    cu.assertEventSent(evdata, 'RefundSent', address.user3, cu.riskAmountWei);
    cu.assertUserWalletBalance(
      'user3',
      startBalances['user3'].minus(cu.gasCost(addTx['user3'])).toNumber()
    );

    // balances after payout
    await cu.assertBalanceZero(crucible);

    // We are in the paid state, and got the event
    await cu.assertCrucibleState(
      crucible,
      evdata,
      'CrucibleStateChange',
      cu.crucibleStateIsFinished,
      cu.crucibleStateIsPaid
    );
  });

  it('can partial payout with participants all in PASS state', async () => {
    var balance;
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
    for (var i = 0; i < 3; i++) {
      // trigger payout
      tx = await crucible.payout.sendTransaction(
        i, 1, { 'from': address.oracle }
      );
      evdata = await truffleAssert.createTransactionResult(crucible, tx);

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
        startBalances['user' + i].minus(cu.gasCost(addTx['user' + i])).toNumber()
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
  });

  it('can partial payout with participants all in WAITING state', async () => {
    var balance;
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });
    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // NOTE: we left all participants in the waiting state

    // balances before payout
    await cu.assertStartBalances(
      crucible, cu.riskAmountWei, startBalances, addTx
    );

    var evdata;
    for (var i = 0; i < 3; i++) {
      // trigger payout
      tx = await crucible.payout.sendTransaction(
        i, 1, { 'from': address.oracle }
      );
      evdata = await truffleAssert.createTransactionResult(crucible, tx);

      // events emitted
      truffleAssert.eventEmitted(evdata, 'RefundSent');

      // events NOT emitted
      truffleAssert.eventNotEmitted(evdata, 'FeeSent');
      truffleAssert.eventNotEmitted(evdata, 'PaymentSent');
    }

    // balances after payout
    await cu.assertBalanceZero(crucible);

    // all participants are WAITING, check refund
    for (var i = 1; i <= 3; i++) {
      cu.assertUserWalletBalance(
        'user' + i,
        startBalances['user' + i].minus(cu.gasCost(addTx['user' + i])).toNumber()
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
  });

  it('can partial payout with participants all in FAIL state', async () => {
    var balance;
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

        // oracle received the entire balance as a fee
        cu.assertEventSent(
          evdata, 'FeeSent', address.oracle, cu.riskAmountWei.times(3)
        );

        // events NOT emitted
        truffleAssert.eventNotEmitted(evdata, 'RefundSent');
        truffleAssert.eventNotEmitted(evdata, 'PaymentSent');

        // balances after payout
        await cu.assertBalanceZero(crucible);

        // all three participants failed
        for (var i = 1; i <= 3; i++) {
          cu.assertUserWalletBalance(
            'user' + i,
            startBalances['user' + i]
              .minus(cu.gasCost(addTx['user' + i]))
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
      } else {
        await expectThrow(crucible.payout.sendTransaction(
          i, 1, { 'from': address.oracle }
        ), EVMRevert);
      }
    }
  });

});
