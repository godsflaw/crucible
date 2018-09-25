const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const { expectThrow } = require('../../fixtures/expectThrow');
const { EVMRevert } = require('../../fixtures/EVMRevert');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - collectFee', async (accounts) => {
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
      address.empty,
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

  it('cannot collectFee in LOCKED state', async () => {
    await expectThrow(
      crucible.collectFee.sendTransaction(
        address.oracle, { 'from': address.oracle }
    ), EVMRevert);
  });

  it('fees correct for PASS, FAIL, and WAITING', async () => {
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

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // The correct fee is was sent to the oracle
    cu.assertEventSent(evdata, 'FeeSent', address.oracle, fee);

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, true, 'feePaid correct');

    // state did not change
    truffleAssert.eventNotEmitted(evdata, 'CrucibleStateChange');
  });

  it('fees correct for WAITING, FAIL, and FAIL', async () => {
    var tx;

    // set user3 to FAIL
    tx = await crucible.setGoal.sendTransaction(
      address.user3, false, { 'from': address.oracle }
    );

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // set user2 to FAIL
    tx = await crucible.setGoal.sendTransaction(
      address.user2, false, { 'from': address.oracle }
    );

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // NOTE: we left user1 in WAITING state

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // The correct fee is was sent to the oracle
    cu.assertEventSent(
      evdata,
      'FeeSent',
      address.oracle,
      cu.riskAmountWei.times(2)
    );

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, true, 'feePaid correct');

    // state did not change
    truffleAssert.eventNotEmitted(evdata, 'CrucibleStateChange');
  });

  it('fees correct if all in PASS state', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // all participants PASS the crucible
    for (var i = 1; i <= 3; i++) {
      tx = await crucible.setGoal.sendTransaction(
        address['user' + i], true, { 'from': address.oracle }
      );
    }

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // no fee to pay
    truffleAssert.eventNotEmitted(evdata, 'FeeSent');

    // state did not change
    truffleAssert.eventNotEmitted(evdata, 'CrucibleStateChange');
  });

  it('fees correct if all in WAITING state', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });
    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // NOTE: we left all participants in the waiting state

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // no fee to pay
    truffleAssert.eventNotEmitted(evdata, 'FeeSent');

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // state did not change
    truffleAssert.eventNotEmitted(evdata, 'CrucibleStateChange');
  });

  it('state moves to PAID and fees correct if all in FAIL state', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // set all participants to the FAIL state
    for (var i = 1; i <= 3; i++) {
      tx = await crucible.setGoal.sendTransaction(
        address['user' + i], false, { 'from': address.oracle }
      );
    }

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // The correct fee is was sent to the oracle
    cu.assertEventSent(
      evdata, 'FeeSent', address.oracle, cu.riskAmountWei.times(3)
    );

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, true, 'feePaid correct');

    // We are in the paid state, and got the event
    await cu.assertCrucibleState(
      crucible,
      evdata,
      'CrucibleStateChange',
      cu.crucibleStateIsFinished,
      cu.crucibleStateIsPaid
    );
  });

  it('fees correct after payout for PASS, FAIL, and WAITING', async () => {
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

    // trigger payout
    tx = await crucible.payout.sendTransaction(
      0, 3, { 'from': address.oracle }
    );

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // The correct fee is was sent to the oracle
    cu.assertEventSent(evdata, 'FeeSent', address.oracle, fee);

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, true, 'feePaid correct');
  });

  it('fees correct after payout for WAITING, FAIL, and FAIL', async () => {
    var tx;

    // set user3 to FAIL
    tx = await crucible.setGoal.sendTransaction(
      address.user3, false, { 'from': address.oracle }
    );

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // set user2 to FAIL
    tx = await crucible.setGoal.sendTransaction(
      address.user2, false, { 'from': address.oracle }
    );

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // NOTE: we left user1 in WAITING state

    // trigger payout
    tx = await crucible.payout.sendTransaction(
      0, 3, { 'from': address.oracle }
    );

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // The correct fee is was sent to the oracle
    cu.assertEventSent(
      evdata,
      'FeeSent',
      address.oracle,
      cu.riskAmountWei.times(2)
    );

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, true, 'feePaid correct');
  });

  it('fees correct after payout if all in PASS state', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // all participants PASS the crucible
    for (var i = 1; i <= 3; i++) {
      tx = await crucible.setGoal.sendTransaction(
        address['user' + i], true, { 'from': address.oracle }
      );
    }

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // trigger payout
    tx = await crucible.payout.sendTransaction(
      0, 3, { 'from': address.oracle }
    );

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // no fee to pay
    truffleAssert.eventNotEmitted(evdata, 'FeeSent');

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');
  });

  it('fees correct after payout if all in WAITING state', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });
    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // NOTE: we left all participants in the waiting state

    // trigger payout
    tx = await crucible.payout.sendTransaction(
      0, 3, { 'from': address.oracle }
    );

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // no fee to pay
    truffleAssert.eventNotEmitted(evdata, 'FeeSent');

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');
  });

  it('fees correct after payout if all in FAIL state', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // set all participants to the FAIL state
    for (var i = 1; i <= 3; i++) {
      tx = await crucible.setGoal.sendTransaction(
        address['user' + i], false, { 'from': address.oracle }
      );
    }

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // trigger payout
    tx = await crucible.payout.sendTransaction(
      0, 3, { 'from': address.oracle }
    );

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, true, 'feePaid correct');
  });

  it('fees are correct in partial payout PASS, FAIL, and WAITING', async () => {
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

    // trigger partial payout
    tx = await crucible.payout.sendTransaction(
      0, 1, { 'from': address.user1 }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // The correct fee is was sent to the oracle
    cu.assertEventSent(evdata, 'FeeSent', address.oracle, fee);

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, true, 'feePaid correct');
  });

  it('fees are correct in partial payout in PASS state', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    // all participants PASS the crucible
    for (var i = 1; i <= 3; i++) {
      tx = await crucible.setGoal.sendTransaction(
        address['user' + i], true, { 'from': address.oracle }
      );
    }

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    truffleAssert.eventNotEmitted(evdata, 'FeeSent');

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');
  });

  it('fees are correct in partial payout in WAITING state', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });
    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    // NOTE: we left all participants in the waiting state

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    truffleAssert.eventNotEmitted(evdata, 'FeeSent');

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');
  });

  it('fees are correct in partial payout in FAIL state', async () => {
    var tx;

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });

    var calculateFee = await crucible.calculateFee();
    assert.equal(calculateFee, false, '_calculateFee() not run yet');

    // set all participants to the FAIL state
    for (var i = 1; i <= 3; i++) {
      tx = await crucible.setGoal.sendTransaction(
        address['user' + i], false, { 'from': address.oracle }
      );
    }

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, true, 'feePaid correct');

    // The correct fee is was sent to the oracle
    cu.assertEventSent(
      evdata, 'FeeSent', address.oracle, cu.riskAmountWei.times(3)
    );
  });

  it('collectFee will work if state moves to BROKEN', async () => {
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

    // participants have to wait until timeout past endDate
    await cu.sleep(8000);

    // trigger payout (user1 wants their money)
    tx = await crucible.payout.sendTransaction(
      0, 1, { 'from': address.user1 }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // The correct fee is was sent to the oracle
    cu.assertEventSent(evdata, 'FeeSent', address.oracle, fee);

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, true, 'feePaid correct');
  });

  it('call collectFee() many times, only pays once', async () => {
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

    // trigger payout
    tx = await crucible.payout.sendTransaction(
      0, 3, { 'from': address.oracle }
    );

    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid correct');

    // trigger fee payout
    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );
    var evdata = await truffleAssert.createTransactionResult(crucible, tx);

    // The correct fee is was sent to the oracle
    cu.assertEventSent(evdata, 'FeeSent', address.oracle, fee);

    feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, true, 'feePaid correct');

    for (var i = 0; i < 3; i++) {
      feePaid = await crucible.feePaid.call();
      assert.equal(feePaid, true, 'feePaid correct');

      // trigger fee payout
      tx = await crucible.collectFee.sendTransaction(
        address.oracle, { 'from': address.oracle }
      );
      evdata = await truffleAssert.createTransactionResult(crucible, tx);

      // no FeeSent
      truffleAssert.eventNotEmitted(evdata, 'FeeSent');
    }
  });
});
