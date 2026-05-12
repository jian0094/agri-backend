// ===============================
// 載入資料庫連線
// ===============================
const db = require("../config/db");


// ===============================
// createBlockchainRecord()
// 功能：
// 將區塊鏈資料存進 MySQL
// ===============================
function createBlockchainRecord(data) {

  // 回傳 Promise
  return new Promise((resolve, reject) => {

    // ===============================
    // SQL 新增語法
    // ===============================
    const sql = `
      INSERT INTO blockchain_records (

        trace_code,
        product_name,
        producer_name,
        location,

        block_index,
        block_hash,
        previous_hash,
        merkle_root,
        nonce

      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;



    // ===============================
    // 對應 SQL 的值
    // ===============================
    const values = [

      // 追溯碼
      data.traceCode,

      // 農產品名稱
      data.productName,

      // 生產者名稱
      data.producerName,

      // 產地
      data.location,

      // 區塊編號
      data.blockIndex,

      // 區塊 Hash
      data.blockHash,

      // 前一個區塊 Hash
      data.previousHash,

      // Merkle Root
      data.merkleRoot,

      // nonce
      data.nonce
    ];



    // ===============================
    // 執行 SQL
    // ===============================
    db.query(sql, values, (err, result) => {

      // 如果 SQL 發生錯誤
      if (err) {

        reject(err);

        return;
      }



      // 新增成功
      resolve(result);

    });

  });

}


// ===============================
// 匯出 function
// ===============================
module.exports = {
  createBlockchainRecord
};