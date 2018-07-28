pragma solidity ^0.4.17;

import "./Escrow.sol";

contract EcommerceStore {

  uint public productIndex;
  mapping (uint => address) productIdInStore;
  mapping (address => mapping (uint => Product)) stores;
  mapping (uint => address) productEscrow;
  mapping (uint => uint) productDespositFromSeller;
  mapping (uint => bool) isProductDespositRelease;
  mapping (uint => bool) isProductUnsold;
//  mapping (uint => mapping (uint => Bid)) public productRecords;


  /* enum ProductStatus{
    Open,
    Sold,
    Unsold,
    Closed
  } */

  enum ProductCondition{
    New,
    Used
  }

  struct Bid{
    address bidder;
    uint productId;
    uint value;
  }

  struct Product {
    uint id;
    string name;
    string categore;
    string imageLink;
    string descLink;
    uint auctionStartTime;
    uint auctionEndTime;
    uint startPrice;
  //  ProductStatus status;
    ProductCondition condition;
    address highestBidder;
    uint highestBid;
    address secondHighestBidder;
    uint secondHighestBid;
    uint totalBids;

    mapping (address => mapping (uint => Bid) ) bids;
  }


  event startPriceErr();


function EcommerceStore() public{
  productIndex=0;
}

function addProductToStore(string _name,string _categore,string _imageLink,string _descLink,
  uint _auctionStartTime,uint _auctionEndTime,uint _startPrice,ProductCondition _condition) payable public{

    require(_auctionStartTime<_auctionEndTime);
    productIndex+=1;
    Product memory product=Product(productIndex,_name,_categore,_imageLink,_descLink,_auctionStartTime
      ,_auctionEndTime,_startPrice,_condition,0,0,0,0,0);
    stores[msg.sender][productIndex]=product;
    productIdInStore[productIndex]=msg.sender;
    productDespositFromSeller[productIndex]= msg.value;
    isProductDespositRelease[productIndex] = false;
    isProductUnsold[productIndex] = false;
}


function getProduct(uint _productId) view public returns (uint,string,string,string,string,uint,uint,uint,uint,uint){
    Product memory product=stores[productIdInStore[_productId]][_productId];
    return(product.id,product.name,product.categore,product.imageLink,product.descLink,
      product.auctionStartTime,product.auctionEndTime,product.startPrice, product.totalBids,product.highestBid);
}

function bid(uint _productId,uint _bid) payable public returns (bool) {
  Product storage product = stores[productIdInStore[_productId]][_productId];
  require(now >= product.auctionStartTime);
  require(now <= product.auctionEndTime);

  if(msg.value < product.startPrice){
    emit startPriceErr();
    require(false);
  }
//require(product.bids[msg.sender][_bid].bidder==0);
  product.bids[msg.sender][_bid] = Bid(msg.sender,_productId,msg.value);
  product.totalBids += 1;

  if(address(product.highestBidder)==0){
    product.highestBidder = msg.sender;
    product.highestBid = msg.value;
    product.secondHighestBid = product.startPrice;
  }else{
    if(msg.value >= product.highestBid){
      require(msg.sender != product.highestBidder);
      product.secondHighestBid = product.highestBid;
      product.secondHighestBidder = product.highestBidder;
      product.highestBid = msg.value;
      product.highestBidder = msg.sender;
      address(product.secondHighestBidder).transfer(product.secondHighestBid);
    }else{
      require(false);
    }
  }
  return true;
}


function highestBidderInfo(uint _productId) view public returns(address,uint,uint) {
  Product  memory product = stores[productIdInStore[_productId]][_productId];
  return (product.highestBidder,product.highestBid,product.secondHighestBid);
}

function totalBids(uint _productId) view public returns (uint) {
  Product memory product = stores[productIdInStore[_productId]][_productId];
  return product.totalBids;
}

function stringToUint(string s) pure private returns(uint) {
    bytes memory b = bytes(s);
    uint result = 0;
    for (uint i = 0; i < b.length; i++) {
      if (b[i] >= 48 && b[i] <= 57) {
        result = result * 10 + (uint(b[i]) - 48);
      }
    }
    return result;
  }

function finalizeAuction(uint _productId) public {
  Product storage product = stores[productIdInStore[_productId]][_productId];
  require(msg.sender == product.highestBidder);
  require(isProductDespositRelease[_productId] == false);
  product.highestBidder.transfer(product.highestBid/6);
  productIdInStore[_productId].transfer(productDespositFromSeller[_productId]+product.highestBid/6*5);
  isProductDespositRelease[_productId] = true;
}

function productUnsold(uint _productId) public{
  require(msg.sender ==  productIdInStore[_productId]);
  require(isProductUnsold[_productId] == false);
  productIdInStore[_productId].transfer(productDespositFromSeller[_productId]);
  isProductUnsold[_productId] == true;
}


/* function getStatus(uint _productId)  public returns(ProductStatus){
  Product storage product = stores[productIdInStore[_productId]][_productId];
  if(now < product.auctionStartTime){
    product.status = ProductStatus.Closed;
  }else if(now < product.auctionEndTime){
    product.status = ProductStatus.Open;
  }else{
    if(product.totalBids==0){
      product.status = ProductStatus.Unsold;
    }else{
      product.status = ProductStatus.Sold;
    }
  }
  return product.status;
} */

/* function startAuction(uint _productId) public {
  Product storage product = stores[productIdInStore[_productId]][_productId];
  if(msg.sender == product.highestBidder){
    if(product.status == ProductStatus.Sold){
      Escrow escrow = (new Escrow).value(product.startPrice/5)(_productId, product.highestBidder, productIdInStore[_productId]);
      productEscrow[_productId] = address(escrow);
    }
  }else{
    require(false);
  } */
  /* require(now > product.auctionEndTime);
  require(product.status == ProductStatus.Open);
  require(msg.sender != product.highestBidder);
  require(msg.sender != productIdInStore[_productId]);

  if(product.totalBids == 0){
    product.status = ProductStatus.Unsold;
  }else{
    product.status = ProductStatus.Sold;
    Escrow escrow = (new Escrow).value(product.secondHighestBid)(_productId, product.highestBidder,
    productIdInStore[_productId], msg.sender);
    productEscrow[_productId] = address(escrow);

    uint refund  = product.highestBid - product.secondHighestBid;
    product.highestBidder.transfer(refund);
  } */



/* function finalizeAuction(uint _productId) public{
  Product storage product = stores[productIdInStore[_productId]][_productId];
  require(msg.sender == product.highestBidder);
  Escrow(productEscrow[_productId]).releaseDeposit();


} */


/* function escrowAddressForProduct(uint _productId) view public returns (address) {
  return productEscrow[_productId];
} */

/* function escrowInfo(uint _productId) view public returns (address, address, address, bool, uint, uint) {
  return Escrow(productEscrow[_productId]).escrowInfo();
}

function releaseAmountToSeller(uint _productId) public  {
  Escrow(productEscrow[_productId]).releaseAmountToSeller(msg.sender);
}

function refundAmountToBuyer(uint _productId) public {
  Escrow(productEscrow[_productId]).refundAmountToBuyer(msg.sender);
} */

}
