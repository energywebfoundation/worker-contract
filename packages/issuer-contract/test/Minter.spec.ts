// import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
// import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("GreenProofs test", function () {
	describe("Proof issuance", () => {
		it("Authorized issuer can issue proofs", async () => {
			//TO-DO: check that authorized issuer can issue proof
		});
		it("Non authorized issuer cannot issue proofs", async () => {
			//TO-DO: check that non authorized issuer cannot issue proof
		});
	});

	describe("Proof revocation", () => {
		it("should allows an authorized entity to revoke non retired proof", async () => {
			//TODO: check that a non retired proof can be revoked
		});
		it("should revert if the proof is already retired", async () => {
			//TODO: check that a non retired proof can be revoked
		});

		it("should prevent a non authorized entity from revoking non retired proof", async () => {
			//TODO: check that not authorized user cannot revoke a non retired proof
		});

		it("should prevent authorized revoker from revoking a retired proof", async () => {
			//TODO: check thata retired proof cannot be revoked
		});
	});

	describe("Proof retirement", () => {
		it("should allow a user to retire an owned proof", async () => {
			//TODO: check proof retirement by the owner
		});

		it("should allow non owner but allowed operator to retire a proof", async () => {
			//TODO: check proof retirement by approved operator
		});

		it("should prevent a user from retiring a revoked proof", async () => {
			//TODO: check if reverts when retiring a revoked proof
		});

		it("should revert on retiring the same proof multiple times", async () => {
			//TODO: check revert when trying to retire more that once the same proof
		});

		it("should revert when non owner tries to to retire a proof", async () => {
			// TODO: check revert when user tries to retire a not owned proof
		});
	});
});
