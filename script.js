class Block {
  constructor(index, timestamp, transactions, previousHash = "") {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
    this.nonce = 0;
  }

  calculateHash() {
    return CryptoJS.SHA256(
      this.index +
        this.previousHash +
        this.timestamp +
        JSON.stringify(this.transactions) +
        this.nonce
    ).toString();
  }

  mineBlock(difficulty) {
    while (
      this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")
    ) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log("Block mined: " + this.hash);
  }
}

class Transaction {
  constructor(fromAddress, toAddress, amount) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.signature = null;
  }

  calculateHash() {
    return CryptoJS.SHA256(
      this.fromAddress + this.toAddress + this.amount
    ).toString();
  }

  signTransaction(signingKey) {
    // Vérification plus stricte
    if (signingKey.getPublicKey() !== this.fromAddress) {
      throw new Error("Non autorisé : signature invalide");
    }

    // Validation supplémentaire potentielle
    if (!this.isSignerAuthorized(signingKey)) {
      throw new Error("Clé non autorisée");
    }

    const txHash = this.calculateHash();
    this.signature = signingKey.sign(txHash);
  }

  isSignerAuthorized(signingKey) {
    return true;
  }
  

  isValid() {
    // Rejeter les transactions système (récompense de minage)
    if (this.fromAddress === null) return false;

    if (!this.signature) {
      throw new Error("Transaction non signée");
    }

    const txHash = this.calculateHash();
    const isSignatureValid = this.verifySignature(txHash, this.signature);

    if (!isSignatureValid) {
      throw new Error("Signature de transaction invalide");
    }

    return true;
  }

  // Méthode de vérification de signature
  verifySignature(txHash, signature) {
    return true;
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 2;
    this.pendingTransactions = [];
    this.miningReward = 10;
    this.MAX_TRANSACTIONS_PER_BLOCK = 2;
  }

  createGenesisBlock() {
    return new Block(0, Date.now(), [], "0");
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(miningRewardAddress) {
    // Créer des blocs avec 2 transactions chacun
    for (let i = 0; i < this.pendingTransactions.length-1; i++) {
      const blockTransactions = this.pendingTransactions.slice(
        i * 2,
        (i + 1) * 2
      );

      if (blockTransactions.length !== 2) break;

      const block = new Block(
        this.chain.length,
        Date.now(),
        blockTransactions,
        this.getLatestBlock().hash
      );

      block.mineBlock(this.difficulty);
      console.log("Bloc miné avec succès!");
      this.chain.push(block);

      // Ajouter la récompense de minage au dernier bloc
      if (blockTransactions.length > 0) {
        this.pendingTransactions[i * 2 + blockTransactions.length] =
          new Transaction(null, miningRewardAddress, this.miningReward);
      }
    }

    // Vider les transactions traitées
    this.pendingTransactions = this.pendingTransactions.filter(
      (tx) => tx.fromAddress !== null
    );
  }

  addTransaction(transaction) {
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error(
        "Transaction doit avoir une adresse source et destination"
      );
    }

    if (!transaction.isValid()) {
      throw new Error(
        "Impossible d'ajouter une transaction invalide à la chaîne"
      );
    }

    this.pendingTransactions.push(transaction);
  }

  getBalanceOfAddress(address) {
    let balance = 0;

    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.fromAddress === address) {
          balance -= trans.amount;
        }

        if (trans.toAddress === address) {
          balance += trans.amount;
        }
      }
    }

    return balance;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }

    return true;
  }
}

class Wallet {
  constructor() {
    this.privateKey = CryptoJS.lib.WordArray.random(32).toString();
    this.publicKey = this.generatePublicKey();
  }

  generatePublicKey() {
    return CryptoJS.SHA256(this.privateKey).toString();
  }

  getPublicKey() {
    return this.publicKey;
  }

  sign(message) {
    return CryptoJS.HmacSHA256(message, this.privateKey).toString();
  }
}

function demonstrateBlocchain() {
  const maCrypto = new Blockchain();

  const walletA = new Wallet();
  const walletB = new Wallet();
  const walletC = new Wallet();
  const walletD = new Wallet();
  const walletE = new Wallet();

  const transactions = [
    new Transaction(walletA.getPublicKey(), walletB.getPublicKey(), 100),
    new Transaction(walletB.getPublicKey(), walletC.getPublicKey(), 20),
    new Transaction(walletC.getPublicKey(), walletD.getPublicKey(), 15),
    new Transaction(walletD.getPublicKey(), walletE.getPublicKey(), 25),
    new Transaction(walletE.getPublicKey(), walletA.getPublicKey(), 10),
    new Transaction(walletB.getPublicKey(), walletA.getPublicKey(), 10),
    new Transaction(walletB.getPublicKey(), walletD.getPublicKey(), 10),
  ];

  transactions.forEach((tx) => {
    const senderWallet = [walletA, walletB, walletC, walletD, walletE].find(
      (w) => w.getPublicKey() === tx.fromAddress
    );

    if (senderWallet) {
      tx.signTransaction(senderWallet);
      maCrypto.addTransaction(tx);
    }
  });

  console.log("Début du minage...");
  maCrypto.minePendingTransactions(walletA.getPublicKey());

  console.log("Nombre de blocs:", maCrypto.chain);

  console.log(
    "Solde de walletA:",
    maCrypto.getBalanceOfAddress(walletA.getPublicKey())
  );
  console.log(
    "Solde de walletB:",
    maCrypto.getBalanceOfAddress(walletB.getPublicKey())
  );
  console.log(
    "Solde de walletC:",
    maCrypto.getBalanceOfAddress(walletC.getPublicKey())
  );
  console.log(
    "Solde de walletD:",
    maCrypto.getBalanceOfAddress(walletD.getPublicKey())
  );
  console.log(
    "Solde de walletE:",
    maCrypto.getBalanceOfAddress(walletE.getPublicKey())
  );

  console.log("La chaîne est-elle valide?", maCrypto.isChainValid());
}

demonstrateBlocchain();
