// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import { LibIssuer } from "../libraries/LibIssuer.sol";
import { IGreenProof } from "../interfaces/IGreenProof.sol";
import { Ownable } from "@solidstate/contracts/access/ownable/Ownable.sol";
import { SolidStateERC1155 } from "@solidstate/contracts/token/ERC1155/SolidStateERC1155.sol";

contract Issuer is SolidStateERC1155, Ownable {
    
     modifier onlyMinter(){
    //TO: set a requirement checking for authorized issuer entity
        _;
    }

    modifier onlyRevoker(){
    //TO: set a requirement checking for authorized revoker entity
        _;
    }

    error NonExistingProof(uint256 proofId);

    /** getStorage: returns a pointer to the storage  */
    function getStorage() internal pure returns (LibIssuer.IssuerStorage storage _issuer) {
        _issuer = LibIssuer._getStorage();
    }

    /** issueProof : Sends a request issuance of a new proof */
    function issueProof(
        address receiver,
        uint256 amount,
        uint256 productType,
        bytes memory data,
        uint256 start,
        uint256 end,
        bytes32 producerRef) external onlyMinter {
        bool isRevoked = false;
        bool isRetired = false;
        
        LibIssuer.IssuerStorage storage issuer = getStorage();
    
        //Proof Ids starts at index 1
        issuer.lastProofIndex++;

        IGreenProof.Proof memory greenProof = IGreenProof.Proof(
            isRevoked,
            isRetired,
            issuer.lastProofIndex,
            productType,
            amount,
            start,
            end,
            producerRef
        );
        issuer.mintedProofs[issuer.lastProofIndex] = greenProof;

        _mint(receiver, productType, amount, data);
        emit LibIssuer.ProofMinted(issuer.lastProofIndex);
    }

    function getProof(uint256 proofID) external view returns(IGreenProof.Proof memory proof){
        LibIssuer.IssuerStorage storage issuer = getStorage();
        
        if( proofID > issuer.lastProofIndex) {
            revert NonExistingProof(proofID);
        }
        proof = issuer.mintedProofs[proofID];
    }

    function revokeProof(uint256 proofID) external onlyRevoker {
        LibIssuer.IssuerStorage storage issuer = getStorage();

        if(proofID > issuer.lastProofIndex) {
            revert NonExistingProof(proofID);
        }
        require(issuer.mintedProofs[proofID].isRevoked == false, "already revoked proof");
        //TO-DO: check that we are not allowed to revoke retired proofs 
        require(issuer.mintedProofs[proofID].isRetired == false, "Not allowed on retired proofs");
        //TO-DO: revoke the proof
        issuer.mintedProofs[proofID].isRevoked = true;
    }

    function retireProof(address from, uint256 proofID) external {
        LibIssuer.IssuerStorage storage issuer = getStorage();

        require(issuer.mintedProofs[proofID].isRevoked == false, "proof revoked");
        require(issuer.mintedProofs[proofID].isRetired == false, "Proof already retired");
        require(msg.sender == from || isApprovedForAll(from, msg.sender), "Not allowed to retire");
        _burn(from, issuer.mintedProofs[proofID].productType, issuer.mintedProofs[proofID].volume);
    }
}
