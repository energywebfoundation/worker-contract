const { ethers } = require('hardhat');

const issuerRole = ethers.utils.namehash('minter.roles.greenproof.apps.iam.ewc');
const revokerRole = ethers.utils.namehash('revoker.roles.greenproof.apps.iam.ewc');
const workerRole = ethers.utils.namehash('workerRole.roles.greenproof.apps.iam.ewc');
const claimerRole = ethers.utils.namehash('claimerRole.roles.greenproof.apps.iam.ewc');
const approverRole = ethers.utils.namehash('approver.roles.greenproof.apps.iam.ewc');

const roles = {
  issuerRole,
  revokerRole,
  workerRole,
  claimerRole,
  approverRole,
};

const resetRoles = async (claimManagerConfig) => {
    const wallets = await ethers.getSigners();
    await Promise.all(
      wallets.map(async (wallet) =>
        Promise.all(
          Object.values(roles).map(async (role) => setRole(claimManagerConfig, wallet.address, role, 'revoked'))
        )
      )
    );
};

const setRole = async (claimManagerConfig, operator, role, status) => {
  const { claimManagerMocked, claimsRevocationRegistryMocked } = claimManagerConfig;
  let isRevoked;
  switch (status) {
    case 'active':
      isRevoked = false;
      break;
    case 'revoked':
      isRevoked = true;
      break;
    default:
      throw new Error(`Invalid status ${status}: must be "active" or "revoked"`);
  }

  await claimManagerMocked.grantRole(operator, role);
  await claimsRevocationRegistryMocked.isRevoked(
    role,
    operator,
    isRevoked
  );
}

module.exports = { roles, setRole, resetRoles };