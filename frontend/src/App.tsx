import * as algokit from '@algorandfoundation/algokit-utils'
import { DeflyWalletConnect } from '@blockshake/defly-connect'
import { DaffiWalletConnect } from '@daffiwallet/connect'
import { PeraWalletConnect } from '@perawallet/connect'
import { PROVIDER_ID, ProvidersArray, WalletProvider, useInitializeProviders, useWallet } from '@txnlab/use-wallet'
import algosdk from 'algosdk'
import { SnackbarProvider } from 'notistack'
import { useEffect, useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import DaoCreateApplication from './components/DaoCreateApplication'
import DaoDeregister from './components/DaoDeregister'
import DaoRegister from './components/DaoRegister'
import DaoVote from './components/DaoVote'
import { DaoClient } from './contracts/DaoClient'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

let providersArray: ProvidersArray
if (import.meta.env.VITE_ALGOD_NETWORK === '') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  providersArray = [
    {
      id: PROVIDER_ID.KMD,
      clientOptions: {
        wallet: kmdConfig.wallet,
        password: kmdConfig.password,
        host: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  providersArray = [
    { id: PROVIDER_ID.DEFLY, clientStatic: DeflyWalletConnect },
    { id: PROVIDER_ID.PERA, clientStatic: PeraWalletConnect },
    { id: PROVIDER_ID.DAFFI, clientStatic: DaffiWalletConnect },
    { id: PROVIDER_ID.EXODUS },
    // If you are interested in WalletConnect v2 provider
    // refer to https://github.com/TxnLab/use-wallet for detailed integration instructions
  ]
}

export default function App() {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [appID, setAppID] = useState<number>(0)
  const [proposal, setProposal] = useState<string>('')
  const [registeredAsa, setRegisteredAsa] = useState<number>(0)
  const [votesTotal, setVotesTotal] = useState<number>(0)
  const [votesInFavor, setVotesInFavor] = useState<number>(0)
  const [registered, setRegistered] = useState<boolean>(false)
  const [voted, setVoted] = useState<boolean>(false)
  const { activeAddress } = useWallet()

  const resetState = async () => {
    setRegisteredAsa(0)
    setVotesInFavor(0)
    setVotesTotal(0)
  }

  const getState = async () => {
    try {
      const state = await typedClient.getGlobalState()
      setProposal(state.proposal!.asString())
      const asa = state.registeredAsa!.asNumber() || 0
      setRegisteredAsa(asa)
      setVotesInFavor(state.votesInFavor?.asNumber() || 0)
      setVotesTotal(state.votesTotal?.asNumber() || 0)

      try {
        const assetInfo = await algodClient.accountAssetInformation(activeAddress!, asa).do()
        console.log('assetInfo', assetInfo['asset-holding'])
        setRegistered(assetInfo['asset-holding']?.amount === 1)
      } catch (e) {
        console.warn(e)
        setRegistered(false)
      }

      // Check local state if the user has voted
      try {
        // const localState = await typedClient.getLocalState(activeAddress!)
        // setVoted(localState.inFavor !== undefined)
        const inFavor = await typedClient.appClient.getBoxValue(algosdk.decodeAddress(activeAddress!).publicKey)
        setVoted(inFavor !== undefined)
      } catch (e) {
        console.warn(e)
        setVoted(false)
      }
    } catch (e) {
      console.warn(e)
      setProposal('Invalid App ID')
    }
  }

  useEffect(() => {
    if (appID === 0) {
      setProposal('The app ID must be set manually or via DAO creation')
      resetState()
    } else {
      getState()
    }
  }, [appID])

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  const algodConfig = getAlgodConfigFromViteEnvironment()

  const algodClient = algokit.getAlgoClient({
    server: algodConfig.server,
    port: algodConfig.port,
    token: algodConfig.token,
  })

  const typedClient = new DaoClient(
    {
      resolveBy: 'id',
      id: appID,
    },
    algodClient,
  )

  const walletProviders = useInitializeProviders({
    providers: providersArray,
    nodeConfig: {
      network: algodConfig.network,
      nodeServer: algodConfig.server,
      nodePort: String(algodConfig.port),
      nodeToken: String(algodConfig.token),
    },
    algosdkStatic: algosdk,
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider value={walletProviders}>
        <div className="hero min-h-screen bg-teal-400">
          <div className="hero-content text-center rounded-lg p-6 max-w-md bg-white mx-auto">
            <div className="max-w-md">
              <h1 className="text-4xl">
                Welcome to <div className="font-bold">Hobbyflo</div>
              </h1>
              <p className="py-6">Build-a-bull</p>

              <div className="divider" />

              <h3 className="font-bold m-2">DAO App ID</h3>
              <input
                type="number"
                className="input input-bordered"
                value={appID}
                onChange={(e) => setAppID(e.currentTarget.valueAsNumber || 0)}
              />

              <div className="divider" />

              <h3 className="font-bold m-2">Proposal</h3>

              <textarea className="textarea textarea-bordered m-2" value={proposal} onChange={() => {}} />

              <div className="divider" />

              <h3 className="font-bold m-2">Votes</h3>

              <p>
                {votesInFavor} / {votesTotal}
              </p>

              {activeAddress && appID === 0 && (
                <DaoCreateApplication
                  buttonClass="btn m-2"
                  buttonLoadingNode={<span className="loading loading-spinner" />}
                  buttonNode="Create DAO"
                  typedClient={typedClient}
                  setAppID={setAppID}
                />
              )}

              {activeAddress && appID !== 0 && registeredAsa !== 0 && !registered && (
                <DaoRegister
                  buttonClass="btn m-2"
                  buttonLoadingNode={<span className="loading loading-spinner" />}
                  buttonNode="Register to Vote"
                  typedClient={typedClient}
                  registeredAsa={registeredAsa}
                  algodClient={algodClient}
                  getState={getState}
                />
              )}

              {activeAddress && appID !== 0 && registeredAsa !== 0 && registered && (
                <DaoDeregister
                  buttonClass="btn m-2"
                  buttonLoadingNode={<span className="loading loading-spinner" />}
                  buttonNode="Opt Out"
                  typedClient={typedClient}
                  registeredAsa={registeredAsa}
                  algodClient={algodClient}
                  getState={getState}
                />
              )}

              {activeAddress && appID !== 0 && registered && !voted && (
                <div>
                  <DaoVote
                    buttonClass="btn m-2"
                    buttonLoadingNode={<span className="loading loading-spinner" />}
                    buttonNode="Against"
                    typedClient={typedClient}
                    inFavor={false}
                    registeredAsa={registeredAsa}
                    getState={getState}
                    algodClient={algodClient}
                  />
                  <DaoVote
                    buttonClass="btn m-2"
                    buttonLoadingNode={<span className="loading loading-spinner" />}
                    buttonNode="In Favor"
                    typedClient={typedClient}
                    inFavor={true}
                    registeredAsa={registeredAsa}
                    getState={getState}
                    algodClient={algodClient}
                  />
                </div>
              )}

              <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
            </div>
          </div>
        </div>
      </WalletProvider>
    </SnackbarProvider>
  )
}
