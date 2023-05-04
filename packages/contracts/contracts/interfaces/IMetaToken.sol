// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

/**
 * @title IMetaToken
 * @author EnergyWeb Foundation
 * @notice interface provding functions to handle SERC issuance.
 */
interface IMetaToken {
    /**
     * @notice event emitted when meta tokens are issued
     * @param tokenID - ID of the meta token to be issued
     * @param receiver - address of the receiver of the issued tokens
     * @param issuanceDate - date of the issuance
     * @param amount - amount of meta tokens to be issued
     */
    event MetaTokenIssued(uint256 indexed tokenID, address indexed receiver, uint256 indexed issuanceDate, uint256 amount);

    /**
     * @notice event emitted when meta tokens are revoked
     * @param tokenID - ID of the meta token to be revoked
     * @param revocationDate - date of the revocation
     */
    event MetaTokenRevoked(uint256 indexed tokenID, uint256 indexed revocationDate);

    error invalidZeroAddress();
    error NotAdmin(address caller);

    /**
     * @notice issueMetaToken - Issues a child token from a parent certificate
     * @param tokenID - ID of the parent certificate
     * @param amount - amount of meta tokens to be issued
     * @param receiver - address of the receiver of the issued meta tokens
     */
    function issueMetaToken(
        uint256 tokenID,
        uint256 amount,
        address receiver,
        string memory tokenUri
    ) external;

    /**
     * @notice tokenSupply - Returns the total supply of a meta token
     * @param id - ID of the meta token
     * @return uint256 - The total supply of the meta token
     */
    function tokenSupply(uint256 id) external view returns (uint256);

    /**
     * @notice revokeMetaToken - Revokes a meta token
     * @param tokenID - ID of the meta token to be revoked
     */
    function revokeMetaToken(uint256 tokenID) external;
}
