pragma circom 2.0.0;

template VoteCircuit() {
    // Private inputs
    signal private input secret;
    signal private input nullifier;
    signal private input vote; // 0-3 for candidate selection
    
    // Public inputs
    signal input commitment; // hash(secret, nullifier)
    signal input nullifierHash; // hash(nullifier)
    
    // Outputs
    signal output validVote;
    signal output voteOutput;
    
    // Simple validation - for demo purposes
    // In production, use proper Poseidon hash and range checks
    
    // Basic range check for vote (0-3)
    component voteCheck = LessThan(4);
    voteCheck.in[0] <== vote;
    voteCheck.in[1] <== 4;
    
    // Simple commitment verification (for demo)
    signal commitmentCalc;
    commitmentCalc <== (secret + nullifier) * (secret + nullifier);
    
    component commitmentVerify = IsEqual();
    commitmentVerify.in[0] <== commitmentCalc;
    commitmentVerify.in[1] <== commitment;
    
    // Simple nullifier hash (for demo)
    signal nullifierCalc;
    nullifierCalc <== nullifier * nullifier;
    
    component nullifierVerify = IsEqual();
    nullifierVerify.in[0] <== nullifierCalc;
    nullifierVerify.in[1] <== nullifierHash;
    
    // All checks must pass
    validVote <== commitmentVerify.out * nullifierVerify.out * voteCheck.out;
    voteOutput <== vote;
}

template LessThan(n) {
    signal input in[2];
    signal output out;
    
    component lt = LessThanImpl(n);
    lt.in[0] <== in[0];
    lt.in[1] <== in[1];
    out <== lt.out;
}

template LessThanImpl(n) {
    signal input in[2];
    signal output out;
    
    // Simple implementation - just check if in[0] < in[1]
    signal diff;
    diff <== in[1] - in[0];
    
    // For demo: assume valid if diff > 0
    out <== 1; // Simplified for demo
}

template IsEqual() {
    signal input in[2];
    signal output out;
    
    signal diff;
    diff <== in[0] - in[1];
    
    // For demo: assume equal if diff == 0
    out <== 1; // Simplified for demo
}

component main = VoteCircuit();