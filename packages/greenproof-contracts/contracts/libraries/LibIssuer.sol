//SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IVoting} from "../interfaces/IVoting.sol";
import {IGreenProof} from "../interfaces/IGreenProof.sol";
import {UintUtils} from "@solidstate/contracts/utils/UintUtils.sol";
import {ERC1155BaseInternal} from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";
import {ERC1155EnumerableInternal} from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155EnumerableInternal.sol";

library LibIssuer {
    bytes32 constant ISSUER_STORAGE_POSITION = keccak256("ewc.greenproof.issuer.diamond.storage");
    bytes32 constant DEFAULT_VCREDENTIAL_VALUE = "";

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
        mapping(bytes32 => mapping(bytes32 => uint256)) voteToCertificates;
    }

    event ProofMinted(uint256 indexed certificateID, uint256 indexed volume, address indexed receiver);

    error NonExistingCertificate(uint256 certificateID);
    error NonRevokableCertificate(uint256 certificateID, uint256 issuanceDate, uint256 revocableDateLimit);
    error NotInConsensus(bytes32 voteID);
    error AlreadyCertifiedData(bytes32 dataHash);

    function init(uint256 revocablePeriod) internal {
        IssuerStorage storage issuer = _getStorage();
        issuer.revocablePeriod = revocablePeriod;
    }

    function _incrementProofIndex() internal {
        IssuerStorage storage issuer = _getStorage();
        issuer.latestCertificateId++;
    }

    function _registerProof(
        bytes32 dataHash,
        address generatorAddress,
        uint256 amount,
        uint256 certificateID,
        bytes32 voteID
    ) internal {
        LibIssuer.IssuerStorage storage issuer = _getStorage();

        issuer.certificates[certificateID] = IGreenProof.Certificate({
            isRevoked: false,
            certificateID: certificateID,
            issuanceDate: block.timestamp,
            volume: amount,
            merkleRootHash: dataHash,
            generator: generatorAddress
        });
        issuer.dataToCertificateID[dataHash] = certificateID;
        issuer.voteToCertificates[voteID][dataHash] = certificateID;
    }

    function _registerClaimedProof(
        uint256 certificateID,
        address user,
        uint256 claimedAmount
    ) internal {
        IssuerStorage storage issuer = _getStorage();
        issuer.claimedBalances[certificateID][user] += claimedAmount;
    }

    function _isCertified(bytes32 _data) internal view returns (bool) {
        IssuerStorage storage issuer = _getStorage();
        uint256 certificateId = issuer.dataToCertificateID[_data];

        if (certificateId == 0) {
            return false;
        }

        return !issuer.certificates[certificateId].isRevoked;
    }

    function _getCertificate(uint256 certificateID, uint256 volume) internal view returns (IGreenProof.Certificate memory) {
        IssuerStorage storage issuer = _getStorage();

        return
            IGreenProof.Certificate({
                isRevoked: issuer.certificates[certificateID].isRevoked,
                certificateID: issuer.certificates[certificateID].certificateID,
                issuanceDate: issuer.certificates[certificateID].issuanceDate,
                volume: volume,
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
        string memory volumeString = UintUtils.toString(volume / 1 ether);
        volumeHash = keccak256(abi.encodePacked("volume", volumeString));
    }
}
