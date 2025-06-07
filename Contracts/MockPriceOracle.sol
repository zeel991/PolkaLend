// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockPriceOracle {
    uint256 private price;

    constructor(uint256 _price) {
        price = _price;
    }

    function setPrice(uint256 _newPrice) external {
        price = _newPrice;
    }

    function getPrice() external view returns (uint256) {
        return price;
    }
}
