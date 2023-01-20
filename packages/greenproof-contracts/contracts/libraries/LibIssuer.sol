//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {LibProofManager} from "./LibProofManager.sol";
import {IGreenProof} from "../interfaces/IGreenProof.sol";
import {UintUtils} from "@solidstate/contracts/utils/UintUtils.sol";

library LibIssuer {
    struct IssuerStorage {
        uint256 latestCertificateId;
        uint256 revocablePeriod;
        mapping(bytes32 => uint256) dataToCertificateID;
        mapping(uint256 => IGreenProof.Certificate) certificates;
        // Mapping from token ID to account balances, to track how much of certificate ID a wallet has claimed
        mapping(uint256 => mapping(address => uint256)) claimedBalances;
        mapping(bytes32 => mapping(string => string)) disclosedData;
        //checks that data is disclosed for a specific key (string) of a precise certificate (bytes32)
        mapping(bytes32 => mapping(string => bool)) isDataDisclosed;
        // @notice saving the data needed for future features
        mapping(bytes32 => mapping(bytes32 => uint256)) voteToCertificates;
    }

    event ProofMinted(uint256 indexed certificateID, uint256 indexed volume, address indexed receiver);

    error ForbiddenZeroAddressReceiver();
    error AlreadyCertifiedData(bytes32 dataHash);
    error AlreadyDisclosedData(bytes32 dataHash, string key);
    error VolumeNotInConsensus(uint256 volume, bytes32 dataHash);
    error NotAllowedTransfer(uint256 certificateID, address sender, address receiver);

    bytes32 private constant ISSUER_STORAGE_POSITION = keccak256("ewc.greenproof.issuer.diamond.storage");

    function init(uint256 revocablePeriod) internal {
        IssuerStorage storage issuer = _getStorage();
        issuer.revocablePeriod = revocablePeriod;
    }

    function _incrementProofIndex() internal {
        IssuerStorage storage issuer = _getStorage();
        issuer.latestCertificateId++;
    }

    function _registerProof(bytes32 dataHash, address generatorAddress, uint256 volumeInWei, uint256 certificateID, bytes32 voteID) internal {
        LibIssuer.IssuerStorage storage issuer = _getStorage();

        issuer.certificates[certificateID] = IGreenProof.Certificate({
            isRevoked: false,
            certificateID: certificateID,
            issuanceDate: block.timestamp,
            volume: volumeInWei,
            merkleRootHash: dataHash,
            generator: generatorAddress
        });
        issuer.dataToCertificateID[dataHash] = certificateID;
        issuer.voteToCertificates[voteID][dataHash] = certificateID;
    }

    function _registerClaimedProof(uint256 certificateID, address user, uint256 claimedAmount) internal {
        IssuerStorage storage issuer = _getStorage();
        issuer.claimedBalances[certificateID][user] += claimedAmount;
    }

    function discloseData(bytes32 dataHash, string memory key, string memory value) internal {
        LibIssuer.IssuerStorage storage issuer = _getStorage();

        issuer.disclosedData[dataHash][key] = value;
        issuer.isDataDisclosed[dataHash][key] = true;
    }

    // this prevents duplicate issuance of the same certificate ID
    function preventAlreadyCertified(bytes32 data) internal view {
        IssuerStorage storage issuer = _getStorage();
        uint256 certificateId = issuer.dataToCertificateID[data];

        if (certificateId != 0 && !issuer.certificates[certificateId].isRevoked) {
            revert AlreadyCertifiedData(data);
        }
    }

    function _getCertificate(uint256 certificateID, uint256 volumeInWei) internal view returns (IGreenProof.Certificate memory) {
        IssuerStorage storage issuer = _getStorage();

        return
            IGreenProof.Certificate({
                isRevoked: issuer.certificates[certificateID].isRevoked,
                certificateID: issuer.certificates[certificateID].certificateID,
                issuanceDate: issuer.certificates[certificateID].issuanceDate,
                volume: volumeInWei,
                merkleRootHash: issuer.certificates[certificateID].merkleRootHash,
                generator: issuer.certificates[certificateID].generator
            });
    }

    function _getStorage() internal pure returns (IssuerStorage storage _issuerStorage) {
        bytes32 position = ISSUER_STORAGE_POSITION;

        assembly {
            _issuerStorage.slot := position
        }
    }

    function _getAmountHash(uint256 volume) internal pure returns (bytes32 volumeHash) {
        string memory volumeString = UintUtils.toString(volume);
        volumeHash = keccak256(abi.encodePacked("volume", volumeString));
    }

    function checkNotDisclosed(bytes32 dataHash, string memory key) internal view {
        IssuerStorage storage issuer = _getStorage();

        if (issuer.isDataDisclosed[dataHash][key]) {
            revert AlreadyDisclosedData(dataHash, key);
        }
    }

    function checkAllowedTransfer(uint256 certificateID, address receiver) internal view {
        IssuerStorage storage issuer = _getStorage();

        if (issuer.certificates[certificateID].isRevoked && receiver != issuer.certificates[certificateID].generator) {
            revert NotAllowedTransfer(certificateID, msg.sender, receiver);
        }
    }

    function checkVolumeValidity(uint256 volume, bytes32 dataHash, bytes32[] memory amountProof) internal pure {
        bytes32 volumeHash = _getAmountHash(volume);

        bool isVolumeInConsensus = LibProofManager._verifyProof(dataHash, volumeHash, amountProof);
        if (!isVolumeInConsensus) {
            revert VolumeNotInConsensus(volume, dataHash);
        }
    }

    function preventZeroAddressReceiver(address receiver) internal pure {
        if (receiver == address(0)) {
            revert ForbiddenZeroAddressReceiver();
        }
    }
}
