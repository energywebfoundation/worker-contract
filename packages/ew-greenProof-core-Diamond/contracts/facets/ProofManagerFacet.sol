// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import {LibIssuer} from "../libraries/LibIssuer.sol";
import {IGreenProof} from "../interfaces/IGreenProof.sol";
import {LibClaimManager} from "../libraries/LibClaimManager.sol";
import {LibProofManager} from "../libraries/LibProofManager.sol";
import {ERC1155BaseInternal, ERC1155BaseStorage} from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";

contract ProofManagerFacet is ERC1155BaseInternal {
    modifier onlyRevoker() {
        LibClaimManager.ClaimManagerStorage storage claimStore = LibClaimManager.getStorage();

        uint256 lastRoleVersion = claimStore.roleToVersions[claimStore.revokerRole];
        require(LibClaimManager.isRevoker(msg.sender, lastRoleVersion), "Access: Not enrolled as worker");
        _;
    }

    function retireProof(address from, uint256 proofID) external {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        require(issuer.mintedProofs[proofID].isRevoked == false, "proof revoked");
        require(issuer.mintedProofs[proofID].isRetired == false, "Proof already retired");
        //TODO: isApprovedForAll --> make sure we are alloaw to delegate certificate management
        require(msg.sender == from || LibProofManager._isApprovedForAll(from, msg.sender), "Not allowed to retire");
        _burn(from, issuer.mintedProofs[proofID].productType, issuer.mintedProofs[proofID].volume);
    }

    function revokeProof(uint256 proofID) external onlyRevoker {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();
        uint256 issuanceDate = issuer.mintedProofs[proofID].issuanceDate;

        if (proofID > issuer.lastProofIndex) {
            revert LibIssuer.NonExistingProof(proofID);
        }
        require(issuer.mintedProofs[proofID].isRevoked == false, "already revoked proof");
        if (issuer.mintedProofs[proofID].isRetired && issuanceDate + issuer.revocablePeriod >= block.timestamp) {
            revert LibIssuer.NonRevokableProof(proofID, issuanceDate, block.timestamp);
        }
        issuer.mintedProofs[proofID].isRevoked = true;
        //TO-DO: emit a revocation event
    }

    function getProof(uint256 proofID) external view returns (IGreenProof.Proof memory proof) {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        if (proofID > issuer.lastProofIndex) {
            revert LibIssuer.NonExistingProof(proofID);
        }
        proof = issuer.mintedProofs[proofID];
    }

    function getProofsOf(address userAddress) external view returns (IGreenProof.Proof[] memory) {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        require(issuer.userProofs[userAddress].length != 0, "No proofs for this address");

        return issuer.userProofs[userAddress];
    }
}
