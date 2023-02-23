export abstract class VotingManager {
  public abstract getConsensusResultHash(inputHash: string): Promise<string | null>;
  public abstract wasConsensusReached(inputHash: string): Promise<boolean>;
}
