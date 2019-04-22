import web3util from "../web3functions/web_util"
import ipfsModule from "../ipfsCalls/index"
import web3user from "../web3functions/user"

const user = (function(){

  function groupProductsBySeller(products){
    return products.sort((a,b) => (a.seller > b.seller) ? 1 : ((b.seller > a.seller) ? -1 : 0));
  }

  function splitInSellerArray(products){
    var productAux = [];
    var prevSeller = products[0].seller;
    var result = []
    for(let i = 0; i< products.length; i++){
      if(products[i].seller !== prevSeller){
        prevSeller = products[i].seller;
        result.push(productAux);
        productAux = [];
      }
      productAux.push(products[i]);
    }
    result.push(productAux);
    return result;
  }

  function getTotalVAT(products){
    var sum = 0;
    for(let i = 0; i < products.length; i++){
      sum+= (products[i].totalPrice - products[i].netPrice);
    }
    return sum;
  }

  function getTotalNet(products){
    var sum = 0;
    for(let i = 0; i < products.length; i++){
      sum+= products[i].netPrice;
    }
    return sum;
  }

  function getTotal(products){
    var sum = 0;
    for(let i = 0; i < products.length; i++){
      sum+= products[i].totalPrice;
    }
    return sum;
  }


  return {
    buy: function(cartInfo){
      console.log(cartInfo)
      return new Promise((resolve)=>{
         //get all the products

        var products = cartInfo.products;
        console.log(products)
        //cartInfo contains all the information about the order

        //sort the products by seller
        products = groupProductsBySeller(products)
        var orders = splitInSellerArray(products)

        var promises = []
        for(let i = 0; i < orders.length; i++){
          var order = {
            products: orders[i],
            date: cartInfo.date,
            number: new Date().getUTCMilliseconds(),
            VAT: getTotalVAT(orders[i]),
            net: getTotalNet(orders[i]),
            total: getTotal(orders[i]),
            address: cartInfo.date,
            buyerName: cartInfo.buyerName,
            buyerDetails: cartInfo.buyerDetails,
            sellerName: orders[i][0].sellerName,
            sellerVATNumber: orders[i][0].sellerVATNumber
          }
          promises.push(new Promise((resolve)=>{
            ipfsModule.insertJSONintoIPFS(order).then(resolve)
          }))
        }

        Promise.all(promises).then((results)=>{
          //results: array of IPFS (orders)
          var remainingHash = []
          var hashSize = []
          var hashFun = []
          var productQtn = []
          for(let i = 0; i < results.length; i++){
            for(let j = 0 ; j < orders[i].length; j++){
              let [rH, hS, hF] = web3util.splitIPFSHash(results[i]);
              console.log(rH)
              remainingHash.push(rH);
              hashSize.push(hS);
              hashFun.push(hF);
              productQtn.push(orders[i][j].quantity)
            }
          }
          console.log(remainingHash)
          /*let something = []
          for(var i=0; i<products.length; i++){
            something[i] = products[i]
          }*/
          web3user.tokenTransferApprove(cartInfo.VAT+cartInfo.net).then(()=>{
            web3user.purchase(products, remainingHash, hashSize, hashFun, productQtn).then(()=>{
              return resolve()
            })
          })
        })
      })
    },

    getBalance: function(){
      return new Promise((resolve)=>{
        web3user.getBalance().then(resolve)
      })
    }
  }
}());

export default user;

