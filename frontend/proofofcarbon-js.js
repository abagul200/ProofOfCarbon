// ProofOfCarbon Web3 Integration
class ProofOfCarbon {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.currentAccount = null;
        
        // Replace with your deployed contract address
        this.contractAddress = "YOUR_CONTRACT_ADDRESS_HERE";
        
        // Contract ABI (simplified version - include full ABI from compilation)
        this.contractABI = [
            {
                "inputs": [],
                "stateMutability": "nonpayable",
                "type": "constructor"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": true, "internalType": "uint256", "name": "creditId", "type": "uint256"},
                    {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
                    {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
                    {"indexed": false, "internalType": "string", "name": "projectName", "type": "string"}
                ],
                "name": "CarbonCreditMinted",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": true, "internalType": "address", "name": "buyer", "type": "address"},
                    {"indexed": true, "internalType": "address", "name": "seller", "type": "address"},
                    {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
                    {"indexed": false, "internalType": "uint256", "name": "totalCost", "type": "uint256"}
                ],
                "name": "CarbonCreditPurchased",
                "type": "event"
            },
            {
                "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}, {"internalType": "string", "name": "projectName", "type": "string"}, {"internalType": "string", "name": "description", "type": "string"}],
                "name": "mintCarbonCredit",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "seller", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
                "name": "buyCarbonCredits",
                "outputs": [],
                "stateMutability": "payable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "getCarbonBalance",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "getContractStats",
                "outputs": [
                    {"internalType": "uint256", "name": "totalCredits", "type": "uint256"},
                    {"internalType": "uint256", "name": "currentPrice", "type": "uint256"},
                    {"internalType": "address", "name": "contractOwner", "type": "address"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "uint256", "name": "creditId", "type": "uint256"}],
                "name": "getCarbonCredit",
                "outputs": [
                    {"internalType": "uint256", "name": "id", "type": "uint256"},
                    {"internalType": "address", "name": "creator", "type": "address"},
                    {"internalType": "uint256", "name": "amount", "type": "uint256"},
                    {"internalType": "string", "name": "projectName", "type": "string"},
                    {"internalType": "string", "name": "description", "type": "string"},
                    {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
                    {"internalType": "bool", "name": "verified", "type": "bool"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "getUserCredits",
                "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        this.init();
    }
    
    async init() {
        if (typeof window.ethereum !== 'undefined') {
            this.web3 = new Web3(window.ethereum);
            await this.loadContractStats();
            this.setupEventListeners();
        } else {
            this.showError('MetaMask not detected. Please install MetaMask to use this application.');
        }
    }
    
    setupEventListeners() {
        // Connect wallet button
        document.getElementById('connectWallet').addEventListener('click', () => this.connectWallet());
        
        // Form submissions
        document.getElementById('mintForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.mintCarbonCredits();
        });
        
        document.getElementById('buyForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.buyCarbonCredits();
        });
        
        document.getElementById('balanceForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.checkBalance();
        });
        
        // Update total cost when buy amount changes
        document.getElementById('buyAmount').addEventListener('input', () => this.updateTotalCost());
        
        // Account change listener
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnectWallet();
                } else {
                    this.currentAccount = accounts[0];
                    this.updateWalletUI();
                    this.loadUserData();
                }
            });
        }
    }
    
    async connectWallet() {
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            
            this.currentAccount = accounts[0];
            this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
            
            this.updateWalletUI();
            await this.loadUserData();
            
        } catch (error) {
            console.error('Error connecting wallet:', error);
            this.showError('Failed to connect wallet. Please try again.');
        }
    }
    
    disconnectWallet() {
        this.currentAccount = null;
        this.contract = null;
        
        document.getElementById('connectWallet').style.display = 'block';
        document.getElementById('walletInfo').classList.add('hidden');
        document.getElementById('userBalance').textContent = '0 Credits';
        
        // Clear user-specific data
        document.getElementById('userCreditsList').innerHTML = '<p class="no-credits">Connect your wallet to view your carbon credits.</p>';
        document.getElementById('transactionsList').innerHTML = '<p class="no-transactions">Connect your wallet to view activity.</p>';
    }
    
    updateWalletUI() {
        const connectBtn = document.getElementById('connectWallet');
        const walletInfo = document.getElementById('walletInfo');
        const walletAddress = document.getElementById('walletAddress');
        
        connectBtn.style.display = 'none';
        walletInfo.classList.remove('hidden');
        walletAddress.textContent = `${this.currentAccount.substring(0, 6)}...${this.currentAccount.substring(38)}`;
    }
    
    async loadContractStats() {
        try {
            if (!this.contract) {
                this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
            }
            
            const stats = await this.contract.methods.getContractStats().call();
            
            document.getElementById('totalCredits').textContent = stats.totalCredits;
            document.getElementById('currentPrice').textContent = `${this.web3.utils.fromWei(stats.currentPrice, 'ether')} ETH`;
            
        } catch (error) {
            console.error('Error loading contract stats:', error);
            document.getElementById('totalCredits').textContent = 'Error';
            document.getElementById('currentPrice').textContent = 'Error';
        }
    }
    
    async loadUserData() {
        if (!this.currentAccount || !this.contract) return;
        
        try {
            // Load user balance
            const balance = await this.contract.methods.getCarbonBalance(this.currentAccount).call();
            document.getElementById('carbonBalance').textContent = `${balance} Carbon Credits`;
            document.getElementById('userBalance').textContent = `${balance} Credits`;
            
            // Load user credits
            await this.loadUserCredits();
            
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
    
    async loadUserCredits() {
        try {
            const creditIds = await this.contract.methods.getUserCredits(this.currentAccount).call();
            const creditsList = document.getElementById('userCreditsList');
            
            if (creditIds.length === 0) {
                creditsList.innerHTML = '<p class="no-credits">You don\'t have any carbon credits yet.</p>';
                return;
            }
            
            let creditsHTML = '';
            for (let i = 0; i < Math.min(creditIds.length, 10); i++) { // Limit to 10 for performance
                try {
                    const credit = await this.contract.methods.getCarbonCredit(creditIds[i]).call();
                    const date = new Date(parseInt(credit.timestamp) * 1000).toLocaleDateString();
                    
                    creditsHTML += `
                        <div class="credit-item">
                            <h4>🏭 ${credit.projectName}</h4>
                            <p><strong>Amount:</strong> ${credit.amount} Credits</p>
                            <p><strong>Created:</strong> ${date}</p>
                            <p><strong>Description:</strong> ${credit.description}</p>
                            <p><strong>Status:</strong> ${credit.verified ? '✅ Verified' : '⏳ Pending'}</p>
                        </div>
                    `;
                } catch (error) {
                    console.error(`Error loading credit ${creditIds[i]}:`, error);
                }
            }
            
            creditsList.innerHTML = creditsHTML;
            
        } catch (error) {
            console.error('Error loading user credits:', error);
        }
    }
    
    updateTotalCost() {
        const amount = document.getElementById('buyAmount').value;
        const priceText = document.getElementById('currentPrice').textContent;
        
        if (amount && priceText !== 'Error' && priceText !== 'Loading...') {
            const pricePerCredit = parseFloat(priceText.split(' ')[0]);
            const totalCost = (amount * pricePerCredit).toFixed(6);
            document.getElementById('totalCost').textContent = `${totalCost} ETH`;
        } else {
            document.getElementById('totalCost').textContent = '0 ETH';
        }
    }
    
    async mintCarbonCredits() {
        if (!this.currentAccount || !this.contract) {
            this.showError('Please connect your wallet first.');
            return;
        }
        
        const amount = document.getElementById('mintAmount').value;
        const projectName = document.getElementById('projectName').value;
        const description = document.getElementById('projectDescription').value;
        
        if (!amount || !projectName) {
            this.showError('Please fill in all required fields.');
            return;
        }
        
        try {
            this.showLoading();
            
            const result = await this.contract.methods
                .mintCarbonCredit(amount, projectName, description)
                .send({ from: this.currentAccount });
            
            this.hideLoading();
            this.showSuccess(`Successfully minted ${amount} carbon credits! Transaction: ${result.transactionHash}`);
            
            // Reset form
            document.getElementById('mintForm').reset();
            
            // Reload data
            await this.loadContractStats();
            await this.loadUserData();
            
        } catch (error) {
            this.hideLoading();
            console.error('Error minting credits:', error);
            this.showError('Failed to mint carbon credits. You may not be authorized or there was a network error.');
        }
    }
    
    async buyCarbonCredits() {
        if (!this.currentAccount || !this.contract) {
            this.showError('Please connect your wallet first.');
            return;
        }
        
        const seller = document.getElementById('sellerAddress').value;
        const amount = document.getElementById('buyAmount').value;
        
        if (!seller || !amount) {
            this.showError('Please fill in all required fields.');
            return;
        }
        
        if (!this.web3.utils.isAddress(seller)) {
            this.showError('Invalid seller address.');
            return;
        }
        
        try {
            this.showLoading();
            
            // Calculate total cost
            const stats = await this.contract.methods.getContractStats().call();
            const totalCost = this.web3.utils.toBN(stats.currentPrice).mul(this.web3.utils.toBN(amount));
            
            const result = await this.contract.methods
                .buyCarbonCredits(seller, amount)
                .send({ 
                    from: this.currentAccount,
                    value: totalCost
                });
            
            this.hideLoading();
            this.showSuccess(`Successfully purchased ${amount} carbon credits! Transaction: ${result.transactionHash}`);
            
            // Reset form
            document.getElementById('buyForm').reset();
            document.getElementById('totalCost').textContent = '0 ETH';
            
            // Reload data
            await this.loadContractStats();
            await this.loadUserData();
            
        } catch (error) {
            this.hideLoading();
            console.error('Error buying credits:', error);
            this.showError('Failed to buy carbon credits. Check seller balance and your ETH balance.');
        }
    }
    
    async checkBalance() {
        const address = document.getElementById('balanceAddress').value;
        
        if (!address) {
            this.showError('Please enter an address.');
            return;
        }
        
        if (!this.web3.utils.isAddress(address)) {
            this.showError('Invalid address format.');
            return;
        }
        
        try {
            if (!this.contract) {
                this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
            }
            
            const balance = await this.contract.methods.getCarbonBalance(address).call();
            
            document.getElementById('balanceAmount').textContent = balance;
            document.getElementById('balanceResult').classList.remove('hidden');
            
        } catch (error) {
            console.error('Error checking balance:', error);
            this.showError('Failed to check balance. Please try again.');
        }
    }
    
    // Utility methods
    showLoading() {
        document.getElementById('loadingModal').classList.remove('hidden');
    }
    
    hideLoading() {
        document.getElementById('loadingModal').classList.add('hidden');
    }
    
    showSuccess(message) {
        document.getElementById('successMessage').textContent = message;
        document.getElementById('successModal').classList.remove('hidden');
    }
    
    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorModal').classList.remove('hidden');
    }
}

// Modal close function
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.proofOfCarbon = new ProofOfCarbon();
});

// Handle page visibility change to refresh data
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.proofOfCarbon && window.proofOfCarbon.currentAccount) {
        window.proofOfCarbon.loadContractStats();
        window.proofOfCarbon.loadUserData();
    }
});