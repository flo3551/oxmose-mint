// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;
 
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC721A.sol";
import "./Whitelist.sol";
import "./ERC2981ContractWideRoyalties.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./@rarible/royalties/contracts/impl/RoyaltiesV2Impl.sol";
import "./@rarible/royalties/contracts/LibPart.sol";
import "./@rarible/royalties/contracts/LibRoyaltiesV2.sol";

contract Oxmose is ERC721A, ERC2981ContractWideRoyalties, Ownable, Whitelist, RoyaltiesV2Impl {
 
    string public baseURI = "https://ipfs.io/ipfs/QmNdT4Jmf5ZRWGosAaLqMhgB6SYwiDjTMjJKQmA6yzRWKL"; 
    string public jsonAttributesIPFSHash; 
    string public jsonAttributesProvenance = "5f23728d3f0f90e33ea26599a85e2f5edfa8866a3bbab9f6af8fd17d13126b4d";
    bytes32 public whitelistMerkle = 0xc8645472e961de1db838b309d8c7beeaed3e9386a135470809b24d5e238d4215;
    string public arweaveHash;

    bool public saleActive = false;
    bool public whitelistActive = true;
    bool public contractSealed = false;

    // Price and supply definition
    uint constant public OXMOSE_PRICE = 0.3 ether; 
    uint constant public OXMOSE_MAX_SUPPLY = 4000;
    uint constant public OXMOSE_AIRDROP_LIMIT = 20;
  
    //  EIP 2981 Standard Implementation
    address constant public ROYALTY_RECIPIENT = 0x286FF2C8C944085cA876bA04026c4f44Ae1Fc7Fb; // value percentage (using 2 decimals - 10000 = 100, 0 = 0)
    uint96 constant public ROYALTY_PERCENTAGE = 750; // value percentage (using 2 decimals - 10000 = 100, 0 = 0)
 
    address constant private WALLET_1 = 0xd424A453B92b05AeD5195f9221b86c20B19516cB;
    address constant private WALLET_2 = 0x1BEb6235e160B4007b01E74483De4FBE4A10E233;
    address constant private WALLET_3 = 0x1773b544f3EA46CD1D4CC6aACa8e5de337e26889;
 
    constructor ()
        ERC721A("Oxmose Season 1", "OXO1", 10) 
        Whitelist(whitelistMerkle)
    {
        _setRoyalties(ROYALTY_RECIPIENT, ROYALTY_PERCENTAGE);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
 
        if(!contractSealed) {
            return _baseURI();
        }
 
        return string(abi.encodePacked(_baseURI(), Strings.toString(tokenId)));
    }
 
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function sealContract() public onlyOwner {
        require(!contractSealed, "Contract sealed");
        contractSealed = true;
    }
 
    function setBaseURI(string memory _newUri) public onlyOwner {
        require(!contractSealed, "Contract sealed");
        baseURI = _newUri;
    }

    function setJsonAttributesIPFSHash(string memory _hash) public onlyOwner {
        require(!contractSealed, "Contract sealed");
        jsonAttributesIPFSHash = _hash;
    }

    function reveal(string memory _newUri, string memory _hash) public onlyOwner {
        setBaseURI(_newUri);
        setJsonAttributesIPFSHash(_hash);
    }

    function getOxmoseAPIURI(uint tokenId) public view returns(string memory) {
        return string(abi.encodePacked("https://nft.oxmose.co/render/1/", Strings.toString(tokenId)));
    }
 
    function getArweaveURI(uint tokenId) public view returns(string memory) {
        if(bytes(arweaveHash).length != 0) {
            return string(abi.encodePacked("https://arweave.net/", arweaveHash, "/", Strings.toString(tokenId)));
        }
        
        return "Available soon";
    }
 
    function setArweaveHash(string memory _hash) public onlyOwner {
        require(bytes(arweaveHash).length != 0, "Already set");
        arweaveHash = _hash;
    }  

    function toggleWhitelist() public onlyOwner {
        whitelistActive = !whitelistActive;
    }
    
    function toggleSales() public onlyOwner {
        saleActive = !saleActive;
    }
    
    function mint(uint256 quantity, bytes32[] calldata proof, uint256[] calldata positions) public payable {
        require(tx.origin == msg.sender, "The caller is another contract"); 
        require(saleActive, "Sale is not started yet");
        require(msg.value >= OXMOSE_PRICE * quantity, "Wrong price");
        require(numberMinted(msg.sender) <= 5, "You can't mint more Oxmose");
        require(totalSupply() + quantity <= OXMOSE_MAX_SUPPLY - OXMOSE_AIRDROP_LIMIT, "No more Oxmose left");

        if(whitelistActive) {
           require(isWhitelisted(msg.sender, proof, positions), "Not on the whitelist");
        }

        payable(WALLET_1).transfer(msg.value*49/100);
        payable(WALLET_2).transfer(msg.value*49/100);
        payable(WALLET_3).transfer(msg.value*2/100);

        setRoyalties(totalSupply(), payable(ROYALTY_RECIPIENT), ROYALTY_PERCENTAGE);
        _safeMint(msg.sender, quantity);
    }
 
    function airdropOxmose(address receiver, uint256 quantity) public onlyOwner {
        require(totalSupply() + quantity <= OXMOSE_MAX_SUPPLY, "No more Oxmose left");
        _safeMint(receiver, quantity);
    }
 
    function numberMinted(address owner) public view returns (uint256) {
        return _numberMinted(owner);
    }
 
    function getOwnershipData(uint256 tokenId) external view returns (TokenOwnership memory) {
        return ownershipOf(tokenId);
    }
 
    function setRoyalties(uint _tokenId, address payable _royaltiesReceipientAddress, uint96 _percentageBasisPoints) internal {
        LibPart.Part[] memory _royalties = new LibPart.Part[](1);
        _royalties[0].value = _percentageBasisPoints;
        _royalties[0].account = _royaltiesReceipientAddress;
        _saveRoyalties(_tokenId, _royalties);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721A, ERC2981Base) returns (bool) {
        if(interfaceId == LibRoyaltiesV2._INTERFACE_ID_ROYALTIES) {
            return true;
        }
        return super.supportsInterface(interfaceId);
    }                       

    function contractURI() public view returns (string memory) {
        return "https://ipfs.io/ipfs/QmYx5qMumV1qjgeCcvvC9FWUqAXY7qeLeR2ywYMUJ91yT9";
    }                                                                                                                                                                                                    
}