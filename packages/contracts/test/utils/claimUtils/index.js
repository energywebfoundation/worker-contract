const { initMockClaimManager } = require('./claimManager.utils');
const { initMockClaimRevoker } = require('./claimRevocation.utils');

const initClaimManager = async (admin) => {
  const claimManagerMocked = await initMockClaimManager(admin);
  const claimsRevocationRegistryMocked = await initMockClaimRevoker(admin);

  const claimManagerConfig = {
    claimManagerMocked,
    claimsRevocationRegistryMocked,
  }

  return claimManagerConfig;

}


module.exports = { initClaimManager };