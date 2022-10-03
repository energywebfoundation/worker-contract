//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";
import "./Certificate.sol";
import "./RewardVoting.sol";

import "../libs/LibRoles.sol";
import "../libs/LibVoting.sol";

import "../interfaces/IVoting.sol";

contract MatchVoting is Ownable, IVoting {
    using LibVoting for address;
    using LibVoting for LibVoting.Voting;
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

    /// Worker address to match result
    mapping(string => LibVoting.Voting) public matchInputToVoting;

    //Track the replaying vote status of each worker
    mapping(address => mapping(string => bool)) private isRevoting;

    modifier onlyEnrolledWorkers(address _worker) {
        require(
            _worker.isWorker(claimManagerAddress, workerRole),
            "Access denied: not enrolled as worker"
        );
        _;
    }

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
    function vote(string memory matchInput, bytes32 matchResult) external {
        if (!isWorker(msg.sender)) {
            revert NotWhitelisted();
        }
        LibVoting.Voting storage voting = matchInputToVoting[matchInput];
        if (voting._isExpired(timeLimit, matchInput)) {
            cancelVoting(voting);
        }

        if (voting._isClosed() || msg.sender._hasAlreadyVoted(voting)) {
            //TODO: update the voting with the return of the vote replay
            // return newVote =  voting._replayVote(matchInput, matchResult);

            (
                bool shouldUpdateVote,
                bytes32 newWinningMatch,
                uint256 newVoteCount
            ) = voting._replayVote(matchInput, matchResult);
            if (shouldUpdateVote) {
                emit WinningMatch(
                    voting.matchInput,
                    newWinningMatch,
                    newVoteCount
                );
                IRewardVoting(rewardVotingAddress).reward(
                    winners(voting.matchInput)
                );
            }
        } else {
            if (voting._hasNotStarted()) {
                startVoting(matchInput);
            }
            voting.workerToMatchResult[msg.sender] = matchResult;
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
    }

    function getWinningMatch(string memory matchInput)
        public
        view
        returns (bytes32)
    {
        return matchInputToVoting[matchInput].winningMatch;
    }

    function numberOfMatchInputs() public view returns (uint256) {
        return matchInputs.length;
    }

    function addWorker(address payable workerAddress)
        external
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
        returns (bytes32 matchResult)
    {
        return
            matchInputToVoting[matchInput].workerToMatchResult[workerAddress];
    }

    function completeVoting(LibVoting.Voting storage voting) private {
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
        voting.status = LibVoting.Status.Completed;
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
        LibVoting.Voting storage voting = matchInputToVoting[matchInput];
        _winners = new address payable[](voting.winningMatchVoteCount);
        uint256 winnerCount = 0;
        for (uint256 i = 0; i < numberOfWorkers; i++) {
            address payable worker = workers[i];
            if (
                voting.workerToVoted[worker] &&
                (voting.workerToMatchResult[worker]) == voting.winningMatch
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
        LibVoting.Voting storage voting = matchInputToVoting[matchInput];
        voting.matchInput = matchInput;
        voting.start = block.timestamp;
        voting.status = LibVoting.Status.Active;

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

    // function isExpired(Voting storage voting) private view returns (bool) {
    //     return voting.start + timeLimit < block.timestamp;
    // }

    /// @notice Cancels votings that takes longer than time limit
    function cancelExpiredVotings() public onlyOwner {
        for (uint256 i = 0; i < matchInputs.length; i++) {
            LibVoting.Voting storage voting = matchInputToVoting[
                matchInputs[i]
            ];
            if (voting._isExpired(timeLimit, matchInputs[i])) {
                cancelVoting(voting);
            }
        }
    }

    /// @notice Deletes voting results
    function cancelVoting(LibVoting.Voting storage voting) private {
        delete voting.matches;
        for (uint256 i = 0; i < numberOfWorkers; i++) {
            voting.matchResultToVoteCount[
                voting.workerToMatchResult[workers[i]]
            ] = 0;
            voting.workerToVoted[workers[i]] = false;
            voting.workerToMatchResult[workers[i]] = "";
        }
        voting.status = LibVoting.Status.NotActive;
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

    function getNumberOfWorkers() external view override returns (uint256) {
        return numberOfWorkers;
    }

    function getWorkers()
        external
        view
        override
        returns (address[] memory _workers)
    {
        for (uint256 i = 0; i < workers.length; i++) {
            _workers[i] = address(workers[i]);
        }
        return _workers;
    }
}
