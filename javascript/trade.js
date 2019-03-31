// ### Variable Definition ###

var web3 = new Web3(Web3.givenProvider);

var utils = web3.utils;


// HTML elements to add and delete

// Loader
loader = `<div class="loader"></div>`;
swapButtonDiv = document.querySelector('.swap-button-div');
swapButton = document.querySelector('#swap-button');
swapButtonHtml = `<input class="btn btn-outline-light" id="swap-button" type="submit" value="SWAP">`;

const metaMaskBtn = document.querySelector('#metamask-button')
const closeBtn = document.querySelector('#close-button')
const modalTitle = document.querySelector('.modal-header')
const modalBody = document.querySelector('.modal-body')

const maxDestAmount = "10000000000000000000000000000000"

// For fee sharing program
const walletId = "0x1bF3e7EDE31dBB93826C2aF8686f80Ac53f9ed93"

// Ether balance to update it according to the addresses ether balance
let etherBalance;

// TO check whether proposed Gas price is lower than 10, if so, set to 10 automatically
let defaultGasPrice;
let chosenGasPrice;

// Define variable successful, which if set to false, will stop after the first tx and avoid asking to user to confirm the second one.
let successful;

// Counter to protect users from creating two event listeners on the swap button that will result in 2 tx's to be signed
let counter = 0

// ############# Functions ###############

// Function to be called after the final event has been triggered
function reloadMainPage() {
  location.reload();
};


// Change Swap to Loader and back

// Change Swap button to Loader
function swapToLoader() {
  swapButton.style.display = "none";
  swapButtonDiv.insertAdjacentHTML("afterbegin", loader);
}

// Change Loader back to Swap Button
function loaderToSwap() {
  document.querySelector('.loader').remove();
  swapButton.style.display = "";
}

// Check if web3 is injected
window.addEventListener('load', function () {
  if (typeof web3 !== 'undefined' && web3.currentProvider !== null) {
    console.log('web3 is enabled')
    if (web3.currentProvider.isMetaMask === true) {
      console.log('MetaMask is active')
    } else {
      console.log('MetaMask is not available')
    }
    // opens web3 client
    ethereum.enable();
    // Change modal to only show title and close button
    modalBody.style.display = "none";
    metaMaskBtn.style.display = "none";
  } else {
    // Change inner HTML of Error message
    console.log('web3 is not found')
    console.log('Please install Metamask')
    $('.modal').modal('show');
    // Create Error Message
  }
})

// Check if client is on the right network and create alert if not
web3.eth.net.getNetworkType()
  .then((result) => {
    if (`${result}` == "main" && selectedEthereumNetwork == "ropsten") {
      modalTitle.innerText = "Please switch your web3 client to the Ropsten Testnet";
      $('.modal').modal('show');
    } else if (`${result}` == "ropsten" && selectedEthereumNetwork == "mainnet") {
      modalTitle.innerText = "Please switch your web3 client to the Mainnet";
      $('.modal').modal('show');
    } else if (`${result}` == "ropsten" && selectedEthereumNetwork == "ropsten") {
      return 0;
    } else if (`${result}` == "main" && selectedEthereumNetwork == "mainnet") {
      return 0;
    } else {
      modalTitle.innerText = "Please switch your web3 client to either Mainnet or Ropsten";
      $('.modal').modal('show');
    }
  })

// Set ETH Balance to show on front end
async function setEthBalance(fetchedUserAddress) {
  etherBalance = await web3.eth.getBalance(fetchedUserAddress)
  if (addressToSell == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
    document.getElementById('sell-max-token').innerText = `Max: ${(etherBalance / 10 ** srcDecimal).toFixed(5)} ${srcSymbol}`
  }
}

async function getEthereumGasPrice() {
  defaultGasPrice = await web3.eth.getGasPrice()
  chosenGasPrice = (defaultGasPrice < 10000000000) ? `${10000000000}` : `${defaultGasPrice}`;
}

getEthereumGasPrice()


// Check if user swapped web3 accounts & Set initial Ether Balance

function newMetaMaskAddress(error, data) {
  fetchedUserAddress = `${error['selectedAddress']}`
  if (fetchedUserAddress !== "undefined") setEthBalance(fetchedUserAddress);
}

web3.currentProvider.publicConfigStore.on('update', newMetaMaskAddress);

// ################ Ether => ERC20 Trade ###################
async function executeEtherTx() {
  console.log(srcAmountWei)

  transactionData = kyberNetworkProxyContract.methods.trade(
    addressToSell, //ETH srcToken
    srcAmountWei, //uint srcAmount
    addressToBuy, //ERC20 destToken
    fetchedUserAddress, //address destAddress => VENDOR_WALLET_ADDRESS
    maxDestAmount, //uint maxDestAmount
    slippageRate, //uint minConversionRate
    walletId //uint walletId
  ).encodeABI();


  txReceipt = await web3.eth.sendTransaction({
      from: fetchedUserAddress, //obtained from website interface Eg. Metamask, Ledger etc.
      to: kyberNetworkProxyAddress,
      data: transactionData,
      value: srcAmountWei, //ADDITIONAL FIELD HERE
      gasPrice: chosenGasPrice
    })
    // When the user clicks confirm in Metamask and the transcation hash is broadcasted
    .on('transactionHash', function (hash) {
      waitingModal(hash)
    })
    .catch(function (error) {
      console.log(error);
      // Reload page to avoid having multiple tx queued up
      canceledTxModal();
      successful = false;
    })
  // IF tx was abondend, do dont show succesfull Modal
  closeBtn.removeEventListener("click", executeEtherTx, {
    passive: true
  });

  if (successful == false) return 0;


  successfulModal()
  var templateParams = {
    srcToken: srcSymbol,
    destToken: destSymbol,
    srcQuantity: srcAmount,
    destQuantity: destAmount,
    network: selectedEthereumNetwork
  }

  // Send anonymous notifcation that a tx was triggered
  emailjs.send('default_service', 'template_EFJQRdCL', templateParams, 'user_xN7N3ZJAOLHhHiviFcV1H');
}

// ####################################

// ####### Trade() ERC20 => ERC20 #######

async function executeTx() {

  // ####### Start second tx ########
  // Call the trade method in Proxy Contract
  transactionData2 = kyberNetworkProxyContract.methods.trade(
    addressToSell, //ERC20 srcToken
    srcAmountWei, //uint srcAmount
    addressToBuy, //ERC20 destToken
    fetchedUserAddress, //address destAddress => VENDOR_WALLET_ADDRESS
    maxDestAmount, //uint maxDestAmount
    slippageRate, //uint minConversionRate
    walletId //uint walletId for fee sharing program
  ).encodeABI()

  // estimatedGasLimit = await web3.eth.estimateGas({
  //     to: addressToBuy,
  //     data: transactionData2
  // })

  txReceipt = await web3.eth.sendTransaction({
      from: fetchedUserAddress,
      to: kyberNetworkProxyAddress,
      data: transactionData2,
      nonce: nonce + 1,
      gas: 600000,
      gasPrice: chosenGasPrice
    }, function (error, hash) {
      waitingModal(hash)
    })
    .catch(function (error) {
      console.log(error);
      canceledTxModal();
      successful = false;

    });

  // Open modal that display tx was successful
  closeBtn.removeEventListener('click', executeTx, {
    passive: true
  });

  // Only show successful modal when trade was executed
  if (successful == false) return 0;

  successfulModal()
  var templateParams = {
    srcToken: srcSymbol,
    destToken: destSymbol,
    srcQuantity: srcAmount,
    destQuantity: destAmount,
    network: selectedEthereumNetwork
  }

  // Send anonymous notifcation that a tx was triggered
  emailjs.send('default_service', 'template_EFJQRdCL', templateParams, 'user_xN7N3ZJAOLHhHiviFcV1H');

  // End of Async
}

// ### Approve TX ERC 20 => ERC220 #######

async function approveTx() {

  transactionData1 = srcTokenContract.methods.approve(kyberNetworkProxyAddress, srcAmountWei).encodeABI()


  txReceipt = await web3.eth.sendTransaction({
      from: fetchedUserAddress, //obtained from website interface Eg. Metamask, Ledger etc.
      to: addressToSell, //srcTokenContract resluted in error as it did not provide the contracts address, but the object itself,
      data: transactionData1,
      gasPrice: chosenGasPrice,
      nonce: nonce
    }, function (error, hash) {
      tradeApprovedModal()
      // Remove first event listener
      closeBtn.removeEventListener("click", approveTx, {
        passive: true
      });
      // Add event Listener to function
      closeBtn.addEventListener('click', executeTx)
    })
    .catch(function (error) {
      console.log(error);
      successful = false;
      closeBtn.removeEventListener("click", executeTx, {
        passive: true
      });
      canceledTxModal()
    })
  if (successful == false) return 0;

}

// Let the trade begin

async function trade() {

  // Check if source Amount is greater than 0
  if (srcAmount == 0) {
    zeroModal();
    return 0
  }
  srcAmountWei = `${srcAmount * (10 ** parseInt(srcDecimal))}`;

  // Set successful to true
  successful = true;

  /*### TRADE EXECUTION ####*/

  // If User chooses to sell ETH
  if (addressToSell == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {

    // Check if user has sufficient ether available
    let etherBalance = await web3.eth.getBalance(fetchedUserAddress)
    if (etherBalance >= parseInt(srcAmountWei)) {
      startModal()
      counter += 1;

      // Only add the Event Listener once, to avoid multiple tx popping up if user hits swap multiple times
      if (counter < 2) closeBtn.addEventListener('click', executeEtherTx);

      // If not, dont execute trade
    } else {
      insufficientFundsModal()
    }


    // ##############################################################
    // If User chooses to sell ERC20 TOken
  } else {

    // IF user has enough funds of the selected Token, start the process
    if (erc20tokenBalance >= parseInt(srcAmountWei)) {

      // Check if User gave Kyber any allowance in order to skip allow tx
      allowanceAmount = await srcTokenContract.methods.allowance(fetchedUserAddress, kyberNetworkProxyAddress).call()

      // Set nonce
      nonce = await web3.eth.getTransactionCount(fetchedUserAddress);

      // Iterate on counter to prevent 2 tx popping up for one
      counter += 1;

      // If User already approved Kyber to exchange tokens, skip the approval() method
      if (srcAmountWei <= allowanceAmount) {

        // console.log(`Source Amount: ${srcAmountWei} is smaller than AllowanceAmount ${allowanceAmount}`)

        // Open respective Modal
        skippedApprovalModal();
        // Create event listener that calls executeTx function
        if (counter < 2) closeBtn.addEventListener('click', executeTx)

        // If User has not approved Kyber to trade tokens, call approval first
      } else {

        // console.log(`Source Amount: ${srcAmountWei} is greater than AllowanceAmount ${allowanceAmount}`)

        startModal();
        // Create event listener that calls executeTx function
        if (counter < 2) closeBtn.addEventListener('click', approveTx)

      }

      // If token balance is less then srcAmount, stopp the trade
    } else {
      insufficientFundsModal()
    }

  }

  // trade() end
}

const tradeButton = document.querySelector("#swap-button");

tradeButton.addEventListener('click', function (event) {
  event.preventDefault();
  trade();
});
