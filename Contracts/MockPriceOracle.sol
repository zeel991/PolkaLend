// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockPriceOracle {
    uint256 public priceInUSD;
    address public owner;

    constructor(uint256 initialPrice) {
        priceInUSD = initialPrice;
        owner = msg.sender;
    }

    function updatePrice(uint256 newPrice) external {
        require(msg.sender == owner, "Only owner");
        priceInUSD = newPrice;
    }

    function getPrice() external view returns (uint256) {
        return priceInUSD;
    }
}
