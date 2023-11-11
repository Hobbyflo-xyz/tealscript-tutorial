import { Contract } from '@algorandfoundation/tealscript';

class Dao extends Contract {
  registeredAsa = GlobalStateKey<Asset>();
  proposal = GlobalStateKey<string>();
  votesTotal = GlobalStateKey<number>();
  votesInFavor = GlobalStateKey<number>();

  createApplication(proposal: string): void {
    this.proposal.value = proposal;
  }

  // mint DAO token
  bootstrap(): Asset {
    verifyTxn(this.txn, { sender: this.app.creator });
    assert(!this.registeredAsa.exists);
    const registeredAsa = sendAssetCreation({
      configAssetTotal: 1_000,
      configAssetFreeze: this.app.address,
    });

    this.registeredAsa.value = registeredAsa;

    return registeredAsa;
  }

  vote(inFavor: boolean): void {
    this.votesTotal.value = this.votesTotal.value + 1;
    if (inFavor) {
      this.votesInFavor.value = this.votesInFavor.value + 1;
    }
  }

  getProposal(): string {
    return this.proposal.value;
  }

  getVotes(): [number, number] {
    return [this.votesInFavor.value, this.votesTotal.value];
  }

  getRegisteredAsa(): Asset {
    return this.registeredAsa.value;
  }
}
