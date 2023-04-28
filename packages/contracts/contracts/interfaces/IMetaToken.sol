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
        address receiver
    ) external;
}
