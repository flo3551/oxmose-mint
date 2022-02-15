// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

contract Whitelist {
    /// root of merkle tree
    bytes32 immutable public merkleRoot;

    constructor(bytes32 _merkleRoot){
        merkleRoot = _merkleRoot;
    }

    function isWhitelisted(
        address account, 
        bytes32[] memory proof, 
        uint256[] memory positions
    ) 
        public 
        view 
        returns(bool) 
    {
        return verify(keccak256(abi.encodePacked(account)), proof, positions);
    }

    function verify(
        bytes32 leaf,
        bytes32[] memory proof,
        uint256[] memory positions
    )
        internal
        view
        returns (bool)
    {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (positions[i] == 1) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == merkleRoot;
    }
            
}