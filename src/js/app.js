App = {
  web3Provider: null,
  contracts: {},

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    // Initialize web3 and set the provider to the testRPC.
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // set the provider you want from Web3.providers
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
      web3 = new Web3(App.web3Provider);
    }

    return App.initContract();
  },

  initContract: function() {
    $.getJSON('Crucible.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract.
      var CrucibleArtifact = data;
      App.contracts.Crucible = TruffleContract(CrucibleArtifact);

      // Set the provider for our contract.
      App.contracts.Crucible.setProvider(App.web3Provider);

      // Use our contract to retieve and mark the adopted pets.
      return App.getBalances();
    });

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '#transferButton', App.handleTransfer);
  },

  handleTransfer: function() {
    event.preventDefault();

    var amount = parseInt($('#CTTransferAmount').val());
    var toAddress = $('#CTTransferAddress').val();

    console.log('Transfer ' + amount + ' CT to ' + toAddress);

    web3.eth.getAccounts(async function(error, accounts) {
      if (error) {
        console.log(error);
      }

      try {
        var token = await App.contracts.Crucible.deployed();
        var result = await token.transfer(toAddress, amount, {from: accounts[0]});
        alert('Transfer Successful!');
        return App.getBalances();
      } catch (err) {
        console.log(err.message);
      }
    });
  },

  getBalances: function(adopters, account) {
    console.log('Getting balances...');
    web3.eth.getAccounts(async function(error, accounts) {
      if (error) {
        console.log(error);
      }

      try {
        var token = await App.contracts.Crucible.deployed();
        console.log(App.contracts.Crucible.address);
        var precision = await token.decimals.call();
        var result = await token.balanceOf(accounts[0]);
        var balance = result.c[0].toString();
        if (balance === '0') {
          $('#CTBalance').text('0.00');
        } else {
          var prettyBalance = balance.substr(0, balance.length - precision) +
            '.' + balance.substr(balance.length - precision);
          $('#CTBalance').text(prettyBalance);
        }
      } catch (err) {
        console.log(err.message);
      }
    });
  },

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
