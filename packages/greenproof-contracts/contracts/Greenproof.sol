// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {SolidStateDiamond} from "@solidstate/contracts/proxy/diamond/SolidStateDiamond.sol";
import {LibReward} from "./libraries/LibReward.sol";
import {LibVoting} from "./libraries/LibVoting.sol";
import {LibIssuer} from "./libraries/LibIssuer.sol";
import {LibClaimManager} from "./libraries/LibClaimManager.sol";

contract Greenproof is SolidStateDiamond {
    event IssuerVersionUpdated(uint256 indexed oldVersion, uint256 indexed newVersion);
    event WorkerVersionUpdated(uint256 indexed oldVersion, uint256 indexed newVersion);
    event RevokerVersionUpdated(uint256 indexed oldVersion, uint256 indexed newVersion);
    event ClaimerVersionUpdated(uint256 indexed oldVersion, uint256 indexed newVersion);
    event ClaimManagerUpdated(address indexed oldAddress, address indexed newAddress);

    function updateClaimManager(address newAddress) external {
        address oldAddress = LibClaimManager.setClaimManagerAddress(newAddress);
        emit ClaimManagerUpdated(oldAddress, newAddress);
    }

    function updateIssuerVersion(uint256 newVersion) external {
        uint256 oldVersion = LibClaimManager.setIssuerVersion(newVersion);
        emit IssuerVersionUpdated(oldVersion, newVersion);
    }

    function updateRevokerVersion(uint256 newVersion) external {
        uint256 oldVersion = LibClaimManager.setRevokerVersion(newVersion);
        emit RevokerVersionUpdated(oldVersion, newVersion);
    }

    function updateWorkerVersion(uint256 newVersion) external {
        uint256 oldVersion = LibClaimManager.setWorkerVersion(newVersion);
        emit WorkerVersionUpdated(oldVersion, newVersion);
    }

    function updateClaimerVersion(uint256 newVersion) external {
        uint256 oldVersion = LibClaimManager.setClaimerVersion(newVersion);
        emit ClaimerVersionUpdated(oldVersion, newVersion);
    }
}
