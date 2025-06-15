// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockPriceOracle {
    uint256 public priceInUSD;
    address public owner;

    // MINIMAL ADDITION: Event required by liquidation.tsx
    event PriceUpdated(uint256 indexed oldPrice, uint256 indexed newPrice);

    constructor(uint256 initialPrice) {
        priceInUSD = initialPrice;
        owner = msg.sender;
    }

    function updatePrice(uint256 newPrice) external {
        require(msg.sender == owner, "Only owner");
        
        // MINIMAL ADDITION: Emit event for liquidation.tsx monitoring
        uint256 oldPrice = priceInUSD;
        priceInUSD = newPrice;
        emit PriceUpdated(oldPrice, newPrice);
    }

    function getPrice() external view returns (uint256) {
        return priceInUSD;
    }
}