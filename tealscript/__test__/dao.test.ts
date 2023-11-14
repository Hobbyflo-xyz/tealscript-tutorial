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

  const vote = async (inFavor: boolean) => {
    const {
      appAddress
    } = await appClient.appClient.getAppReference()
    const boxMBRPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: sender.addr,
      to: appAddress,
      amount: 15_700,
      suggestedParams: await algokit.getTransactionParams(undefined, algod)
    })
    await appClient.vote({
      boxMBRPayment,
      inFavor: inFavor,
      registeredAsa
    }, {
      sender,
      boxes: [
        algosdk.decodeAddress(sender.addr).publicKey
      ]
    })
  }

  const register = async () => {
    const registeredAsaOptInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: sender.addr,
      to: sender.addr,
      amount: 0,
      assetIndex: Number(registeredAsa),
      suggestedParams: await algokit.getTransactionParams(undefined, algod),
    });

    await algokit.sendTransaction({ from: sender, transaction: registeredAsaOptInTxn }, algod);

    await appClient.register(
    // await appClient.optIn.optInToApplication(
      { registeredAsa },
      {
        sender,
        sendParams: {
          fee: algokit.microAlgos(3_000),
        },
      }
    );
  }

  const deregister = async () => {
      const { appAddress } = await appClient.appClient.getAppReference();
  
      await appClient.deregister(
        { registeredAsa },
        {
          sender,
          sendParams: { fee: algokit.microAlgos(3_000) },
          boxes: [algosdk.decodeAddress(sender.addr).publicKey],
        },
      );
  
      const registeredAsaCloseTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: sender.addr,
        to: appAddress,
        closeRemainderTo: appAddress,
        amount: 0,
        assetIndex: Number(registeredAsa),
        suggestedParams: await algokit.getTransactionParams(undefined, algod),
      });
  
      await algokit.sendTransaction({ transaction: registeredAsaCloseTxn, from: sender }, algod);
    }

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

    await algod.setBlockOffsetTimestamp(1).do()
    await appClient.create.createApplication({ proposal, length: 60 });
  });

  test('getProposal', async () => {
    const proposalFromMethod = await appClient.getProposal({});
    expect(proposalFromMethod.return?.valueOf()).toBe(proposal);
  });

  test('bootstrap (Negative)', async () => {
    console.log('bootstrap (Negative)')
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
    console.log('bootstrap')
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
    console.log('vote (Negative)')
    await expect(
      vote(false)
    ).rejects.toThrow();
  });

  test('getRegisteredAsa', async () => {
    console.log('getRegisteredAsa')
    const testVal = await appClient.getRegisteredAsa({
      registeredAsa,
    });
    expect(testVal.return?.valueOf()).toBe(registeredAsa);
  });

  test('register', async () => {
    try {
      console.log('register')
      // call register
      await register()

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
    } catch(e) {
      console.warn(e)
      throw e
    }
  });

  test('vote & getVotes', async () => {
    console.log('vote & getVotes')
    await vote(true)

    const votesAfter = await appClient.getVotes({});
    expect(votesAfter.return?.valueOf()).toEqual([BigInt(1), BigInt(1)]);

    await expect(vote(false)).rejects.toThrow();
    // const votesAfter2 = await appClient.getVotes({});
    // console.warn('votesAfter2', votesAfter2)
    // expect(votesAfter2.return?.valueOf()).toEqual([BigInt(1), BigInt(2)]);
  });

  test('deregister', async () => {
    console.log('deregister')
    await deregister()

    const votesAfter = await appClient.getVotes({});
    expect(votesAfter.return?.valueOf()).toEqual([BigInt(0), BigInt(0)]);

    await expect(
      vote(false)
    ).rejects.toThrow();

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
    await register()

    await vote(true);

    const votesAfter2 = await appClient.getVotes({});
    expect(votesAfter2.return?.valueOf()).toEqual([BigInt(1), BigInt(1)]);
  });

  test('endTime', async () => {
    await deregister()
    await algod.setBlockOffsetTimestamp(120).do()
    await register()
    // await algod.setBlockOffsetTimestamp(120).do()
    await expect(vote(true)).rejects.toThrow()
  })
});
