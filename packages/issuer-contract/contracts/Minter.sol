// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Import this file to use console.log
import "hardhat/console.sol";
import "./interfaces/IGreenProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";


contract Issuer is Ownable, ERC1155 {
    uint256 lastProofIndex;
    
    modifier onlyMinter(){
    //TO: set a requirement checking for authorized entity
        _;
    }

    mapping(uint256 => IGreenProof.Proof) public mintedProofs;

    constructor(string memory uri) ERC1155(uri) {
    }

    function mint(address receiver, uint256 amount, uint256 productType, bytes memory data, uint256 start, uint256 end, bytes32 producerRef) external onlyMinter {
        bool isRevoked = false;
        IGreenProof.Proof memory greenProof = IGreenProof.Proof(
            lastProofIndex,
            productType,
            amount,
            start,
            end,
            producerRef,
            isRevoked
        );
        mintedProofs[lastProofIndex] = greenProof;
        ERC1155._mint(receiver, productType, amount, data);
    }
}