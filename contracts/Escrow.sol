pragma solidity ^0.4.17;

contract Escrow{

  uint public productId;
  address public buyer;
  address public seller;
//  address public arbiter;
  uint public amount;
  uint public depositFromBuyer;
  uint public depositFromSeller;
  bool public fundsDisbursed;
  /* mapping (address => bool) releaseAmount;
  uint public releaseCount;
  mapping (address => bool) refundAmount;
  uint public refundCount; */

  /* event CreateEscrow(uint _productId,address _buyer,address _seller,address _arbiter);
  event UnlockAmount(uint _productId,string _operation,address operator);
  event DisburseAmount(uint _productId,uint _amount,address _beneficiary); */

  function Escrow(uint _productId, address _buyer, address _seller) payable public {
    productId = _productId;
    buyer = _buyer;
    seller = _seller;
    amount  = msg.value;
    /*depositFromBuyer = _depositFromBuyer;
    depositFromSeller = _depositFromSeller; */
    fundsDisbursed = false;

  //  emit CreateEscrow(_productId, _buyer, _seller, _arbiter );
  }

  function getDepositFromBuyer() payable public {
    depositFromBuyer = msg.value;
  }

  function getDepositFromSeller() payable public {
    depositFromSeller = msg.value;
  }

  function releaseDeposit() public{
    buyer.transfer(depositFromBuyer);
    seller.transfer(depositFromSeller+amount);
    fundsDisbursed = true;
  }

  /* function escrowInfo() view public returns (address, address, address, bool, uint, uint) {
    return (buyer, seller, arbiter, fundsDisbursed, releaseCount, refundCount);
  } */

/* function releaseAmountToSeller(address caller) public {
  require(fundsDisbursed==false);
  if((caller == buyer || caller == seller || caller == arbiter) && releaseAmount[caller] != true){
    releaseAmount[caller] = true;
    releaseCount += 1;
    emit UnlockAmount(productId, "release", caller);
  }

  if(releaseCount == 2){
    seller.transfer(amount);
    fundsDisbursed = true;
    emit DisburseAmount(productId, amount, seller);
  }
}

function refundAmountToBuyer(address caller) public  {
  require(!fundsDisbursed);
  if((caller == buyer || caller == seller || caller == arbiter) && refundAmount[caller] != true){
    refundAmount[caller] = true;
    refundCount += 1;
    emit UnlockAmount(productId, "refund", caller);
  }

  if(refundCount == 2){
    buyer.transfer(amount);
    fundsDisbursed = true;
    emit DisburseAmount(productId, amount, buyer);
  }
} */

}
