import { utils } from "ethers";
const { FormatTypes, Interface } = utils;

const abi = [
  "function hasRole(address subject, bytes32 role, uint256 version) public view returns(bool)",
];
const iface = new Interface(abi);
export const claimManagerABI = iface.format(FormatTypes.json);
