//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICertificate {
    function mint(string memory matchInput, string memory matchResult) external;
}

contract Certificate {
    mapping(string => string) public matches;

    /// Event emitted after certificate is minted
    event CertificateMinted(string matchInput, string matchResult);

    function mint(string memory matchInput, string memory matchResult)
        external
    {
        matches[matchInput] = matchResult;
        emit CertificateMinted(matchInput, matchResult);
    }
}
