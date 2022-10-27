// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IVoting} from "../interfaces/IVoting.sol";
import {LibIssuer} from "../libraries/LibIssuer.sol";
import {LibVoting} from "../libraries/LibVoting.sol";
import {IGreenProof} from "../interfaces/IGreenProof.sol";
import {LibProofManager} from "../libraries/LibProofManager.sol";
import {LibClaimManager} from "../libraries/LibClaimManager.sol";
import {SolidStateERC1155} from "@solidstate/contracts/token/ERC1155/SolidStateERC1155.sol";
import {ERC1155Base} from "@solidstate/contracts/token/ERC1155/base/ERC1155Base.sol";
import {IERC1155} from "@solidstate/contracts/token/ERC1155/IERC1155.sol";

/**
 * @title `IssuerFacet` - The issuance component of the GreenProof core module.
 * @author Energyweb Foundation
 * @notice This facet handles certificates Issuance as Green proofs. Certificates consists of ERC-1155 tokens anchored to merkleRoot hashes of data.
 * @dev This contract is a facet of the EW-GreenProof-Core Diamond, a gas optimized implementation of EIP-2535 Diamond proxy standard : https://eips.ethereum.org/EIPS/eip-2535
 */
contract IssuerFacet is SolidStateERC1155, IGreenProof {
    using LibIssuer for uint256;
    using LibIssuer for bytes32;
    using LibClaimManager for address;

    modifier onlyIssuer() {
        require(msg.sender.isEnrolledIssuer(), "Access: Not an issuer");
        _;
    }

    /**
     * @notice `requestProofIssuance` - An authorized issuer requests proof issuance after a consensus is reached.
     * This runs the automatic data verification and the certificate minting process.
     * @param voteID - The identifier of the vote
     * @param recipient - The address of the wallet which will receive the minted certificate tokens (i.e - generator's wallet)
     * @param dataHash - The merkleRoot hash of the data we are certifying.
     * @param dataProof - The proofs path to verify that data is part of the vote consensus merkleTree
     * @param volume - The amount of generated green ressource (electricity / organic gas /..) we want to certify
     * @param volumeProof - the proofs path to verify that the amount of volume we want to certify is part of the `dataHash` merkleTree.
     * @dev The MerkleProof verification uses the `merkleProof` library provided by openzeppelin/contracts -> https://docs.openzeppelin.com/contracts/3.x/api/cryptography#MerkleProof.
     */
    function requestProofIssuance(
        bytes32 voteID,
        address recipient,
        bytes32 dataHash,
        bytes32[] memory dataProof,
        uint256 volume,
        bytes32[] memory volumeProof,
        string memory tokenUri
    ) external override onlyIssuer {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        if (dataHash._isCertified()) {
            // this prevents duplicate issuance of the same certificate ID
            revert LibIssuer.AlreadyCertifiedData(dataHash);
        }
        bool isVoteInConsensus = LibVoting._isPartOfConsensus(voteID, dataHash, dataProof);
        if (!isVoteInConsensus) {
            revert LibIssuer.NotInConsensus(voteID);
        }

        bytes32 volumeHash = volume._getVolumeHash();
        require(LibProofManager._verifyProof(dataHash, volumeHash, volumeProof), "Volume : Not part of this consensus");

        LibIssuer._incrementProofIndex();
        LibIssuer._registerProof(dataHash, recipient, volume, issuer.lastProofIndex, voteID);
        uint256 volumeInWei = volume * 1 ether;
        _mint(recipient, issuer.lastProofIndex, volumeInWei, "");
        _setTokenURI(issuer.lastProofIndex, tokenUri);
        emit LibIssuer.ProofMinted(issuer.lastProofIndex, volume);
    }

    /**
     * @notice `discloseData` - Publicly exposes specific a information of the certified data.
     * This information is a key-value pair composing the dataHash merkleTree
     * @param key - the key referencing the information inside the certified data set
     * @param value - the actual value of the information
     * @param dataProof - The proofs path to verify that key-value hashed data is part of dataHash merkleTree
     * @param dataHash - The merkleRoot hash of the certified data set.
     */
    function discloseData(
        string memory key,
        string memory value,
        bytes32[] memory dataProof,
        bytes32 dataHash
    ) external override onlyIssuer {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        require(issuer.isDataDisclosed[dataHash][key] == false, "Disclose: data already disclosed");
        bytes32 leaf = keccak256(abi.encodePacked(key, value));
        require(LibProofManager._verifyProof(dataHash, leaf, dataProof), "Disclose : data not verified");

        issuer.disclosedData[dataHash][key] = value;
        issuer.isDataDisclosed[dataHash][key] = true;
    }

    /**
     * @notice `getCertificateOwners` - Get the listing of all the wallets which hold a share of a specific certificate
     * @param certificateID - the id of the minted certificate
     * @return certificateOwners - The List of all users / wallets holding a share of this `certificateID`.
     */
    function getCertificateOwners(uint256 certificateID) external view override returns (address[] memory certificateOwners) {
        certificateOwners = _accountsByToken(certificateID);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override(ERC1155Base, IERC1155) {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        require(id > 0 && id <= issuer.lastProofIndex, "transfer: wrong tokenId");
        require(issuer.mintedProofs[id].isRevoked == false || to == issuer.mintedProofs[id].generator, "non tradable revoked proof");
        super.safeTransferFrom(from, to, id, amount, data);
    }
}
