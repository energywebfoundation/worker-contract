import { expect, use } from "chai";
import { ethers, userConfig } from "hardhat";
import { ContractFactory, Contract  } from "ethers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { Fixture, solidity, loadFixture, MockProvider } from "ethereum-waffle";
import { MockContract, deployMockContract } from "@ethereum-waffle/mock-contract";
import { roleManagerInterface } from "./utils"
use(solidity);

let issuerContrcat: Contract;
let IssuerFactory: ContractFactory;

describe("GreenProofs test", function () {

    beforeEach(async () => {
        IssuerFactory = await ethers.getContractFactory("Issuer");
        issuerContrcat = await IssuerFactory.deploy("");

        /** Mocking ClaimManager */
    });

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

        it ("should revert when non owner tries to to retire a proof", async () => {
            // TODO: check revert when user tries to retire a not owned proof
        });


    });
});
