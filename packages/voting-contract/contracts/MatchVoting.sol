//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

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

    // Worker address to match result on a specific matchInput
    mapping(address => mapping(string => bytes32)) workerVotes;

    mapping(string => bytes32) public winningMatches;
    mapping(string => address payable[]) public winnersList;

    mapping(string => LibVoting.Voting) public matchInputToVoting;

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
            // we prevent wasting computation if the vote is the same as the previous one
            if (workerVotes[msg.sender][matchInput] == matchResult) {
                return;
            }
            (
                bool shouldUpdateVote,
                bytes32 newWinningMatch,
                uint256 newVoteCount
            ) = voting._replayVote(matchInput, matchResult);

            if (shouldUpdateVote) {
                //We update the voting results
                LibVoting.updateWorkersVote(voting);
                _revealWinners(voting);

                voting.winningMatchVoteCount = newVoteCount;
                bytes32 winMatch = matchInputToVoting[matchInput].winningMatch;

                //we prevent updating if the final winning match did not change
                if (winMatch != newWinningMatch) {
                    matchInputToVoting[matchInput]
                        .winningMatch = newWinningMatch;

                    //We update winningMatches list
                    winningMatches[voting.matchInput] = newWinningMatch;
                }

                // We update the final vote with the replayed vote
                for (uint256 i; i < voting.replayVoters.length; i++) {
                    address worker = voting.replayVoters[i];

                    workerVotes[worker][matchInput] = voting
                        .workerToMatchResult[worker];
                    matchInputToVoting[matchInput].workerToMatchResult[
                        worker
                    ] = voting.workerToMatchResult[worker];
                }

                emit WinningMatch(
                    voting.matchInput,
                    newWinningMatch,
                    newVoteCount
                );

                IRewardVoting(rewardVotingAddress).reward(
                    winnersList[voting.matchInput]
                );
            }
        } else {
            if (voting._hasNotStarted()) {
                startVoting(matchInput);
            }

            voting.numberOfVotes++;
            voting.workerToVoted[msg.sender] = true;
            // workerVotes[msg.sender][matchInput] = matchResult;
            voting.workerToMatchResult[msg.sender] = matchResult;

            if (voting.matchResultToVoteCount[matchResult] == 0) {
                voting.matches.push(matchResult);
            }

            voting.matchResultToVoteCount[matchResult]++;

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
            if (
                voting.numberOfVotes == numberOfWorkers &&
                (voting.winningMatchVoteCount < majority())
            ) {
                completeVoting(voting);
            }
        }
    }

    function getWinningMatch(string memory matchInput)
        public
        view
        returns (bytes32)
    {
        return winningMatches[matchInput];
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
        return workerVotes[workerAddress][matchInput];
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
        _revealVotes(voting);
        _revealWinners(voting);
        winningMatches[voting.matchInput] = voting.winningMatch;
        IRewardVoting(rewardVotingAddress).reward(
            winnersList[voting.matchInput]
        );
    }

    /// @notice Check if this account allowed to vote
    function isWorker(address workerAddress) public view returns (bool) {
        return
            workerToIndex[workerAddress] != 0 ||
            (numberOfWorkers > 0 && workers[0] == workerAddress);
    }

    /// @notice Workers who voted for winning result
    function _revealWinners(LibVoting.Voting storage voting) internal {
        uint256 winnerCount = 0;
        string memory matchInput = voting.matchInput;
        address payable[] memory _winners = new address payable[](
            voting.winningMatchVoteCount
        );

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
        winnersList[matchInput] = _winners;
    }

    /// @notice Reveals the votes only after the vote is ended
    function _revealVotes(LibVoting.Voting storage voting) internal {
        for (uint256 i = 0; i < workers.length; i++) {
            address payable currentWorker = workers[i];

            workerVotes[currentWorker][voting.matchInput] = voting
                .workerToMatchResult[msg.sender];
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

    function winners(string memory matchInput)
        external
        view
        returns (address payable[] memory)
    {
        return winnersList[matchInput];
    }
}
