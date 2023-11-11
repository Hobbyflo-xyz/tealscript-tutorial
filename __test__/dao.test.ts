import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';

import { DaoClient } from '../contracts/clients/DaoClient';
import algosdk from 'algosdk';

const fixture = algorandFixture();

let appClient: DaoClient;

describe('Dao', () => {
  beforeEach(fixture.beforeEach);

  const proposal = 'A proposal';
  let sender: algosdk.Account;
  let registeredAsa: bigint;

  beforeAll(async () => {
    await fixture.beforeEach();
    const { algod, testAccount, kmd } = fixture.context;

    sender = await algokit.getOrCreateKmdWalletAccount(
      {
        name: 'tealscript-dao-sender',
        fundWith: algokit.algos(10),
      },
      algod,
      kmd
    );

    appClient = new DaoClient(
      {
        sender: testAccount,
        resolveBy: 'id',
        id: 0,
      },
      algod
    );

    await appClient.create.createApplication({ proposal });
  });

  test('getProposal', async () => {
    const proposalFromMethod = await appClient.getProposal({});
    expect(proposalFromMethod.return?.valueOf()).toBe(proposal);
  });

  test('bootstrap (Negative)', async () => {
    await appClient.appClient.fundAppAccount(algokit.microAlgos(200_000));

    // default fee per txn is 0.001 ALGO for 1_000 mAlgo
    // bootstrap sends 1 innertxn, so 2 txns total
    // thus, fee needs to be 2_000 mAlgo
    await expect(
      appClient.bootstrap(
        {},
        {
          sender,
          sendParams: {
            fee: algokit.microAlgos(2_000),
          },
        }
      )
    ).rejects.toThrow();
  });

  test('bootstrap', async () => {
    await appClient.appClient.fundAppAccount(algokit.microAlgos(200_000));

    // default fee per txn is 0.001 ALGO for 1_000 mAlgo
    // bootstrap sends 1 innertxn, so 2 txns total
    // thus, fee needs to be 2_000 mAlgo
    const bootstrapResult = await appClient.bootstrap(
      {},
      {
        sendParams: {
          fee: algokit.microAlgos(2_000),
        },
      }
    );
    registeredAsa = bootstrapResult.return?.valueOf()!;
    console.log('registeredAsa', registeredAsa);
  });

  test('getRegisteredAsa', async () => {
    const testVal = await appClient.getRegisteredAsa({});
    expect(testVal.return?.valueOf()).toBe(registeredAsa);
  });

  test('vote & getVotes', async () => {
    await appClient.vote({ inFavor: true });
    const votesAfter = await appClient.getVotes({});
    expect(votesAfter.return?.valueOf()).toEqual([BigInt(1), BigInt(1)]);

    await appClient.vote({ inFavor: false });
    const votesAfter2 = await appClient.getVotes({});
    expect(votesAfter2.return?.valueOf()).toEqual([BigInt(1), BigInt(2)]);
  });
});
