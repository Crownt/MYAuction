import "../stylesheets/app.css";

import {default as Web3} from 'web3';
import {default as contract} from 'truffle-contract'


import ecommerce_store_artifacts from '../../build/contracts/EcommerceStore.json'

var EcommerceStore = contract(ecommerce_store_artifacts);


const ipfsAPI = require('ipfs-api');
const ethUtil = require('ethereumjs-util');

const ipfs = ipfsAPI({host: 'localhost',  port: '5001', protocol: 'http'});

window.App={

  start: function(){
    var self = this;
    EcommerceStore.setProvider(web3.currentProvider);


    //var startPriceErrEvent = EcommerceStore.startPriceErr();

    renderStore();

    var reader;

    $("#product-image").change(function (event) {
      //console.log("选择图片");
      reader = new window.FileReader();
      const file = event.target.files[0];
      reader.readAsArrayBuffer(file);
    });

    $("#add-item-to-store").submit(function (event) {
    //  console.log("保存数据");

      const req = $("#add-item-to-store").serialize();
      let params = JSON.parse('{"' + req.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
      let decodedParams={};
      Object.keys(params).forEach(function (v) {
        decodedParams[v] = decodeURIComponent(decodeURI(params[v]));
      });
      saveProduct(reader,decodedParams);
      event.preventDefault();
    });

    if($("#product-details").length>0){     // ??????????
      //console.log("window.location");
    //  console.log(window.location);
    //  console.log("Search Params="+new URLSearchParams(window.location));
      let productId = new URLSearchParams(window.location.search).get("Id");
    //  console.log(productId);
      renderProductDetails(productId);
    }


    $("#bidding").submit(function(event) {
      $("#msg").hide();


      let amount = $("#bid-amount").val();
      let productId = $("#product-id").val();
    //  console.warn( " for --------->" + productId);
      EcommerceStore.deployed().then(function(i) {
        i.bid(parseInt(productId),parseInt(amount), {
          value: web3.toWei(amount*1.2),
          from: web3.eth.accounts[0],
          gas: 440000
        }).then(function(f) {
            $("#msg").html("出价成功!").show();
            //$("#msg").show();
            //console.log(f)
          }
        ).catch(function (f) {
           $("#msg").html("出价失败,请检查您的出价是否低于当前最高价!").show();
        })
      });
      event.preventDefault();
    });


    $("#finalize-auction").submit(function (event) {
      $("#msg").hide();
      let productId = $("#product-id").val();
      EcommerceStore.deployed().then(function (i) {
        i.finalizeAuction(parseInt(productId),{from:web3.eth.accounts[0]}).then(function (f) {
          $("#msg").html("确认拍卖成功!").show();
        //  location.reload();
        }).catch(function (f) {
          $("#msg").html("请检查您是否是出价最高者或是否已确认过!").show();
          //  console.warn("finalize----->failed");
        });
      });
    event.preventDefault();
    });



    $("#unsold-auction").submit(function (event) {
      $("#msg").hide();
      let productId = $("#product-id").val();
      EcommerceStore.deployed().then(function (i) {
        i.productUnsold(parseInt(productId),{from:web3.eth.accounts[0]}).then(function (f) {
          $("#msg").show();
          $("#msg").html("保证金已退还!");
        //  location.reload();
        }).catch(function (f) {
          $("#msg").html("请检查您是否是卖方或是否已退还保证金!").show();
          //  console.warn("finalize----->failed");
        });
      });
    event.preventDefault();
    });

  }
}


function renderProductDetails(productId) {
//  console.log("renderProductDetails");
//  console.log(productId);
  var highestBid;
  var highestBidder;

  EcommerceStore.deployed().then(function (i) {
    i.highestBidderInfo(productId).then(function (f) {
    //  console.warn("hihgestBidderInfo------>"+f[0]+f[1]);
      highestBid = f[1]/Math.pow(10,18);
      highestBidder = f[0];
    });
  })

  EcommerceStore.deployed().then(function (i) {
    i.productRecords().then(function (f) {
      console.warn("productRecords---->success");
    }).catch(function (f) {
      console.warn("productRecords----->failed");
      console.warn(f);
    });
  });

  EcommerceStore.deployed().then(function (i) {
    i.getProduct(productId).then(function (p) {
      let content="";
      ipfs.cat(p[4]).then(function (stream) {
      //  console.log(stream);
        let content = Utf8ArrayToStr(stream);
        $("#product-desc").append("<div>"+content+"</div>");
      });
    //  console.log("p[3]-->"+p[3]);
      $("#product-image").append("<img src='http://localhost:8081/ipfs/"+p[3]+"' width='250px' heigh='250px' />");
      $("#product-name").html("拍卖品: "+p[1]);
      $("#product-price").html(displayPrice(p[7]));
      $("#product-auction-end").html(displayEndHours(p[5],p[6]));
      $("#product-id").val(p[0]);
    //  $("#bidding,#finalize-auction").hide();
      let currentTime = getCurrentTimeInSeconds();

      if((new Date()/1000) < parseInt(p[5])){
        $("#product-status").html("未开始!");
      }else if((new Date()/1000) < parseInt(p[6])){
        $("#product-status").html("进行中....");
        $("#bidding").removeClass('hidden');
        $("#auction-info").html("最高价:"+highestBid/1.2);
      }else {
          $("#bidding").addClass('hidden');
        if(p[8] > 0){
          $("#product-status").html("已卖出!");
          $("#auction-info").html("成交价:"+highestBid/1.2);
          $("#finalize-auction").removeClass('hidden');
        }else{
          $("#product-status").html("未卖出!");
          $("#unsold-auction").removeClass('hidden');
        }
      }

    });
  });
}


function Utf8ArrayToStr(array) {
  var out, i, len, c;
  var char2, char3;

  out = "";
  len = array.length;
  i = 0;
  while (i < len) {
    c = array[i++];
    switch (c >> 4) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break;
      case 12:
      case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(((c & 0x0F) << 12) |
          ((char2 & 0x3F) << 6) |
          ((char3 & 0x3F) << 0));
        break;
      default:
        break;
    }
  }

  return out;
}

function displayPrice(amt) {
  return web3.fromWei(amt,"ether")+" ETH";
}

function getCurrentTimeInSeconds() {
  return Math.round(new Date()/1000);
}

function displayEndHours(startTime,endTime) {
  let current_time = getCurrentTimeInSeconds();
  let remaining_seconds;
  let headline;
  if(current_time <= startTime){
    remaining_seconds = startTime-current_time;
    headline = "距离开始还剩: ";
  }else if (current_time <= endTime) {
    remaining_seconds = endTime-current_time;
    headline = "距离结束还剩: ";
  }else{
    return "竞拍已结束!";
  }

  let days = Math.trunc(remaining_seconds/(24*60*60));
  remaining_seconds-=days*24*60*60;

  let hours = Math.trunc(remaining_seconds/(60*60));
  remaining_seconds-=hours*60*60;

  let minutes = Math.trunc(remaining_seconds/60);
  remaining_seconds-=minutes*60;

  if(days>0){
     return headline + days + " 天, " + hours + " 时, " + minutes + " 分, "+ remaining_seconds + " 秒";
  }else if(hours>0){
    return headline + '0' + " 天, "+hours +" 时, " + minutes + " 分, "+ remaining_seconds + " 秒";
  }else if(minutes>0){
    return headline + '0' + " 天, "+ '00' +" 时, "+ minutes  + " 分, "+ remaining_seconds + " 秒";
  }else{
    return headline + '0' + " 天, "+ '00' +" 时, "+'00'  + " 分," + remaining_seconds + " 秒";
  }
}

function saveProduct(reader,decodedParams) {
  let imageId,descId;
  saveImageOnIpfs(reader).then(function (id) {
    imageId = id;
    saveTextBlobOnIpfs(decodedParams["product-description"]).then(function (id) {
      descId = id;
      console.warn("imageId--->"+imageId);
      saveProductToBlockchain(decodedParams,imageId,descId);
    });
  });
}

function saveImageOnIpfs(reader) {
  return new Promise(function (resolve,reject) {
    const buffer = Buffer.from(reader.result);
    ipfs.add(buffer).then((response)=>{
    //  console.log(response);
      resolve(response[0].hash);
    }).catch((err)=>{
    //  console.error(err);
      reject(err);
    });
  });
}

function saveTextBlobOnIpfs(blob) {
  return new Promise(function (resolve,reject) {
    const descBuffer = Buffer.from(blob,"utf-8");
    ipfs.add(descBuffer).then((response)=>{
    //  console.log(response);
      resolve(response[0].hash);
    }).catch((err)=>{
    //  console.error(err);
      reject(err);
    });

  });
}

function saveProductToBlockchain(params,imageId,descId) {
//  console.log(params);
  let auctionStartTime = Date.parse(params["product-auction-start"])/1000;
  let auctionEndTime = auctionStartTime + parseInt(params["product-auction-end"])*60*60;
//  console.log("auctionStartTime"+auctionStartTime);
  let despositFromSeller = $("#product-price").val();
  EcommerceStore.deployed().then(function (i) {
    i.addProductToStore(params["product-name"],params["product-category"],imageId,descId,auctionStartTime,auctionEndTime,
  web3.toWei(params["product-price"],'ether'),parseInt(params["product-condition"]),{
    value: web3.toWei(despositFromSeller/5),
    from:web3.eth.accounts[0],
    gas:440000}).then(function (f) {
    console.log(f);
    $("#msg").show();
    $("#msg").html("拍品提交成功!");
    window.location.href='../index.html';
  });

  });
}


function renderStore(){

  var count=0;

  EcommerceStore.deployed().then((i)=>{
    i.productIndex().then((num)=>{
      count=num;
  //    console.log("产品数量--->"+num);
      for(let k=0;k<count;k++){
        i.getProduct.call(k+1).then(function(p){
         $("#product-list").append(buildProduct(p,k+1));
        });
      }
    });
  });
};

function buildProduct(product,id) {
//  console.log("product");
//  console.log(id);
  let node = $("<div/>");
  let img = $("<div/>");
  let desc = $("<div/>");
  node.addClass("col-sm-3 text-center col-margin-bottom-1 ");
  img.addClass("panel panel-primary");
  desc.addClass("panel-footer");
  img.append("<img src='http://localhost:8081/ipfs/"+product[3]+"' width='150px' height='150px' />");
  desc.append("<div>拍品:"+product[1]+"</div>");  //product Name
  desc.append("<div>结束时间:"+dateFtt("yyyy-MM-dd hh:mm:ss",new Date(product[6]*1000))+"</div>");  //product 结束拍卖时间
//  desc.append("<div>起拍价:"+product[7]/10**18+"ETH</div>");  //product 起拍价格
 if(product[9]==0){
    desc.append("<div>当前最高价:"+product[7]/10**18+" ETH</div>");
 }else{
   desc.append("<div>当前最高价:"+product[9]/10**18+" ETH</div>");
 }
  desc.append("<div>当前参与人数:"+product[8]+" </div>");
  desc.append("<a href='product.html?Id="+id+"' class='btn btn-link'>详情</a>");

  node.append(img);
  node.append(desc);

  return node;
};

function dateFtt(fmt,date)
{ //author: meizz
  var o = {
    "M+" : date.getMonth()+1,                 //月份
    "d+" : date.getDate(),                    //日
    "h+" : date.getHours(),                   //小时
    "m+" : date.getMinutes(),                 //分
    "s+" : date.getSeconds(),                 //秒
    "q+" : Math.floor((date.getMonth()+3)/3), //季度
    "S"  : date.getMilliseconds()             //毫秒
  };
  if(/(y+)/.test(fmt))
    fmt=fmt.replace(RegExp.$1, (date.getFullYear()+"").substr(4 - RegExp.$1.length));
  for(var k in o)
    if(new RegExp("("+ k +")").test(fmt))
  fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
  return fmt;
}


window.addEventListener('load',function () {
  if(typeof web3!=='undefined'){
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    window.web3=new Web3(web3.currentProvider);
  }else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

   App.start();
});
