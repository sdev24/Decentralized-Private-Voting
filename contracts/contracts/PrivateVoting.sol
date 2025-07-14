// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./VoteVerifier.sol";

contract PrivateVoting is Ownable, ReentrancyGuard {
    Groth16Verifier public immutable verifier;
    
    struct Candidate {
        uint256 id;
        string name;
        string description;
        uint256 voteCount;
    }
    
    mapping(address => uint256) public voterCommitments;
    mapping(uint256 => bool) public usedNullifiers;
    mapping(uint256 => Candidate) public candidates;
    
    uint256 public constant MAX_CANDIDATES = 4;
    uint256 public candidateCount;
    uint256 public totalVotes;
    
    uint256 public registrationStart;
    uint256 public registrationEnd;
    uint256 public votingStart;
    uint256 public votingEnd;
    
    bool public votingActive = false;
    bool public registrationActive = false;
    
    event VoterRegistered(address indexed voter, uint256 commitment);
    event VoteCast(uint256 indexed nullifierHash, uint256 candidateId);
    event VotingStarted();
    event VotingEnded();
    event CandidateAdded(uint256 indexed candidateId, string name);
    
    modifier onlyDuringRegistration() {
        require(block.timestamp >= registrationStart && block.timestamp <= registrationEnd, "Registration not active");
        _;
    }
    
    modifier onlyDuringVoting() {
        require(block.timestamp >= votingStart && block.timestamp <= votingEnd, "Voting not active");
        _;
    }
    
    constructor(address _verifier) Ownable(msg.sender) {
        verifier = Groth16Verifier(_verifier);
    }
    
    function addCandidate(string memory _name, string memory _description) external onlyOwner {
        require(candidateCount < MAX_CANDIDATES, "Maximum candidates reached");
        require(!votingActive, "Cannot add candidates during voting");
        
        candidates[candidateCount] = Candidate({
            id: candidateCount,
            name: _name,
            description: _description,
            voteCount: 0
        });
        
        emit CandidateAdded(candidateCount, _name);
        candidateCount++;
    }
    
    function setVotingPeriod(
        uint256 _registrationStart,
        uint256 _registrationEnd,
        uint256 _votingStart,
        uint256 _votingEnd
    ) external onlyOwner {
        require(_registrationStart < _registrationEnd, "Invalid registration period");
        require(_registrationEnd <= _votingStart, "Registration must end before voting");
        require(_votingStart < _votingEnd, "Invalid voting period");
        
        registrationStart = _registrationStart;
        registrationEnd = _registrationEnd;
        votingStart = _votingStart;
        votingEnd = _votingEnd;
        
        registrationActive = true;
        votingActive = true;
    }
    
    function isRegistrationActive() external view returns (bool) {
        return block.timestamp >= registrationStart && block.timestamp <= registrationEnd;
    }
    
    function isVotingActive() external view returns (bool) {
        return block.timestamp >= votingStart && block.timestamp <= votingEnd;
    }
    
    function isVotingEnded() external view returns (bool) {
        return block.timestamp > votingEnd;
    }
    
    function registerVoter(uint256 _commitment) external onlyDuringRegistration {
        require(voterCommitments[msg.sender] == 0, "Already registered");
        require(_commitment != 0, "Invalid commitment");
        
        voterCommitments[msg.sender] = _commitment;
        emit VoterRegistered(msg.sender, _commitment);
    }
    
    function castVote(
        uint256[2] memory _pA,
        uint256[2][2] memory _pB,
        uint256[2] memory _pC,
        uint256[2] memory _pubSignals // [nullifierHash, candidateId]
    ) external onlyDuringVoting nonReentrant {
        uint256 nullifierHash = _pubSignals[0];
        uint256 candidateId = _pubSignals[1];
        
        require(!usedNullifiers[nullifierHash], "Vote already cast");
        require(candidateId < candidateCount, "Invalid candidate");
        
        // Verify the ZK proof
        require(
            verifier.verifyProof(_pA, _pB, _pC, _pubSignals),
            "Invalid proof"
        );
        
        // Record the vote
        usedNullifiers[nullifierHash] = true;
        candidates[candidateId].voteCount++;
        totalVotes++;
        
        emit VoteCast(nullifierHash, candidateId);
    }
    
    function getCandidate(uint256 _candidateId) external view returns (Candidate memory) {
        require(_candidateId < candidateCount, "Invalid candidate ID");
        return candidates[_candidateId];
    }
    
    function getAllCandidates() external view returns (Candidate[] memory) {
        Candidate[] memory allCandidates = new Candidate[](candidateCount);
        for (uint256 i = 0; i < candidateCount; i++) {
            allCandidates[i] = candidates[i];
        }
        return allCandidates;
    }
    
    function getResults() external view returns (uint256[] memory) {
        require(block.timestamp > votingEnd, "Results only available after voting ends");
        uint256[] memory results = new uint256[](candidateCount);
        for (uint256 i = 0; i < candidateCount; i++) {
            results[i] = candidates[i].voteCount;
        }
        return results;
    }
    
    function getCandidatesWithoutVotes() external view returns (Candidate[] memory) {
        Candidate[] memory allCandidates = new Candidate[](candidateCount);
        for (uint256 i = 0; i < candidateCount; i++) {
            allCandidates[i] = Candidate({
                id: candidates[i].id,
                name: candidates[i].name,
                description: candidates[i].description,
                voteCount: 0 // Don't show vote counts until voting ends
            });
        }
        return allCandidates;
    }
}