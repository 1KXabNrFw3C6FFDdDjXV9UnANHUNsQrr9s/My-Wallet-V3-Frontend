angular
  .module('walletApp')
  .controller('CoinifyBankAccountController', CoinifyBankAccountController);

function CoinifyBankAccountController ($scope, $q, $timeout, Wallet, buySell, currency, Alerts) {
  $scope.$parent.limits = {};
  $scope.exchange = buySell.getExchange();
  $scope.toggleEditAmount = () => $scope.$parent.editAmount = !$scope.$parent.editAmount;
  $scope.isBankTransfer = () => $scope.isMedium('bank');
  $scope.qa = {};
  $scope.accountCurrency = $scope.$parent.bankAccount.account.currency;
  $scope.accountType = 'international';

  console.log('bank account ctrl scope', $scope)

  $scope.setAccountType = (accountType) => {
    $scope.accountType = accountType;
  };

  $scope.selectCountry = (country) => {
    $scope.$parent.bankAccount.holder.address.country = country.code;
  };

  $scope.selectBankCountry = (country) => {
    $scope.$parent.bankAccount.bank.address.country = country.code;
    $scope.selectedBankCountry = country.name;
  };

  $scope.getMaxMin = (curr) => {
    const calculateMin = (rate) => {
      $scope.$parent.limits.min = (rate * 10).toFixed(2);
    };

    const calculateMax = (rate) => {
      $scope.$parent.limits.max = buySell.calculateMax(rate, $scope.medium).max;
      $scope.$parent.limits.available = buySell.calculateMax(rate, $scope.medium).available;
    };

    return buySell.fetchProfile(true).then(() => {
      let min = buySell.getRate('EUR', curr.code).then(calculateMin);
      let max = buySell.getRate($scope.exchange.profile.defaultCurrency, curr.code).then(calculateMax);
      return $q.all([min, max]).then($scope.setParentError);
    });
  };

  $scope.commitValues = () => {
    $scope.$parent.quote = null;
    $scope.status.waiting = true;
    $scope.transaction.currency = $scope.tempCurrency;
    $scope.transaction.fiat = $scope.tempFiat;
    $scope.getQuote().then(() => $scope.status.waiting = false);
    $scope.$parent.changeCurrencySymbol($scope.transaction.currency);
    $scope.toggleEditAmount();
  };

  $scope.cancel = () => {
    $scope.tempCurrency = $scope.transaction.currency;
    $scope.tempFiat = $scope.transaction.fiat;
    $scope.$parent.fiatFormInvalid = false;
    $scope.toggleEditAmount();
  };

  $scope.changeTempCurrency = (curr) => (
    $scope.getMaxMin(curr).then(() => { $scope.tempCurrency = curr; })
  );

  $scope.qa.info = () => {
    $scope.$parent.bankAccount = {
      account: {
        bic: '123',
        iban: '123456789',
        currency: $scope.trade.quoteCurrency
      },
      bank: {
        address: {
          // street: '123 rue de btc',
          // city: 'Paris',
          // state: '',
          // zipcode: '12345',
          country: 'France'
        }
      },
      holder: {
        name: 'Darth Vader',
        address: {
          street: '789 Death Star Rd NE',
          zipcode: '13451',
          city: 'Forceville',
          state: '',
          country: 'France'
        }
      }
    }
  };

    $scope.setAccountCurrency = (currency) => {
      console.log('setting account currency', currency)
      $scope.$parent.bankAccount.account.currency = currency.code;
      $scope.accountCurrency = currency.code;
      console.log()
    };

  // $scope.setParentError = () => {
  //   $timeout(() => {
  //     $scope.$parent.fiatFormInvalid = $scope.tempFiatForm.$invalid && !$scope.needsKyc();
  //   });
  // };

  let eventualError = (message) => Promise.reject.bind(Promise, { message });

  $scope.$parent.buy = () => {
    $scope.status.waiting = true;

    let success = (trade) => {
      $scope.$parent.trade = trade;
      Alerts.clear($scope.alerts);
      if ($scope.$parent.trade.bankAccount) $scope.formatTrade('bank_transfer');

      $scope.nextStep();
    };

    // check if bank transfer and kyc level
    if ($scope.needsKyc()) {
      return buySell.kycs.length && ['declined', 'rejected', 'expired'].indexOf(buySell.kycs[0].state) > -1
        ? buySell.triggerKYC().then(success, $scope.standardError)
        : buySell.getOpenKYC().then(success, $scope.standardError);
    }

    let buyError = eventualError('ERROR_TRADE_CREATE');

    $scope.accounts[0].buy()
                      .catch(buyError)
                      .then(success, $scope.standardError)
                      .then($scope.watchAddress);
  };

  $scope.$watch('transaction.currency', (newVal, oldVal) => {
    $scope.tempCurrency = $scope.transaction.currency;
  });

  $scope.$watch('transaction.fiat', (newVal, oldVal) => {
    $scope.tempFiat = $scope.transaction.fiat;
  });

  $scope.$watch('rateForm', () => {
    $scope.$parent.rateForm = $scope.rateForm;
  });

  $scope.$watch('step', () => {
    if ($scope.onStep('summary')) {
      $scope.getMaxMin($scope.tempCurrency);

      // Get a new quote if using a fake quote.
      if (!$scope.$parent.quote.id) {
        $scope.$parent.quote = null;
        $scope.getQuote();
      }
    }
  });
}