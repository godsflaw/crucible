function web3AsynWrapper(fn) {
  return function (arg) {
    return new Promise((resolve, reject) => {
      fn(arg, (e, data) => e ? reject(e) : resolve(data));
    })
  }
}

module.exports = web3AsynWrapper;
