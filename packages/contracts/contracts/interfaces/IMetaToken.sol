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

    /**
     * @notice error emitted when zero address is passed as receiver
     * @dev emitted when zero address is passed as receiver
     */
    error invalidZeroAddress();

    /**
     * @notice error emitted when caller is not admin
     * @dev emitted when caller is not admin
     * @param caller - address of the caller
     */
    error NotAdmin(address caller);

    /**
     * @notice error emitted when an action is performed on a revoked token
     * @dev emitted when an action is performed on a revoked token
     * @param tokenID - ID of the token
     */
    error RevokedToken(uint256 tokenID, uint256 revocationDate);

    /**
     * @notice error emitted on issuance request when meta token issuance is disabled
     */
    error MetaTokenIssuanceDisabled();

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
     * @notice revokeMeToken - Revokes a meta token
     * @dev This function can only be called by the admin
     * @dev This function reverts if the meta token is already revoked
     * @dev the timestamp of the revocation is stored in the tokenRevocationDate mapping
     * @param tokenID - ID of the meta token to be revoked
     */
    function revokeMetaToken(uint256 tokenID) external;

    /**
     * @notice isMetaTokenRevoked - Returns true if the metaToken is revoked
     * @param tokenID - ID of the meta token
     * @return bool - True if the meta token is revoked
     */
    function isMetaTokenRevoked(uint256 tokenID) external view returns (bool);
}
