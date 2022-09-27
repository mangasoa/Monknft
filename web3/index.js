// load network.js to get network/chain id
document.body.appendChild(Object.assign(document.createElement("script"), { type: "text/javascript", src: "./network.js" }));
// load web3modal to connect to wallet
document.body.appendChild(Object.assign(document.createElement("script"), { type: "text/javascript", src: "./web3/lib/web3modal.js" }));
// load web3js to create transactions
document.body.appendChild(Object.assign(document.createElement("script"), { type: "text/javascript", src: "./web3/lib/web3.min.js" }));
// uncomment to enable torus wallet
// document.body.appendChild(Object.assign(document.createElement("script"), { type: "text/javascript", src: "https://unpkg.com/@toruslabs/torus-embed" }));
// uncomment to enable walletconnect
// document.body.appendChild(Object.assign(document.createElement("script"), { type: "text/javascript", src: "https://unpkg.com/@walletconnect/web3-provider@1.2.1/dist/umd/index.min.js" }));

// load web3gl to connect to unity
window.web3gl = {
    networkId: 0,
    connect,
    connectAccount: "",
    signMessage,
    signMessageResponse: "",
    callContract,
    callContractResponse:"",
    callContractError:"",
    sendTransaction,
    sendTransactionResponse: "",
    sha3Message,
    hashMessageResponse: "",
    sendTransactionResponse: "",
    sendTransactionData,
    sendTransactionResponseData:"",
    sendContract,
    sendContractResponse: "",
};

// will be defined after connect()
let provider;
let web3;

/*
paste this in inspector to connect to wallet:
window.web3gl.connect()
*/
async function connect() {
  // uncomment to enable torus and walletconnect
  const providerOptions = {
    // torus: {
    //   package: Torus,
    // },
    // walletconnect: {
    //   package: window.WalletConnectProvider.default,
    //   options: {
    //   },
    // },
  };

  const web3Modal = new window.Web3Modal.default({
    providerOptions,
  });

  web3Modal.clearCachedProvider();

  // set provider
  provider = await web3Modal.connect();
  web3 = new Web3(provider);

  // set current network id
  web3gl.networkId = parseInt(provider.chainId);

  // if current network id is not equal to network id, then switch
  if (web3gl.networkId != window.web3ChainId) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${window.web3ChainId.toString(16)}` }], // chainId must be in hexadecimal numbers
      });
    } catch {
      // if network isn't added, pop-up metamask to add
      await addEthereumChain();
    }
  }

  // set current account
  // provider.selectedAddress works for metamask and torus
  // provider.accounts[0] works for walletconnect
  web3gl.connectAccount = provider.selectedAddress || provider.accounts[0];

  // refresh page if player changes account
  provider.on("accountsChanged", (accounts) => {
    window.location.reload();
  });

  // update if player changes network
  provider.on("chainChanged", (chainId) => {
    web3gl.networkId = parseInt(chainId);
  });
}

/*
Will calculate the sha3 of the input.
window.web3gl.sha3Message("hello")
*/
async function sha3Message(message) {
    try {
        const hashedMessage = await web3.utils.sha3(message);
        window.web3gl.hashMessageResponse = hashedMessage;
    } catch (error) {
        window.web3gl.hashMessageResponse = error.message;
    }
}

/*
paste this in inspector to connect to sign message:
window.web3gl.signMessage("hello")
*/
async function signMessage(message) {
  try {
    const from = (await web3.eth.getAccounts())[0];
    const signature = await web3.eth.personal.sign(message, from, "")
      window.web3gl.signMessageResponse = signature;
  } catch (error) {
    window.web3gl.signMessageResponse = error.message;
  }
}


async function sendTransaction(to, value, gasLimit, gasPrice) {
  const from = (await web3.eth.getAccounts())[0];
  web3.eth
      .sendTransaction({
        from,
        to,
        value,
        gas: gasLimit ? gasLimit : undefined,
        gasPrice: gasPrice ? gasPrice : undefined,
      })
      .on("transactionHash", (transactionHash) => {
        window.web3gl.sendTransactionResponse = transactionHash;
      })
      .on("error", (error) => {
        window.web3gl.sendTransactionResponse = error.message;
      });
}


async function sendTransactionData(to, value, gasPrice, gasLimit, data) {
    const from = (await web3.eth.getAccounts())[0];
    web3.eth
        .sendTransaction({
            from,
            to,
            value,
            gasPrice: gasPrice ? gasPrice : undefined,
            gas: gasLimit ? gasLimit : undefined,
            data: data ? data : undefined,
        })
        .on("transactionHash", (transactionHash) => {
            window.web3gl.sendTransactionResponseData = transactionHash;
        })
        .on("error", (error) => {
            window.web3gl.sendTransactionResponseData = error.message;
        });
}


async function callContract(method, abi, contract, args) {
    const from = (await web3.eth.getAccounts())[0];
    new web3.eth.Contract(JSON.parse(abi), contract).methods[method](
        ...JSON.parse(args)
    ).call()
        .then((result) => window.web3gl.callContractResponse = result)
        .catch((error) => window.web3gl.callContractError = error.message);
}


async function sendContract(method, abi, contract, args, value, gasLimit, gasPrice) {
  const from = (await web3.eth.getAccounts())[0];
  new web3.eth.Contract(JSON.parse(abi), contract).methods[method](...JSON.parse(args))
      .send({
        from,
        value,
        gas: gasLimit ? gasLimit : undefined,
        gasPrice: gasPrice ? gasPrice : undefined,
      })
      .on("transactionHash", (transactionHash) => {
        window.web3gl.sendContractResponse = transactionHash;
      })
      .on("error", (error) => {
        window.web3gl.sendContractResponse = error.message;
      });
}

// add new wallet to in metamask
async function addEthereumChain() {
  const account = (await web3.eth.getAccounts())[0];

  // fetch https://chainid.network/chains.json
  const response = await fetch("https://chainid.network/chains.json");
  const chains = await response.json();

  // find chain with network id
  const chain = chains.find((chain) => chain.chainId == window.web3ChainId);

  const params = {
    chainId: "0x" + chain.chainId.toString(16), // A 0x-prefixed hexadecimal string
    chainName: chain.name,
    nativeCurrency: {
      name: chain.nativeCurrency.name,
      symbol: chain.nativeCurrency.symbol, // 2-6 characters long
      decimals: chain.nativeCurrency.decimals,
    },
    rpcUrls: chain.rpc,
    blockExplorerUrls: [chain.explorers && chain.explorers.length > 0 && chain.explorers[0].url ? chain.explorers[0].url : chain.infoURL],
  };

  await window.ethereum
      .request({
        method: "wallet_addEthereumChain",
        params: [params, account],
      })
      .catch(() => {
        // I give up
        window.location.reload();
      });
}
