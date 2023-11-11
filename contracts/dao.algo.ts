import { Contract } from '@algorandfoundation/tealscript';

class Dao extends Contract {
    proposal = GlobalStateKey<string>()

    createApplication(proposal: string): void {
        this.proposal.value = proposal;
    }

    // define a proposal
    // make it easy for voters to see what the proposal is
    getProposal(): string {
        return this.proposal.value
    }
}
