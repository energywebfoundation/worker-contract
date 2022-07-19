//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICertificate {
    function mint(bytes32 matchInput, bytes32 matchResult) external;
}

contract Certificate {
    mapping(bytes32 => bytes32) public matches;

    /// Event emitted after certificate is minted
    event CertificateMinted(bytes32 matchInput, bytes32 matchResult);

    function mint(bytes32 matchInput, bytes32 matchResult)
        external
    {
        matches[matchInput] = matchResult;
        emit CertificateMinted(matchInput, matchResult);
    }
}
