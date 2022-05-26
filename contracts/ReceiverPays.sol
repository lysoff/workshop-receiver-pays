//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract ReceiverPays {
    address public owner = msg.sender;
    mapping(uint => bool) public nonces;

    constructor() payable {}

    function claimPayment(uint _amount, uint _nonce, bytes memory _signature) external {
        require(!nonces[_nonce], "Already paid");
        nonces[_nonce] = true;

        bytes32 prefixedHash = _prefix(keccak256(abi.encodePacked(msg.sender, _amount, _nonce, address(this))));

        require(_verifySig(_signature, prefixedHash) == owner, "Not an owner");

        require(address(this).balance >= _amount, "Insufficient_funds");

        payable(msg.sender).transfer(_amount);
    }

    function _prefix(bytes32 _hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash));
    }

    function _verifySig(bytes memory _sig, bytes32 _prefixedHash) internal pure 
    returns (address) {
        (uint8 v, bytes32 r, bytes32 s) = _splitSignature(_sig);

        return ecrecover(_prefixedHash, v, r, s);
    }

    function _splitSignature(bytes memory _sig) internal pure
    returns (uint8 _v, bytes32 _r, bytes32 _s) {
    require(_sig.length == 65, "Invalid signature");
        assembly {
            _r := mload(add(_sig, 32))
            _s := mload(add(_sig, 64))
            _v := byte(0, mload(add(_sig, 96)))
        }
    }
}
