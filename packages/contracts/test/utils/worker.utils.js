const { expect } = require("chai");

class Worker {
  constructor(wallet) {
    this.wallet = wallet;
    this.address = wallet.address;
  }

  getBalance() {
    return this.wallet.getBalance();
  }

  setVotingContract(votingContract) {
    this.votingContract = votingContract.connect(this.wallet);
  }

  async vote(input, output) {
    return await this.votingContract.vote(input, output);
  }

  async voteNotWinning(input, output) {
    const voteTx = this.votingContract.vote(input, output);
    expect(voteTx).to.not.emit(this.votingContract, "WinningMatch");

    return voteTx;
  }

  async voteNoConsensus(input, output) {
    const voteTx = this.votingContract.vote(input, output);
    expect(voteTx)
      .to.emit(this.votingContract, "NoConsensusReached")
      .withArgs(input, output);

    return voteTx;
  }

  async voteExpired(input, output) {
    const voteTx = this.votingContract.vote(input, output);
    expect(voteTx)
      .to.emit(this.votingContract, "VotingSessionExpired")
      .withArgs(input, output);

    return voteTx;
  }

  async voteWinning(input, output, { voteCount, winningOutput }) {
    const voteTx = this.votingContract.vote(input, output);
    expect(voteTx)
      .to.emit(this.votingContract, "WinningMatch")
      .withArgs(input, winningOutput || output, voteCount);

    return voteTx;
  }

  async voteNotWhitelisted(input, output) {
    expect(this.votingContract.vote(input, output)).to.be.revertedWith(
      `NotWhitelisted("${this.address}")`
    );
  }

  async voteAlreadyVoted(input, output) {
    expect(this.votingContract.vote(input, output)).to.be.revertedWith(
      `AlreadyVoted("${this.address}")`
    );
  }

  async getVotes(input) {
    return await this.votingContract.getWorkerVotes(input, this.address);
  }
}

module.exports = {
  Worker,
};
