# 🗳️ Private Voting DApp

A decentralized voting application with zero-knowledge privacy built on Arbitrum.

## Features

- **Private Voting**: Uses zero-knowledge proofs to ensure vote privacy
- **Wallet Integration**: Connect with MetaMask or other Web3 wallets
- **Configurable Candidates**: Easy candidate management via JSON configuration
- **Anti-Double Voting**: Cryptographic nullifiers prevent multiple votes
- **Real-time Results**: Live vote tallying with privacy preservation

## Architecture

```
├── circuits/          # Circom ZK circuits for vote privacy
├── contracts/         # Solidity smart contracts
├── frontend/          # React TypeScript frontend
├── config/           # Candidate configuration
└── scripts/          # Deployment and setup scripts
```

## Privacy Model

1. **Registration Phase**: Users register with a commitment hash
2. **Voting Phase**: ZK proofs prove eligibility without revealing identity
3. **Tallying**: Only vote counts are public, not individual choices

## Quick Start

### 1. Install Dependencies

```bash
# Install circuit dependencies
cd circuits && npm install

# Install contract dependencies  
cd ../contracts && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Setup ZK Circuits

```bash
cd circuits
chmod +x setup.sh
./setup.sh
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 4. Deploy Contracts

```bash
cd contracts
npm run deploy
```

### 5. Start Frontend

```bash
cd frontend
npm start
```

## Configuration

### Candidates

Edit `config/candidates.json` to configure voting candidates:

```json
{
  "candidates": [
    {
      "id": 0,
      "name": "Candidate Name",
      "description": "Candidate description"
    }
  ]
}
```

### Network Configuration

The app is configured for Arbitrum mainnet and Sepolia testnet. Update `contracts/hardhat.config.js` for different networks.

## Usage

1. **Connect Wallet**: Click "Connect Wallet" to connect MetaMask
2. **Register**: Generate a secret commitment to register as a voter
3. **Vote**: Select a candidate and cast your private vote
4. **Results**: View real-time vote tallies

## Privacy Features

- **Commitment-Nullifier Scheme**: Prevents vote linkability
- **Zero-Knowledge Proofs**: Prove eligibility without revealing identity
- **Cryptographic Nullifiers**: Prevent double voting
- **On-chain Privacy**: Vote choices never stored on blockchain

## Security Considerations

- Keep your voter secret safe and private
- Use a proper Powers of Tau ceremony for production
- Audit smart contracts before mainnet deployment
- Consider using a relayer for maximum privacy

## Development

### Running Tests

```bash
cd contracts
npm test
```

### Compiling Circuits

```bash
cd circuits
npm run compile
```

### Local Development

For local development, use a local blockchain like Hardhat Network or Ganache.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Disclaimer

This is a demonstration application. Conduct thorough security audits before production use.