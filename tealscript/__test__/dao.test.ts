import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';

import { DaoClient } from '../contracts/clients/DaoClient';
import algosdk from 'algosdk';

const fixture = algorandFixture();

let appClient: DaoClient;

describe('Dao', () => {
  let algod: algosdk.Algodv2;
  const proposal = 'A proposal';
  let sender: algosdk.Account;
  let registeredAsa: bigint;
  beforeEach(fixture.beforeEach);

  beforeAll(async () => {
    await fixture.beforeEach();
    const { testAccount, kmd } = fixture.context;
    algod = fixture.context.algod;

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

  test('vote (Negative)', async () => {
    await expect(
      appClient.vote({
        inFavor: true,
        registeredAsa,
      })
    ).rejects.toThrow();
  });

  test('getRegisteredAsa', async () => {
    const testVal = await appClient.getRegisteredAsa({
      registeredAsa,
    });
    expect(testVal.return?.valueOf()).toBe(registeredAsa);
  });

  test('register', async () => {
    const registeredAsaOptInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: sender.addr,
      to: sender.addr,
      amount: 0,
      assetIndex: Number(registeredAsa),
      suggestedParams: await algokit.getTransactionParams(undefined, algod),
    });

    await algokit.sendTransaction({ from: sender, transaction: registeredAsaOptInTxn }, algod);

    // await appClient.register(
    await appClient.optIn.optInToApplication(
      { registeredAsa },
      {
        sender,
        sendParams: {
          fee: algokit.microAlgos(3_000),
        },
      }
    );

    const registeredAsaTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: sender.addr,
      to: sender.addr,
      amount: 1,
      assetIndex: Number(registeredAsa),
      suggestedParams: await algokit.getTransactionParams(undefined, algod),
    });

    await expect(
      algokit.sendTransaction(
        {
          from: sender,
          transaction: registeredAsaTransferTxn,
        },
        algod
      )
    ).rejects.toThrow();
  });

  test('vote & getVotes', async () => {
    await appClient.vote({ inFavor: true, registeredAsa }, { sender });

    const votesAfter = await appClient.getVotes({});
    expect(votesAfter.return?.valueOf()).toEqual([BigInt(1), BigInt(1)]);

    await expect(appClient.vote({ inFavor: false, registeredAsa }, { sender })).rejects.toThrow();
    // const votesAfter2 = await appClient.getVotes({});
    // expect(votesAfter2.return?.valueOf()).toEqual([BigInt(1), BigInt(2)]);
  });

  test('deregister', async () => {
    await appClient.closeOut.closeOutOfApplication(
      {
        registeredAsa,
      },
      {
        sender,
        sendParams: {
          fee: algokit.microAlgos(2_000),
        },
      }
    );

    const votesAfter = await appClient.getVotes({});
    expect(votesAfter.return?.valueOf()).toEqual([BigInt(0), BigInt(0)]);

    await expect(
      appClient.vote(
        { inFavor: true, registeredAsa },
        {
          sender,
        }
      )
    ).rejects.toThrow();

    const { appAddress } = await appClient.appClient.getAppReference();

    const registeredAsaCloseTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: sender.addr,
      to: appAddress,
      closeRemainderTo: appAddress,
      amount: 0,
      assetIndex: Number(registeredAsa),
      suggestedParams: await algokit.getTransactionParams(undefined, algod),
    });

    await algokit.sendTransaction(
      {
        transaction: registeredAsaCloseTxn,
        from: sender,
      },
      algod
    );

    // --- --- Opt-in --- ---

    const registeredAsaOptInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: sender.addr,
      to: sender.addr,
      amount: 0,
      assetIndex: Number(registeredAsa),
      suggestedParams: await algokit.getTransactionParams(undefined, algod),
    });

    await algokit.sendTransaction(
      {
        transaction: registeredAsaOptInTxn,
        from: sender,
      },
      algod
    );

    try {
      await appClient.optIn.optInToApplication(
        {
          registeredAsa,
        },
        {
          sender,
          sendParams: {
            fee: algokit.microAlgos(3_000),
          },
        }
      );
    } catch (e) {
      console.warn(e);
      throw e;
    }

    await appClient.vote({ inFavor: true, registeredAsa }, { sender });

    const votesAfter2 = await appClient.getVotes({});
    expect(votesAfter2.return?.valueOf()).toEqual([BigInt(1), BigInt(1)]);
  });

  test('clearState', async () => {
    try {
      await appClient.clearState({ sender });
    } catch (e) {
      console.warn(e);
      throw e;
    }
    const votesAfter = await appClient.getVotes({});
    expect(votesAfter.return?.valueOf()).toEqual([BigInt(0), BigInt(0)]);
    await expect(appClient.vote({ inFavor: false, registeredAsa }, { sender })).rejects.toThrow();
  });
});
