/* eslint-disable no-console */
import * as algokit from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import { ReactNode, useState } from 'react'
import { Dao, DaoClient } from '../contracts/DaoClient'

/* Example usage
<DaoCreateApplication
  buttonClass="btn m-2"
  buttonLoadingNode={<span className="loading loading-spinner" />}
  buttonNode="Call createApplication"
  typedClient={typedClient}
  proposal={proposal}
/>
*/
type DaoCreateApplicationArgs = Dao['methods']['createApplication(string)void']['argsObj']

type Props = {
  buttonClass: string
  buttonLoadingNode?: ReactNode
  buttonNode: ReactNode
  typedClient: DaoClient
}

const DaoCreateApplication = (props: Props) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [proposal, setProposal] = useState<string>('')
  const { activeAddress, signer } = useWallet()
  const sender = { signer, addr: activeAddress! }

  const callMethod = async () => {
    setLoading(true)
    console.log(`Calling createApplication`)
    await props.typedClient.create.createApplication(
      {
        proposal: proposal,
      },
      { sender },
    )

    await props.typedClient.appClient.fundAppAccount({
      sender,
      amount: algokit.microAlgos(200_000),
    })

    await props.typedClient.bootstrap(
      {},
      {
        sender,
        sendParams: { fee: algokit.microAlgos(2_000) },
      },
    )

    setLoading(false)
  }

  return (
    <div>
      <input
        type="text"
        className="input input-bordered m-2"
        onChange={(e) => {
          console.log(e.currentTarget.value)
          setProposal(e.currentTarget.value)
        }}
      ></input>
      <button className={props.buttonClass} onClick={callMethod}>
        {loading ? props.buttonLoadingNode || props.buttonNode : props.buttonNode}
      </button>
    </div>
  )
}

export default DaoCreateApplication
