/* eslint-disable no-console */
import * as algokit from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import algosdk from 'algosdk'
import { ReactNode, useState } from 'react'
import { Dao, DaoClient } from '../contracts/DaoClient'

/* Example usage
<DaoVote
  buttonClass="btn m-2"
  buttonLoadingNode={<span className="loading loading-spinner" />}
  buttonNode="Call vote"
  typedClient={typedClient}
  inFavor={inFavor}
  registeredAsa={registeredAsa}
/>
*/
type DaoVoteArgs = Dao['methods']['vote(pay,bool,asset)void']['argsObj']

type Props = {
  buttonClass: string
  buttonLoadingNode?: ReactNode
  buttonNode: ReactNode
  typedClient: DaoClient
  inFavor: DaoVoteArgs['inFavor']
  registeredAsa: DaoVoteArgs['registeredAsa']
  getState: () => void
  algodClient: algosdk.Algodv2
}

const DaoVote = (props: Props) => {
  const [loading, setLoading] = useState<boolean>(false)
  const { activeAddress, signer } = useWallet()
  const sender = { signer, addr: activeAddress! }

  const callMethod = async () => {
    setLoading(true)
    console.log(`Calling vote`)
    const { appAddress } = await props.typedClient.appClient.getAppReference()
    const boxMBRPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: sender.addr,
      to: appAddress,
      amount: 15_700,
      suggestedParams: await algokit.getTransactionParams(undefined, props.algodClient),
    })
    await props.typedClient.vote(
      {
        boxMBRPayment,
        inFavor: props.inFavor,
        registeredAsa: props.registeredAsa,
      },
      { sender, boxes: [algosdk.decodeAddress(sender.addr).publicKey] },
    )
    props.getState()
    setLoading(false)
  }

  return (
    <button className={props.buttonClass} onClick={callMethod}>
      {loading ? props.buttonLoadingNode || props.buttonNode : props.buttonNode}
    </button>
  )
}

export default DaoVote
