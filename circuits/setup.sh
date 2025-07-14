#!/bin/bash

# Compile circuit
circom vote.circom --r1cs --wasm --sym

# Powers of tau ceremony (for testing - use a proper ceremony for production)
snarkjs powersoftau new bn128 12 pot12_0000.ptau
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v

# Generate zkey
snarkjs groth16 setup vote.r1cs pot12_final.ptau vote_0000.zkey
snarkjs zkey contribute vote_0000.zkey vote_0001.zkey --name="First contribution" -v
snarkjs zkey export verificationkey vote_0001.zkey verification_key.json

echo "Setup complete!"
echo "Files generated:"
echo "- vote.wasm (circuit)"
echo "- vote_0001.zkey (proving key)"
echo "- verification_key.json (verification key)"