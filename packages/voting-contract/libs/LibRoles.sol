//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IClaimManager.sol";

library RolesLibrary {
	function hasRole(
		address _userAddress,
		address _claimManagerAddress,
		bytes32[] memory _roles
	) internal view returns (bool) {
		if (_roles.length == 0) {
			return true;
		}
		IClaimManager claimManager = IClaimManager(_claimManagerAddress); // Contract deployed and maintained by EnergyWeb Fondation
		for (uint256 i = 0; i < _roles.length; i++) {
			if (claimManager.hasRole(_userAddress, _roles[i], 1)) {
				return true;
			}
		}
		return false;
	}

    function isWorker(
		address _user,
		address _claimManagerAddress,
		bytes32 _workerRole
	) internal view returns (bool) {
		IClaimManager claimManager = IClaimManager(_claimManagerAddress); // Contract deployed and maintained by EnergyWeb Fondation

		return (claimManager.hasRole(_user, _workerRole, 1));
	}
}