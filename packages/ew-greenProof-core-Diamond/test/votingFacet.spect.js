const {
    getSelector,
    FacetCutAction,
    removeSelectors,
    findAddressPositionInFacets,
} = require("../scripts/libraries/diamond");

const { assert } = require("chai");
const { ethers, network } = require("hardhat");
const { deployDiamond } = require("../scripts/deploy");

describe('VotingFacet', async function () {
    it("should allow to vote whitelisted worker", async () => {
        
    });

    it("should not allow to vote not whitelisted worker", async () => {

    });

    it("should get the winner with the most votes", async () => {

    });

    it("consensus can be reached with simple majority", async () => {

    });

    it("should not be able to add same worker twice", async () => {

    });

    it("consensus should not be reached when votes are divided evenly", async () => {

    });

    it("reward should be paid after replenishment of funds", async () => {

    });

    it("voting which exceeded time limit can be canceled", async () => {

    });

    it("voting which exceeded time limit must not be completed", async () => {

    });

    it("voting can not be cancelled by non owner", async () => {

    });
})
