/* eslint-disable no-console */
import * as algokit from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import algosdk from 'algosdk'
import { ReactNode, useState } from 'react'
import { Dao, DaoClient } from '../contracts/DaoClient'

type DaoRegisterArgs = Dao['methods']['closeOutOfApplication(asset)void']['argsObj']

type Props = {
  buttonClass: string
  buttonLoadingNode?: ReactNode
  buttonNode: ReactNode
  typedClient: DaoClient
  registeredAsa: DaoRegisterArgs['registeredAsa']
  algodClient: algosdk.Algodv2
  getState: () => void
}

const DaoCloseOutOfApplication = (props: Props) => {
  const [loading, setLoading] = useState<boolean>(false)
  const { activeAddress, signer } = useWallet()
  const sender = { signer, addr: activeAddress! }

  const callMethod = async () => {
    setLoading(true)
    console.log(`Calling closeOutOfApplication`)

    await props.typedClient.closeOut.closeOutOfApplication(
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

    const {
      appAddress
    } = await props.typedClient.appClient.getAppReference()

    const registeredAsaCloseTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: sender.addr,
      to: appAddress,
      closeRemainderTo: appAddress,
      amount: 0,
      assetIndex: Number(props.registeredAsa),
      suggestedParams: await algokit.getTransactionParams(undefined, props.algodClient),
    })

    await algokit.sendTransaction({ from: sender, transaction: registeredAsaCloseTxn }, props.algodClient)

    props.getState()
    setLoading(false)
  }

  return (
    <button className={props.buttonClass} onClick={callMethod}>
      {loading ? props.buttonLoadingNode || props.buttonNode : props.buttonNode}
    </button>
  )
}

export default DaoCloseOutOfApplication
