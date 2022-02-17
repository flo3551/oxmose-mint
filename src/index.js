import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { ClipLoader, HashLoader } from 'react-spinners';
import { css } from "@emotion/react";
import { getWeb3, getOxmose } from "./utils.js";
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const whitelist = require("../dist/whitelist.json");
const MathUtils = {
    roundToPrecision: function (subject, precision) {
        return +((+subject).toFixed(precision));
    }
};
const spinnerCss = css`
  display: block;
  margin: 0 auto;
`;

function App() {
    const [loader, setLoader] = useState(true);
    const [web3, setWeb3] = useState(undefined);
    const [accounts, setAccounts] = useState(undefined);
    const [oxmose, setOxmose] = useState(undefined);
    const [qty, setQty] = useState(0);
    const [nbMintPublic, setNbMintPublic] = useState(0);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [totalSupply, setTotalSupply] = useState(0);
    const [maxSupply, setMaxSupply] = useState(0);
    const [priceLabel, setPriceLabel] = useState("0.3");
    const [isSoldOut, setSoldOut] = useState(false);
    const [txPending, setTxPending] = useState(false);

    // const [countdownDate, setCountdownDate] = useState(1645128000000); PROD TIMESTAMP
    const [countdownDate, setCountdownDate] = useState(1645038300000);
    const [countdownEnded, setCountdownEnded] = useState(undefined);
    const [countdownDays, setCountdownDays] = useState("00");
    const [countdownHours, setCountdownHours] = useState("00");
    const [countdownMinutes, setCountdownMinutes] = useState("00");
    const [countdownSeconds, setCountdownSeconds] = useState("00");

    const init = async () => {
        setLoader(true);
        if (window.ethereum) {
            const web3 = await getWeb3();
            const accounts = await web3.eth.getAccounts();
            const oxmose = await getOxmose(web3);
            if (!oxmose._address) {
                alert("Please switch to the Ethereum network, and refresh !");
            }
            const totalSupply = await oxmose.methods.OXMOSE_MAX_SUPPLY().call();
            const maxSupply = await oxmose.methods.totalSupply().call();
            const nbMintPublic = await oxmose.methods.numberMinted(accounts[0]).call();

            if (totalSupply === maxSupply) {
                setSoldOut(true);
            }

            setWeb3(web3);
            setAccounts(accounts);
            setOxmose(oxmose);
            setTotalSupply(totalSupply);
            setMaxSupply(maxSupply);
            setNbMintPublic(nbMintPublic);

            initEventListener()
        }
        setLoader(false);
    }

    const initCountdown = () => {
        let x = setInterval(function () {
            // Get today's date and time
            var now = new Date().getTime();

            // Find the distance between now and the count down date
            var distance = countdownDate - now;

            // Time calculations for days, hours, minutes and seconds
            var days = Math.floor(distance / (1000 * 60 * 60 * 24));
            var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((distance % (1000 * 60)) / 1000);

            // Display the result in the element with id="demo"
            setCountdownDays(days);
            setCountdownHours(hours);
            setCountdownMinutes(minutes);
            setCountdownSeconds(seconds);
            // If the count down is finished, write some text
            if (distance < 0) {
                clearInterval(x);
                setCountdownEnded(true);
                document.getElementById("mint-right-section").removeAttribute("hidden")
                document.getElementById("mint-separator-section").removeAttribute("noopacity")
            } else {
                setCountdownEnded(false);
            }
        }, 1000);
    }

    useEffect(() => {
        initCountdown();
    }, [])

    const initEventListener = async () => {
        window.ethereum.addListener('connect', async (response) => {
            const accounts = await web3.eth.getAccounts();
            setAccounts(accounts);
        });

        window.ethereum.on('accountsChanged', () => {
            window.location.reload();
        });

        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });

        window.ethereum.on('disconnect', () => {
            window.location.reload();
        });
    }

    function handleQtyChange(e) {
        let qty = parseInt(e.target.value);
        let price;

        if (!qty || qty == "0") {
            price = "0.3"
        } else {
            price = MathUtils.roundToPrecision(0.3 * qty, 1).toString();
        }

        checkQuantity(qty);
        setPriceLabel(price);
        setQty(qty);
    }

    const getPriceEth = async (qty) => {
        let price = 0.3;

        return web3.utils.toWei((price * qty).toString());
    }

    const mint = async () => {
        let priceToPay = await getPriceEth(qty);
        const leaves = whitelist.map(address => keccak256(address));
        const tree = new MerkleTree(leaves, keccak256, { sort: true });
        const leaf = keccak256(accounts[0]);

        const proof = tree.getHexProof(leaf);
        setTxPending(true);
        await oxmose.methods
            .mint(web3.utils.toBN(qty), proof, [])
            .send({ from: accounts[0], value: priceToPay })
            .once("confirmation", async () => {
                console.log("transaction done");
                setSuccess("Mint Successful !");
                setError("");
                const nbMintPublic = await oxmose.methods.numberMinted(accounts[0]).call();
                setNbMintPublic(parseInt(nbMintPublic));
                setTxPending(false);
            })
            .once('error', async () => {
                setSuccess("");
                setError("Transaction failed, please try again !");
                console.error("transaction failed");
                const nbMintPublic = await oxmose.methods.numberMinted(accounts[0]).call();
                setNbMintPublic(parseInt(nbMintPublic));
                setTxPending(false);
            });;
    }

    const submit = async (e) => {
        e.preventDefault();
        if (!txPending) {
            let quantityValid = await checkQuantity(qty);
            if (quantityValid) {
                mint();
            }
        }
    }

    const checkQuantity = async (qty) => {
        const nbMintPublic = await oxmose.methods.numberMinted(accounts[0]).call();

        if (isNaN(qty) || parseInt(qty) === 0) {
            setError("Quantity must be greater than 0.");
            setSuccess("");

            return false;
        } else if (parseInt(qty) + parseInt(nbMintPublic) > 5) {
            let mintLeft = 5 - nbMintPublic;
            setError("You only have " + mintLeft + " mint left.");
            setSuccess("");

            return false
        } else {
            setError("");
            setSuccess("");

            return true
        }
    }

    const checkSaleActiveAndMintAllowed = async (contract, accounts) => {
        let publicSaleActive = await contract.methods.saleActive().call();
        setSaleActive(publicSaleActive);
    }

    return (

        <div className="flex-1 md:flex flex-col justify-end text-center">
            {countdownEnded !== undefined &&
                <div>
                    {countdownEnded ?
                        <div>
                            {isSoldOut ?
                                <div>
                                    <p className='text-red font-bold'>SOLD OUT !</p>
                                </div>
                                :
                                <div>
                                    {web3 && !loader ?
                                        <div>
                                            {!txPending ?
                                                <div>
                                                    <div className="md:mx-10 bg-gradient-to-r rounded-full from-indigo-500 to-pink-500 text-white font-bold text-xl sm:text-2xl md:text-3xl flex">
                                                        <input onChange={e => { handleQtyChange(e) }} className="pl-6 w-16 bg-transparent rounded-l-full border-r border-purple-900" placeholder="0" type="number" min="1" max="5" autoFocus />
                                                        <a href="#" onClick={e => { submit(e) }} className={`${txPending ? "cursor-not-allowed opacity-60 bg-opacity-25" : "hover:scale-105"} pr-10 pl-5 py-5 block w-full rounded-r-full transition duration-300 ease transform`}>
                                                            Mint {priceLabel} ETH
                                                            <div className="text-sm text-center font-normal">+ fees</div>
                                                        </a>
                                                    </div>
                                                    <div className="text-white py-5 font-bold">Minted {nbMintPublic} / 5 NFTs </div>
                                                    <div className="text-white text-xs">Connected with {accounts[0]}</div>
                                                </div>
                                                :
                                                <div>
                                                    <HashLoader className="mt-10" color="#ffffff" css={spinnerCss} loading={true} size={50} />
                                                    <div className="text-white py-5 font-bold">Minted {nbMintPublic} / 5 NFTs </div>
                                                    <div className="text-white text-xs">Connected with {accounts[0]}</div>
                                                </div>
                                            }
                                        </div>

                                        :
                                        <div>
                                            <a className="px-6 py-3 inline-block text-white rounded-full font-bold bg-gradient-to-r from-indigo-500 to-pink-500 transition duration-300 ease transform hover:scale-105"
                                                href={window.ethereum ? "#" : "https://metamask.app.link/dapp/mint.oxmose.co/"}
                                                target={window.ethereum ? "" : "_blank"}
                                                onClick={() => { init() }}>
                                                Connect
                                            </a>
                                        </div>
                                    }

                                    {error && <p className='alert text-red'>{error}</p>}
                                    {success && <p className='alert text-green'>{success}</p>}
                                </div>
                            }
                        </div>
                        :
                        <div>
                            <div className="flex-grow mx-auto px-3 md:container xl:max-w-screen-xl flex flex-col items-center justify-center z-10">
                                <div>

                                    <div className="py-4 px-0 md:p-4 bg-opacity-25 rounded-xl">
                                        <h2 className="text-center text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-pink-500">
                                            Public sale starts in:
                                        </h2>
                                        <div className="mt-10 mx-auto px-4 md:px-0 flex justify-center items-center font-bold text-gray-500 text-center">
                                            <div className="mx-1 md:mx-6 p-1 py-3 md:p-4 w-1/4 bg-white bg-opacity-5 rounded-2xl">
                                                <div id="days" className="md:w-20 lg:w-24 md:text-5xl lg:text-7xl text-indigo-400">{countdownDays}</div>
                                                <div className="uppercase text-xs md:text-base text-pink-400">days</div>
                                            </div>
                                            <div className="mx-1 md:mx-6 p-1 py-3 md:p-4 w-1/4 md:text-5xl lg:text-7xl bg-white bg-opacity-5 rounded-2xl">
                                                <div id="hours" className="md:w-20 lg:w-24 md:text-5xl lg:text-7xl text-indigo-400">{countdownHours}</div>
                                                <div className="uppercase text-xs md:text-base text-pink-400">hours</div>
                                            </div>
                                            <div className="mx-1 md:mx-6 p-1 py-3 md:p-4 w-1/4 md:text-5xl lg:text-7xl bg-white bg-opacity-5 rounded-2xl">
                                                <div id="minutes" className="md:w-20 lg:w-24 md:text-5xl lg:text-7xl text-indigo-400">{countdownMinutes}</div>
                                                <div className="uppercase text-xs md:text-base text-pink-400">minutes</div>
                                            </div>
                                            <div className="mx-1 md:mx-6 p-1 py-3 md:p-4 w-1/4 md:text-5xl lg:text-7xl bg-white bg-opacity-5 rounded-2xl">
                                                <div id="seconds" className="md:w-20 lg:w-24 md:text-5xl lg:text-7xl text-indigo-400">{countdownSeconds}</div>
                                                <div className="uppercase text-xs md:text-base text-pink-400">seconds</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                </div>
            }

        </div>
    )
}

ReactDOM.render(
    React.createElement(App, {}, null),
    document.getElementById('react-target')
);