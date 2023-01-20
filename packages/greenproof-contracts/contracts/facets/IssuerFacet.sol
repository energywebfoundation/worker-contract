// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {LibIssuer} from "../libraries/LibIssuer.sol";
import {LibVoting} from "../libraries/LibVoting.sol";
import {IGreenProof} from "../interfaces/IGreenProof.sol";
import {LibProofManager} from "../libraries/LibProofManager.sol";
import {LibClaimManager} from "../libraries/LibClaimManager.sol";
import {IERC1155} from "@solidstate/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155Base} from "@solidstate/contracts/token/ERC1155/base/ERC1155Base.sol";
import {SolidStateERC1155} from "@solidstate/contracts/token/ERC1155/SolidStateERC1155.sol";

/**
 * @title `IssuerFacet` - The issuance component of the GreenProof core module.
 * @author Energyweb Foundation
 * @notice This facet handles certificates Issuance as Green proofs. Certificates consists of ERC-1155 tokens anchored to merkleRoot hashes of data.
 * @dev This contract is a facet of the EW-GreenProof-Core Diamond, a gas optimized implementation of EIP-2535 Diamond proxy standard : https://eips.ethereum.org/EIPS/eip-2535
 */
contract IssuerFacet is SolidStateERC1155, IGreenProof {
    event ProofMinted(uint256 indexed certificateID, uint256 indexed volume, address indexed receiver);

    modifier onlyIssuer() {
        LibClaimManager.checkEnrolledIssuer(msg.sender);
        _;
    }

    /**
     * @notice `requestProofIssuance` - An authorized issuer requests proof issuance after a consensus is reached.
     * This runs the automatic data verification and the certificate minting process.
     * @param voteID - The identifier of the vote
     * @param generator - The address of the wallet which will receive the minted certificate tokens (i.e - generator's wallet)
     * @param dataHash - The merkleRoot hash of the data we are certifying.
     * @param dataProof - The proofs path to verify that data is part of the vote consensus merkleTree
     * @param volume - The amount of generated green resource (electricity / organic gas /..) we want to certify
     * @param amountProof - the proofs path to verify that the amount we want to certify is part of the `dataHash` merkleTree.
     * @dev The MerkleProof verification uses the `merkleProof` library provided by openzeppelin/contracts -> https://docs.openzeppelin.com/contracts/3.x/api/cryptography#MerkleProof.
     * @dev The generator address can not be the zero address
     */
    function requestProofIssuance(
        bytes32 voteID,
        address generator,
        bytes32 dataHash,
        bytes32[] memory dataProof,
        uint256 volume,
        bytes32[] memory amountProof,
        string memory tokenUri
    ) external onlyIssuer {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        LibIssuer.preventZeroAddressReceiver(generator);
        LibIssuer.preventAlreadyCertified(dataHash);
        LibVoting.checkVoteInConsensus(voteID, dataHash, dataProof);
        LibIssuer.checkVolumeValidity(volume, dataHash, amountProof);
        LibIssuer._incrementProofIndex();
        uint256 volumeInWei = volume * 1 ether;
        LibIssuer._registerProof(dataHash, generator, volumeInWei, issuer.latestCertificateId, voteID);

        _safeMint(generator, issuer.latestCertificateId, volumeInWei, "");
        _setTokenURI(issuer.latestCertificateId, tokenUri);
        emit ProofMinted(issuer.latestCertificateId, volumeInWei, generator);
    }

    /**
     * @notice `discloseData` - Publicly exposes specific a information of the certified data.
     * This information is a key-value pair composing the dataHash merkleTree
     * @param key - the key referencing the information inside the certified data set
     * @param value - the actual value of the information
     * @param dataProof - The proofs path to verify that key-value hashed data is part of dataHash merkleTree
     * @param dataHash - The merkleRoot hash of the certified data set.
     */
    function discloseData(string memory key, string memory value, bytes32[] memory dataProof, bytes32 dataHash) external override onlyIssuer {
        bytes32 leaf = keccak256(abi.encodePacked(key, value));

        LibIssuer.checkNotDisclosed(dataHash, key);
        LibProofManager.checkProofValidity(dataHash, leaf, dataProof);
        LibIssuer.discloseData(dataHash, key, value);
    }

    /**
     * @notice `getCertificateOwners` - Get the listing of all the wallets which hold a share of a specific certificate
     * @param certificateID - the id of the minted certificate
     * @return certificateOwners - The List of all users / wallets holding a share of this `certificateID`.
     */
    function getCertificateOwners(uint256 certificateID) external view returns (address[] memory certificateOwners) {
        certificateOwners = _accountsByToken(certificateID);
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) public override(ERC1155Base, IERC1155) {
        LibIssuer.checkAllowedTransfer(id, to);
        super.safeTransferFrom(from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override(ERC1155Base, IERC1155) {
        uint256 numberOfIds = ids.length;
        for (uint256 i; i < numberOfIds; i++) {
            LibIssuer.checkAllowedTransfer(ids[i], to);
        }
        super.safeBatchTransferFrom(from, to, ids, amounts, data);
    }
}
