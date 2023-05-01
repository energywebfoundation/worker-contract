//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;
import {IMetaToken} from "../interfaces/IMetaToken.sol";
import {IERC1155} from "@solidstate/contracts/token/ERC1155/IERC1155.sol";

library LibMetaToken {
    struct MetaTokenStorage {
        // address of the deployed ERC1155 meta token contract
        address metaTokenManager;
        // Mapping from parent certificate ID to the amount of meta tokens issued
        mapping(address => mapping(uint256 => uint256)) metaTokenIssued;
    }

    event MetaTokenIssued(uint256 indexed parentCertificateID, address indexed receiver, uint256 timestamp, uint256 amount);

    /**
     * @notice NotAllowedIssuance - error raised when a user tries to issue more meta certificates than owned balance of parent certificate
     * @dev Error: Issuance of the meta-certificate is not allowed
     * @param certificateID ID of the parent certificate
     * @param receiver address of the receiver of the certificate
     * @param toIssueVolume volume of the certificate
     * @param availableVolume available volume of the parent certificate
     */
    error NotAllowedIssuance(uint256 certificateID, address receiver, uint256 toIssueVolume, uint256 availableVolume);

    /**
     * @dev Tracking the storage position of the issuerStorage
     */
    bytes32 private constant _META_TOKEN_STORAGE_POSITION = keccak256("ewc.greenproof.metaToken.diamond.storage");

    /**
     * @notice checkAllowedIssuance - checks if the receiver is allowed to issue this amount of meta tokens
     * @param receiver address of the receiver of the meta tokens
     * @param parentCertificateID ID of the parent certificate
     * @param toIssueVolume volume of the meta tokens to be issued
     * @dev Error: Issuance of the meta-certificate is not allowed
     * @dev reverts if the receiver is not allowed to issue this amount of meta tokens
     */
    function checkAllowedIssuance(
        address receiver,
        uint256 parentCertificateID,
        uint256 toIssueVolume
    ) internal view {
        uint256 availableParentVolume = IERC1155(address(this)).balanceOf(receiver, parentCertificateID);
        uint256 alreadyIssuedVolume = getStorage().metaTokenIssued[receiver][parentCertificateID];
        uint256 allowedIssuanceVolume = availableParentVolume - alreadyIssuedVolume;
        if (availableParentVolume == 0 || allowedIssuanceVolume < toIssueVolume) {
            revert NotAllowedIssuance(parentCertificateID, receiver, toIssueVolume, allowedIssuanceVolume);
        }
    }

    /**
     * @notice issueSerc - Issues SERC tokens
     * @param safcParentID - ID of the parent SAFC certificate
     * @param amount - Amount of SERC to issue
     * @param receiver - Address of the receiver of the SERC
     */
    function issueMetaToken(
        uint256 safcParentID,
        uint256 amount,
        address receiver,
        string memory tokenUri
    ) internal {
        address metaTokenAddress = getMetaTokenManager();
        IMetaToken(metaTokenAddress).issueMetaToken(safcParentID, amount, receiver, tokenUri);
        getStorage().metaTokenIssued[receiver][safcParentID] += amount;
    }

    /**
     * @notice getMetaTokenManager - Gets the address of the deployed ERC1155 meta token contract
     * @return metaTokenManager - The address of the deployed ERC1155 meta token contract
     */
    function getMetaTokenManager() internal view returns (address) {
        MetaTokenStorage storage tokenStorage = getStorage();

        return tokenStorage.metaTokenManager;
    }

    /**
     * @dev Get the storage slot for MetaTokenStorage struct
     * @return metaTokenStorage - The pointer to the MetaToken storage
     */
    function getStorage() internal pure returns (MetaTokenStorage storage metaTokenStorage) {
        bytes32 position = _META_TOKEN_STORAGE_POSITION;

        /* solhint-disable-next-line no-inline-assembly */
        assembly {
            metaTokenStorage.slot := position
        }
    }
}
