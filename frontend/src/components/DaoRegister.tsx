/* eslint-disable no-console */
import * as algokit from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import algosdk from 'algosdk'
import { ReactNode, useState } from 'react'
import { Dao, DaoClient } from '../contracts/DaoClient'

/* Example usage
<DaoRegister
  buttonClass="btn m-2"
  buttonLoadingNode={<span className="loading loading-spinner" />}
  buttonNode="Call register"
  typedClient={typedClient}
  registeredAsa={registeredAsa}
/>
*/
type DaoRegisterArgs = Dao['methods']['register(asset)void']['argsObj']

type Props = {
  buttonClass: string
  buttonLoadingNode?: ReactNode
  buttonNode: ReactNode
  typedClient: DaoClient
  registeredAsa: DaoRegisterArgs['registeredAsa']
  algodClient: algosdk.Algodv2
  getState: () => void
}

const DaoRegister = (props: Props) => {
  const [loading, setLoading] = useState<boolean>(false)
  const { activeAddress, signer } = useWallet()
  const sender = { signer, addr: activeAddress! }

  const callMethod = async () => {
    setLoading(true)
    console.log(`Calling optInToApplication`)

    const registeredAsaOptInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: sender.addr,
      to: sender.addr,
      amount: 0,
      assetIndex: Number(props.registeredAsa),
      suggestedParams: await algokit.getTransactionParams(undefined, props.algodClient),
    })

    await algokit.sendTransaction({ from: sender, transaction: registeredAsaOptInTxn }, props.algodClient)

    // await props.typedClient.optIn.optInToApplication(
    await props.typedClient.register(
      {
        registeredAsa: props.registeredAsa,
      },
      {
        sender,
        sendParams: {
          fee: algokit.microAlgos(3_000),
        },
      },
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

export default DaoRegister
