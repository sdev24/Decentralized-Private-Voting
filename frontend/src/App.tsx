import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import candidates from '../config/candidates.json';
import './App.css';

interface Candidate {
  id: number;
  name: string;
  description: string;
  voteCount?: number;
}

interface VotingState {
  isConnected: boolean;
  account: string;
  isRegistered: boolean;
  hasVoted: boolean;
  votingActive: boolean;
  registrationActive: boolean;
}

const VOTING_CONTRACT_ADDRESS = '0xD0AE33BB361D1edA6d8002a8DC972220b4Da8c11';
const VOTING_ABI = [
  "function registerVoter(uint256 _commitment) external",
  "function castVote(uint256[2] memory _pA, uint256[2] memory _pB, uint256[2] memory _pC, uint256[2] memory _pubSignals) external",
  "function getAllCandidates() external view returns (tuple(uint256 id, string name, string description, uint256 voteCount)[])",
  "function voterCommitments(address) external view returns (uint256)",
  "function votingActive() external view returns (bool)",
  "function registrationActive() external view returns (bool)",
  "function totalVotes() external view returns (uint256)"
];

function App() {
  const [votingState, setVotingState] = useState<VotingState>({
    isConnected: false,
    account: '',
    isRegistered: false,
    hasVoted: false,
    votingActive: false,
    registrationActive: false
  });
  
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [candidateData, setCandidateData] = useState<Candidate[]>(candidates.candidates);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState<string>('');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connectWallet();
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setLoading(true);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const account = await signer.getAddress();
        
        const contract = new Contract(VOTING_CONTRACT_ADDRESS, VOTING_ABI, signer);
        
        setProvider(provider);
        setContract(contract);
        setVotingState(prev => ({ ...prev, isConnected: true, account }));
        
        // Check registration and voting status
        await checkUserStatus(contract, account);
        
      } catch (error) {
        console.error('Error connecting wallet:', error);
      } finally {
        setLoading(false);
      }
    } else {
      alert('Please install MetaMask to use this application');
    }
  };

  const checkUserStatus = async (contract: Contract, account: string) => {
    try {
      const commitment = await contract.voterCommitments(account);
      const isRegistered = commitment !== 0n;
      const votingActive = await contract.votingActive();
      const registrationActive = await contract.registrationActive();
      
      setVotingState(prev => ({
        ...prev,
        isRegistered,
        votingActive,
        registrationActive
      }));
      
      // Load candidate data with vote counts
      const contractCandidates = await contract.getAllCandidates();
      const updatedCandidates = contractCandidates.map((c: any) => ({
        id: Number(c.id),
        name: c.name,
        description: c.description,
        voteCount: Number(c.voteCount)
      }));
      setCandidateData(updatedCandidates);
      
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  const generateSecret = () => {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const secretHex = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setSecret(secretHex);
    return secretHex;
  };

  const registerVoter = async () => {
    if (!contract) return;
    
    try {
      setLoading(true);
      
      // Generate secret if not already generated
      const voterSecret = secret || generateSecret();
      
      // For simplicity, we'll use a basic hash for the commitment
      // In production, use proper Poseidon hash
      const commitment = BigInt('0x' + voterSecret.slice(0, 64));
      
      const tx = await contract.registerVoter(commitment);
      await tx.wait();
      
      setVotingState(prev => ({ ...prev, isRegistered: true }));
      alert('Registration successful! Keep your secret safe.');
      
    } catch (error) {
      console.error('Error registering voter:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const castVote = async () => {
    if (!contract || selectedCandidate === null) return;
    
    try {
      setLoading(true);
      
      // For demo purposes, we'll use placeholder proof values
      // In production, generate real ZK proofs using snarkjs
      const proof = {
        a: ["0x1", "0x2"],
        b: ["0x3", "0x4"],
        c: ["0x5", "0x6"],
        publicSignals: [
          BigInt('0x' + secret.slice(0, 32)), // nullifier hash
          BigInt(selectedCandidate) // candidate ID
        ]
      };
      
      const tx = await contract.castVote(
        proof.a,
        proof.b,
        proof.c,
        proof.publicSignals
      );
      await tx.wait();
      
      setVotingState(prev => ({ ...prev, hasVoted: true }));
      alert('Vote cast successfully!');
      
      // Refresh candidate data
      if (votingState.account) {
        await checkUserStatus(contract, votingState.account);
      }
      
    } catch (error) {
      console.error('Error casting vote:', error);
      alert('Vote failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🗳️ Private Voting DApp</h1>
        <p>Decentralized voting with zero-knowledge privacy</p>
      </header>

      <main className="App-main">
        {!votingState.isConnected ? (
          <div className="wallet-section">
            <button 
              onClick={connectWallet} 
              disabled={loading}
              className="connect-button"
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        ) : (
          <>
            <div className="status-section">
              <p>Connected: {votingState.account.slice(0, 6)}...{votingState.account.slice(-4)}</p>
              <div className="status-indicators">
                <span className={`status ${votingState.registrationActive ? 'active' : 'inactive'}`}>
                  Registration: {votingState.registrationActive ? 'Active' : 'Inactive'}
                </span>
                <span className={`status ${votingState.votingActive ? 'active' : 'inactive'}`}>
                  Voting: {votingState.votingActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {votingState.registrationActive && !votingState.isRegistered && (
              <div className="registration-section">
                <h2>Register to Vote</h2>
                <p>You need to register before you can vote. This will generate a secret commitment.</p>
                <button 
                  onClick={registerVoter}
                  disabled={loading}
                  className="register-button"
                >
                  {loading ? 'Registering...' : 'Register'}
                </button>
              </div>
            )}

            {votingState.isRegistered && votingState.votingActive && !votingState.hasVoted && (
              <div className="voting-section">
                <h2>Cast Your Vote</h2>
                <p>Select a candidate and cast your private vote:</p>
                
                <div className="candidates-grid">
                  {candidateData.map((candidate) => (
                    <div 
                      key={candidate.id}
                      className={`candidate-card ${selectedCandidate === candidate.id ? 'selected' : ''}`}
                      onClick={() => setSelectedCandidate(candidate.id)}
                    >
                      <h3>{candidate.name}</h3>
                      <p>{candidate.description}</p>
                      <div className="vote-count">
                        Votes: {candidate.voteCount || 0}
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={castVote}
                  disabled={loading || selectedCandidate === null}
                  className="vote-button"
                >
                  {loading ? 'Casting Vote...' : 'Cast Vote'}
                </button>
              </div>
            )}

            {votingState.hasVoted && (
              <div className="results-section">
                <h2>✅ Vote Cast Successfully!</h2>
                <p>Your vote has been recorded privately on the blockchain.</p>
              </div>
            )}

            <div className="results-section">
              <h2>Current Results</h2>
              <div className="results-grid">
                {candidateData.map((candidate) => (
                  <div key={candidate.id} className="result-card">
                    <h3>{candidate.name}</h3>
                    <div className="vote-count">
                      {candidate.voteCount || 0} votes
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;