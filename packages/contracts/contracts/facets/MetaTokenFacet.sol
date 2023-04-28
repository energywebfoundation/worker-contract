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
        address receiver
    ) external {
        LibClaimManager.checkEnrolledIssuer(msg.sender); //verify that the sender is an authorized issuer
        LibIssuer.preventZeroAddressReceiver(receiver); //verify that the receiver is not a zero address
        LibMetaToken.checkAllowedIssuance(receiver, parentCertificateID, amount); // verify that the receiver is allowed to issue this amount meta tokens
        LibMetaToken.issueMetaToken(parentCertificateID, amount, receiver);
        emit MetaTokenIssued(parentCertificateID, receiver, block.timestamp, amount);
    }

    /**
     * @notice `getTokenAddress` - Returns the address of the ERC1155 tokenn contract
     * @return address - The address of the ERC1155 token contract
     */
    function getTokenAddress() external view returns (address) {
        return LibMetaToken.getMetaTokenManager();
    }
}
