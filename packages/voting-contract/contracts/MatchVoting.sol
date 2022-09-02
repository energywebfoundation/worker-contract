//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";
import "./Certificate.sol";
import "./RewardVoting.sol";

import "../libs/LibRoles.sol";

contract MatchVoting is Ownable {
    using RolesLibrary for address;

    /// Certificate minting contract address
    address public certificateContractAddress;
    /// Address of voting reward contract
    address rewardVotingAddress;

    address payable[] public workers;

    address claimManagerAddress;

    uint256 public numberOfWorkers;

    mapping(address => uint256) public workerToIndex;

    string[] public matchInputs;

    mapping(string => uint256) matchInputToIndex;

    uint256 public timeLimit;

    bytes32 private workerRole;

    enum Status {
        /// Not started or canceled
        NotActive,
        /// Worker can vote
        Active,
        /// Winner match is determined
        Completed
    }

    struct Voting {
        /// Input match
        string matchInput;
        /// List of all match results with at least one vote
        string[] matches;
        /// Worker address to match result
        mapping(address => string) workerToMatchResult;
        /// Worker address to voted flag
        mapping(address => bool) workerToVoted;
        /// Match result to total vote count
        mapping(string => uint256) matchResultToVoteCount;
        /// To decide which actions are currently applicable to voting
        Status status;
        /// Winning match result
        string winningMatch;
        /// Number of votes for winning match
        uint256 winningMatchVoteCount;
        /// If none of the match results gets more votes then the others
        bool noConsensus;
        /// Number of votes in this voting
        uint256 numberOfVotes;
        ///Timestamp of first voting
        uint256 start;
    }

    /// Worker address to match result
    mapping(string => Voting) public matchInputToVoting;

    modifier onlyEnrolledWorkers(address _worker) {
        require(
            _worker.isWorker(claimManagerAddress, workerRole),
            "Access denied: not enrolled as worker"
        );
        _;
    }

    /// Event emitted after voting ended
    event WinningMatch(
        string indexed matchInput,
        string matchResult,
        uint256 voteCount
    );

    /// Winning match result can not be determined
    event NoConsensusReached(string indexed matchInput);

    /// Voting lasts more then time limit
    event VotingExpired(string indexed matchInput);

    /// Worker had already voted for a match result
    error AlreadyVoted();

    /// Sender is not whitelisted
    error NotWhitelisted();

    /// Voting ended, winner is chosen - workers cannot vote anymore
    error VotingAlreadyEnded();

    /// Worker has been added already
    error WorkerAlreadyAdded();

    /// Worker has not been added yet
    error WorkerWasNotAdded();

    constructor(
        address _certificateContractAddress,
        address _rewardVotingAddress,
        uint256 _timeLimit,
        address _claimManagerAddress,
        bytes32 _workerRole
    ) {
        certificateContractAddress = _certificateContractAddress;
        rewardVotingAddress = _rewardVotingAddress;
        timeLimit = _timeLimit;
        claimManagerAddress = _claimManagerAddress;
        workerRole = _workerRole;
    }

    /// @notice Increases number of votes given for matchResult. Winner is determined by simple majority
    /// When consensus is not reached the voting is restarted
    function vote(string memory matchInput, string memory matchResult) external {
        if (!isWorker(msg.sender)) {
            revert NotWhitelisted();
        }
        Voting storage voting = matchInputToVoting[matchInput];
        if (voting.status == Status.Active && isExpired(voting)) {
            cancelVoting(voting);
            emit VotingExpired(matchInput);
        }
        if (voting.status == Status.Completed) {
            revert VotingAlreadyEnded();
        }

        if (voting.status == Status.NotActive) {
            startVoting(matchInput);
        }

        if (voting.workerToVoted[msg.sender]) {
            revert AlreadyVoted();
        }

        voting.workerToMatchResult[msg.sender] = matchResult;
        voting.workerToVoted[msg.sender] = true;
        voting.numberOfVotes += 1;

        if (voting.matchResultToVoteCount[matchResult] == 0) {
            voting.matches.push(matchResult);
        }

        voting.matchResultToVoteCount[matchResult] += 1;

        if (
            voting.matchResultToVoteCount[matchResult] ==
            voting.winningMatchVoteCount
        ) {
            voting.noConsensus = true;
        } else if (
            voting.matchResultToVoteCount[matchResult] >
            voting.winningMatchVoteCount
        ) {
            voting.winningMatchVoteCount = voting.matchResultToVoteCount[
                matchResult
            ];
            voting.winningMatch = matchResult;
            voting.noConsensus = false;

            if (voting.winningMatchVoteCount >= majority()) {
                completeVoting(voting);
            }
        }

        if (voting.numberOfVotes == numberOfWorkers) {
            completeVoting(voting);
        }
    }

    function getWinningMatch(string memory matchInput)
        public
        view
        returns (string memory)
    {
        return matchInputToVoting[matchInput].winningMatch;
    }

    function numberOfMatchInputs() public view returns (uint256) {
        return matchInputs.length;
    }

    function addWorker(address payable workerAddress)
        external
        onlyOwner
        onlyEnrolledWorkers(workerAddress)
    {
        if (isWorker(workerAddress)) {
            revert WorkerAlreadyAdded();
        }
        workerToIndex[workerAddress] = numberOfWorkers;
        workers.push(workerAddress);
        numberOfWorkers = numberOfWorkers + 1;
    }

    function removeWorker(address workerToRemove) external onlyOwner {
        if (!isWorker(workerToRemove)) {
            revert WorkerWasNotAdded();
        }
        require(
            workerToRemove.isWorker(claimManagerAddress, workerRole) == false,
            "Not allowed: still enrolled as worker"
        );

        if (numberOfWorkers > 1) {
            uint256 workerIndex = workerToIndex[workerToRemove];
            // Copy last element to fill the missing place in array
            address payable workerToMove = workers[numberOfWorkers - 1];
            workers[workerIndex] = workerToMove;
            workerToIndex[workerToMove] = workerIndex;
        }

        delete workerToIndex[workerToRemove];
        workers.pop();
        numberOfWorkers = numberOfWorkers - 1;
    }

    function getWorkerVote(string memory matchInput, address workerAddress)
        external
        view
        returns (string memory matchResult)
    {
        return
            matchInputToVoting[matchInput].workerToMatchResult[workerAddress];
    }

    function completeVoting(Voting storage voting) private {
        if (voting.noConsensus) {
            cancelVoting(voting);
            emit NoConsensusReached(voting.matchInput);
            return;
        }

        if (certificateContractAddress != address(0)) {
            ICertificate(certificateContractAddress).mint(
                voting.matchInput,
                voting.winningMatch
            );
        }

        emit WinningMatch(
            voting.matchInput,
            voting.winningMatch,
            voting.winningMatchVoteCount
        );
        voting.status = Status.Completed;
        IRewardVoting(rewardVotingAddress).reward(winners(voting.matchInput));
    }

    /// @notice Check if this account allowed to vote
    function isWorker(address workerAddress) public view returns (bool) {
        return
            workerToIndex[workerAddress] != 0 ||
            (numberOfWorkers > 0 && workers[0] == workerAddress);
    }

    /// @notice Workers who voted for winning result
    function winners(string memory matchInput)
        public
        view
        returns (address payable[] memory _winners)
    {
        Voting storage voting = matchInputToVoting[matchInput];
        _winners = new address payable[](voting.winningMatchVoteCount);
        uint256 winnerCount = 0;
        for (uint256 i = 0; i < numberOfWorkers; i++) {
            address payable worker = workers[i];
            if (
                voting.workerToVoted[worker] &&
                (keccak256(bytes(voting.workerToMatchResult[worker]))) == keccak256(bytes(voting.winningMatch))
            ) {
                _winners[winnerCount] = worker;
                winnerCount++;
            }
        }
    }

    /// @notice Number of votes sufficient to determine match winner
    function majority() public view returns (uint256) {
        return (numberOfWorkers / 2) + 1;
    }

    function startVoting(string memory matchInput) private {
        Voting storage voting = matchInputToVoting[matchInput];
        voting.matchInput = matchInput;
        voting.start = block.timestamp;
        voting.status = Status.Active;

        if (
            matchInputToIndex[matchInput] == 0 &&
            (matchInputs.length == 0 ||
                (matchInputs.length > 0 &&
                    !compareStrings(matchInputs[0], matchInput)))
        ) {
            matchInputToIndex[matchInput] = matchInputs.length;
            matchInputs.push(matchInput);
        }
    }

    function isExpired(Voting storage voting) private view returns (bool) {
        return voting.start + timeLimit < block.timestamp;
    }

    /// @notice Cancels votings that takes longer than time limit
    function cancelExpiredVotings() public onlyOwner {
        for (uint256 i = 0; i < matchInputs.length; i++) {
            Voting storage voting = matchInputToVoting[matchInputs[i]];
            if (voting.status == Status.Active && isExpired(voting)) {
                emit VotingExpired(matchInputs[i]);
                cancelVoting(voting);
            }
        }
    }

    /// @notice Deletes voting results
    function cancelVoting(Voting storage voting) private {
        delete voting.matches;
        for (uint256 i = 0; i < numberOfWorkers; i++) {
            voting.matchResultToVoteCount[
                voting.workerToMatchResult[workers[i]]
            ] = 0;
            voting.workerToVoted[workers[i]] = false;
            voting.workerToMatchResult[workers[i]] = "";
        }
        voting.status = Status.NotActive;
        voting.winningMatch = "";
        voting.winningMatchVoteCount = 0;
        voting.noConsensus = false;
        voting.numberOfVotes = 0;
        voting.start = 0;
    }

    function compareStrings(string memory a, string memory b)
        private
        pure
        returns (bool)
    {
        return (keccak256(abi.encodePacked((a))) ==
            keccak256(abi.encodePacked((b))));
    }
}
