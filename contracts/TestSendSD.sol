pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract TestSendSD is Ownable {
  address pointless;

  constructor() public {
    owner = msg.sender;
  }

  function kill() external {
    selfdestruct(owner);
  }

  // fallback function
  function () external payable {
    // this should be more than the gas stipend
    pointless = msg.sender;
  }

  function setOwner(address _owner) external onlyOwner {
    owner = _owner;
  }

}
