import Web3 from 'web3';
import Oxmose from "../artifacts/Oxmose.json";
import detectEthereumProvider from '@metamask/detect-provider';

const getWeb3 = () => {
    return new Promise(async (resolve, reject) => {
        let provider = await detectEthereumProvider();

        if (provider) {
            await provider.request({ method: 'eth_requestAccounts' });
            try {
                const web3 = new Web3(window.ethereum);
                resolve(web3);
            } catch (error) {
                reject(error);
            }
        } else {
            reject('Install Metamask');
        }

    });
}

const getOxmose = async web3 => {
    const networkId = await web3.eth.net.getId();
    const deploymentNetwork = Oxmose.networks[networkId];
    let contrat=  new web3.eth.Contract(
        Oxmose.abi,
        deploymentNetwork && deploymentNetwork.address
        );
        console.log("contrat", contrat);
    return contrat;
}

export { getWeb3, getOxmose }