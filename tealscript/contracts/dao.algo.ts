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

  register(registeredAsa: Asset): void {
    assert(this.txn.sender.assetBalance(this.registeredAsa.value) === 0);
    sendAssetTransfer({
      xferAsset: this.registeredAsa.value,
      assetReceiver: this.txn.sender,
      assetAmount: 1,
    });

    sendAssetFreeze({
      freezeAsset: this.registeredAsa.value,
      freezeAssetAccount: this.txn.sender,
      freezeAssetFrozen: true,
    });
  }

  vote(inFavor: boolean, registeredAsa: Asset): void {
    assert(this.txn.sender.assetBalance(this.registeredAsa.value) === 1);
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