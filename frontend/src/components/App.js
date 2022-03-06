import NFTStorageMinter from '../abis/NFTStorageMinter.json'
import React, { Component } from 'react';
import Identicon from 'identicon.js';
import Navbar from './Navbar'
import Main from './Main'
import Web3 from 'web3';
import './App.css';
import { NFTStorage, File } from 'nft.storage'
import { pack } from 'ipfs-car/pack';

//Declare IPFS
const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' }) // leaving out the arguments will default to these values
const apiKey = ''
const client = new NFTStorage({ token: apiKey })

class App extends Component {

  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
    window.addEventListener('unlockProtocol', this.unlockHandler)
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }

  async loadBlockchainData() {
    const web3 = window.web3
    // Load account
    const accounts = await web3.eth.getAccounts()
    this.setState({ account: accounts[0] })
    // Network ID
    const networkId = await web3.eth.net.getId()
    const networkData = NFTStorageMinter.networks[networkId]
    if(networkData) {
      const NFTStorageMinter = new web3.eth.Contract(NFTStorageMinter.abi, networkData.address)
      this.setState({ NFTStorageMinter })
      const imagesCount = await NFTStorageMinter.methods.imageCount().call()
      this.setState({ imagesCount })
      // Load images
      for (var i = 1; i <= imagesCount; i++) {
        const image = await NFTStorageMinter.methods.images(i).call()
        this.setState({
          images: [...this.state.images, image]
        })
      }
      // Sort images. Show highest tipped images first
      this.setState({
        images: this.state.images.sort((a,b) => b.tipAmount - a.tipAmount )
      })
      this.setState({ loading: false})
    } else {
      window.alert('NFTStorageMinter contract not deployed to detected network.')
    }
  }

  captureFile = event => {

    event.preventDefault()
    const file = event.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(file)

    reader.onloadend = () => {
      this.setState({ buffer: Buffer(reader.result) })
      console.log('buffer', this.state.buffer)
    }
  }

  uploadImage = description => {
    console.log("Submitting file to ipfs...")

    //adding file to the IPFS
    const metadata = await client.store({
      name: 'Pinpie',
      description: 'Pin is not delicious beef!',
      image: new File([/* data */], 'pinpie.jpg', { type: 'image/jpg' })
    })

    ipfs.add(this.state.buffer, metadata , (error, result) => {
      console.log('Ipfs result', result)
      if(error) {
        console.error(error)
        return
      }

      this.setState({ loading: true })
      this.state.NFTStorageMinter.methods.uploadImage(result[0].hash, description).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.setState({ loading: false })
      })
    })
  }

  tipImageOwner(id, tipAmount) {
    this.setState({ loading: true })
    this.state.NFTStorageMinter.methods.tipImageOwner(id).send({ from: this.state.account, value: tipAmount }).on('transactionHash', (hash) => {
      this.setState({ loading: false })
    })
  }

  constructor(props) {
    super(props)
    this.state = {
      account: '',
      NFTStorageMinter: null,
      images: [],
      loading: true
    }

    this.uploadImage = this.uploadImage.bind(this)
    this.tipImageOwner = this.tipImageOwner.bind(this)
    this.captureFile = this.captureFile.bind(this)
  }

  openModal = () => {
		this.setState({
			isNewPostModalVisible: !this.state.isNewPostModalVisible
		});
	}

	closeModal = () => {
		this.setState({
			isNewPostModalVisible: false
		});
	}


  render() {
    return (
      <div>
        <Navbar account={this.state.account} />
        {this.state.locked === 'locked' && (
					<div onClick={this.checkout} style={{ cursor: "pointer" }}>
						Unlock me!{" "}
						<span aria-label='locked' role="img">
							🔒
						</span>
					</div>
				)}
				{this.state.locked === 'unlocked' && (
					<div>
						Unlocked!{" "}
						<span aria-label="unlocked" role="img">
							🗝
						</span>
					</div>
				)}
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main
              images={this.state.images}
              captureFile={this.captureFile}
              uploadImage={this.uploadImage}
              tipImageOwner={this.tipImageOwner}
            />
        }
      </div>
    );
  }
}

export default App;