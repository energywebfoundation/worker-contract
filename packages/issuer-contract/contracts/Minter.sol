// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Import this file to use console.log
import "hardhat/console.sol";
import "./interfaces/IGreenProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract Issuer is Ownable, ERC1155 {
    uint256 lastProofIndex;

    modifier onlyMinter() {
        //TO: set a requirement checking for authorized issuer entity
        _;
    }
    modifier onlyRevoker() {
        //TO: set a requirement checking for authorized revoker entity
        _;
    }

    mapping(uint256 => IGreenProof.Proof) public mintedProofs;

    constructor(string memory uri) ERC1155(uri) {}

    //TO-DO: precising the format of data inputs : bytes encoded or distinctly provided
    function issueProof(
        address receiver,
        uint256 amount,
        uint256 productType,
        bytes memory data,
        uint256 start,
        uint256 end,
        bytes32 producerRef
    ) external onlyMinter {
        bool isRevoked = false;
        bool isRetired = false;
        IGreenProof.Proof memory greenProof = IGreenProof.Proof(
            isRevoked,
            isRetired,
            lastProofIndex,
            productType,
            amount,
            start,
            end,
            producerRef
        );
        mintedProofs[lastProofIndex] = greenProof;

        _mint(receiver, productType, amount, data);
    }

    function getProof(uint256 proofIndex)
        external
        view
        returns (IGreenProof.Proof memory proof)
    {
        proof = mintedProofs[proofIndex];
    }

    function revokeProof(uint256 proofIndex) external onlyRevoker {
        require(
            mintedProofs[proofIndex].isRevoked == false,
            "already revoked proof"
        );
        //TO-DO: check that we are not allowed to revoke retired proofs
        require(
            mintedProofs[proofIndex].isRetired == false,
            "Not allowed on retired proofs"
        );
        //TO-DO: revoke the proof
        mintedProofs[proofIndex].isRevoked = true;
    }

    function retireProof(address from, uint256 proofIndex) external {
        require(mintedProofs[proofIndex].isRevoked == false, "proof revoked");
        require(
            mintedProofs[proofIndex].isRetired == false,
            "Proof already retired"
        );
        require(
            _msgSender() == from || isApprovedForAll(from, _msgSender()),
            "Not allowed to retire"
        );
        _burn(
            from,
            mintedProofs[proofIndex].productType,
            mintedProofs[proofIndex].volume
        );
    }
}
