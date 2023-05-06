// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;
import {LibIssuer} from "../libraries/LibIssuer.sol";
import {IMetaToken} from "../interfaces/IMetaToken.sol";
import {LibMetaToken} from "../libraries/LibMetaToken.sol";
import {LibClaimManager} from "../libraries/LibClaimManager.sol";

contract MetaTokenFacet is IMetaToken {
    /**
     * @notice `issueMetaToken` - Issues a child token from a parent certificate
     * @param parentCertificateID - The ID of the parent certificate
     * @param amount - The amount of SERC to be issued
     * @param receiver - The address of the receiver of the issued SERC tokens
     */
    function issueMetaToken(
        uint256 parentCertificateID,
        uint256 amount,
        address receiver,
        string memory tokenUri
    ) external {
        LibClaimManager.checkEnrolledIssuer(msg.sender); //verify that the sender is an authorized issuer
        LibMetaToken.issueMetaToken(parentCertificateID, amount, receiver, tokenUri);
        emit MetaTokenIssued(parentCertificateID, receiver, block.timestamp, amount);
    }

    /**
     * @notice `revokeMetaToken` - Revokes a meta token
     * @param tokenID - ID of the meta token to be revoked
     * @dev This function can only be called by an authorized revoker
     */
    function revokeMetaToken(uint256 tokenID) external {
        LibClaimManager.checkEnrolledRevoker(msg.sender); //verify that the sender is an authorized revoker
        LibMetaToken.revokeMetaToken(tokenID);
        emit MetaTokenRevoked(tokenID, block.timestamp);
    }

    /**
     * @notice `getTokenAddress` - Returns the address of the ERC1155 tokenn contract
     * @return address - The address of the ERC1155 token contract
     */
    function getMetaTokenAddress() external view returns (address) {
        return LibMetaToken.getMetaTokenAddress();
    }

    /**
     * @notice tokenSupply - Returns the total supply of a meta token
     * @param id - ID of the meta token
     * @return uint256 - The total supply of the meta token
     */
    function tokenSupply(uint256 id) external view returns (uint256) {
        return LibMetaToken.totalSupply(id);
    }

    /**
     * @notice isMetaTokenRevoked - Returns true if the metaToken is revoked
     * @param tokenID - ID of the meta token
     * @return bool - True if the meta token is revoked
     */
    function isMetaTokenRevoked(uint256 tokenID) external view returns (bool) {
        return LibMetaToken.isMetaTokenRevoked(tokenID);
    }
}
