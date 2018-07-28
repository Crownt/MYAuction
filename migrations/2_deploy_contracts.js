var Ecommerce = artifacts.require("./EcommerceStore.sol");

module.exports = function(deployer) {
  deployer.deploy(Ecommerce);
};
