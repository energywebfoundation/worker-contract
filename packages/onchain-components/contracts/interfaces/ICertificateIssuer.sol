//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IGreenProof.sol";

interface ICertificateIssuer {
    function issueProof(
        address receiver,
        uint256 amount,
        uint256 productType,
        bytes memory data,
        uint256 start,
        uint256 end,
        bytes32 producerRef
    ) external;

    function getProof(uint256 proofID) external view returns(IGreenProof.Proof memory proof);
    function retireProof(address from, uint256 proofID) external;
    function requestIssuance(string memory winningMatch) external;
}
