//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICertificate {
    function mint(string memory matchInput, bytes32 matchResult) external;
}

contract Certificate {
    mapping(string => bytes32) public matches;

    /// Event emitted after certificate is minted
    event CertificateMinted(string matchInput, bytes32 matchResult);

    function mint(string memory matchInput, bytes32 matchResult)
        external
    {
        matches[matchInput] = matchResult;
        emit CertificateMinted(matchInput, matchResult);
    }
}
