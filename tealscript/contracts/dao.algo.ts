import { Contract } from '@algorandfoundation/tealscript';

class Dao extends Contract {
  registeredAsa = GlobalStateKey<Asset>();
  proposal = GlobalStateKey<string>();
  votesTotal = GlobalStateKey<number>();
  votesInFavor = GlobalStateKey<number>();
  // use local storage to record if someone has voted or not
  // inFavor = LocalStateKey<boolean>();
  // use box storage to record if someone has voted or not
  inFavor = BoxMap<Address, boolean>();

  endTime = GlobalStateKey<number>();

  createApplication(proposal: string, length: number): void {
    this.proposal.value = proposal;
    this.endTime.value = length + globals.latestTimestamp // in seconds
  }

  // createApplication(proposal: string): void {
  //   this.proposal.value = proposal;
  // }

  // mint DAO token
  bootstrap(): Asset {
    verifyTxn(this.txn, { sender: this.app.creator });
    assert(!this.registeredAsa.exists);
    const registeredAsa = sendAssetCreation({
      configAssetTotal: 1_000,
      configAssetFreeze: this.app.address,
      configAssetClawback: this.app.address,
    });

    this.registeredAsa.value = registeredAsa;

    return registeredAsa;
  }

  // optInToApplication(registeredAsa: Asset): void {
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

  // closeOutOfApplication(registeredAsa: Asset): void {
  deregister(registeredAsa: Asset): void {
    // Delete the users vote when they clear state
    if (this.inFavor(this.txn.sender).exists) {
      this.votesTotal.value = this.votesTotal.value - 1;
      if (this.inFavor(this.txn.sender).value) {
        this.votesInFavor.value = this.votesInFavor.value - 1;
      }

      const preMBR = this.app.address.minBalance;
      this.inFavor(this.txn.sender).delete()

      sendPayment({
        amount: preMBR - this.app.address.minBalance,
        receiver: this.txn.sender
      })
    }

    sendAssetTransfer({
      xferAsset: this.registeredAsa.value,
      assetSender: this.txn.sender,
      assetReceiver: this.app.address,
      assetAmount: 1,
    });
  }

  vote(boxMBRPayment: PayTxn, inFavor: boolean, registeredAsa: Asset): void {
    assert(globals.latestTimestamp <= this.endTime.value)
    assert(this.txn.sender.assetBalance(this.registeredAsa.value) === 1);
    assert(!this.inFavor(this.txn.sender).exists);
    const preBoxMBR = this.app.address.minBalance;
    this.inFavor(this.txn.sender).value = inFavor;
    // verifyTxn(boxMBRPayment, {
    //   receiver: this.app.address,
    //   amount: this.app.address.minBalance - preBoxMBR
    // })`
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
