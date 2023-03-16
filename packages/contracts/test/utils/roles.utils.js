const { ethers } = require('hardhat');

const issuerRole = ethers.utils.namehash('minter.roles.greenproof.apps.iam.ewc');
const revokerRole = ethers.utils.namehash('revoker.roles.greenproof.apps.iam.ewc');
const workerRole = ethers.utils.namehash('workerRole.roles.greenproof.apps.iam.ewc');
const claimerRole = ethers.utils.namehash('claimerRole.roles.greenproof.apps.iam.ewc');
const approverRole = ethers.utils.namehash('approver.roles.greenproof.apps.iam.ewc');
const transferRole = ethers.utils.namehash('transferRole.roles.greenproof.apps.iam.ewc');

const roles = {
  issuerRole,
  revokerRole,
  workerRole,
  claimerRole,
  approverRole,
  transferRole
};

module.exports = { roles };