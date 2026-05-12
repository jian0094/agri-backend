const { execFile } = require("child_process");
const path = require("path");
const db = require("../config/db");

// 將文字轉成 Base64，避免中文傳給 Java 時亂碼
function toBase64(text) {
  return Buffer.from(String(text || ""), "utf8").toString("base64");
}

// 將 db.query 包成 Promise，方便使用 async / await
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(results);
    });
  });
}

// 統一產品欄位名稱
function normalizeProduct(product) {
  return {
    traceCode: product.traceCode || product.number || product.trace_code,
    productName: product.productName || product.product_name,
    producerName: product.producerName || product.producer_name || "未知生產者",
    location: product.location || product.sampling_location || "未知地點"
  };
}

// 呼叫 Java 區塊鏈程式
function runJavaBlockchain(javaArgs) {
  return new Promise((resolve, reject) => {
    const jarPath = path.join(
      __dirname,
      "../blockchain/agri-blockchain.jar"
    );

    const args = [
      "-Dfile.encoding=UTF-8",
      "-Dsun.stdout.encoding=UTF-8",
      "-jar",
      jarPath,
      ...javaArgs
    ];

    execFile(
      "java",
      args,
      {
        encoding: "utf8",
        maxBuffer: 1024 * 1024
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error("Java 執行失敗");
          console.error(error);
          reject(error);
          return;
        }

        try {
  console.log("===== Java 回傳 =====");
  console.log(stdout);

  const cleanStdout = stdout
    .trim()
    .replace(/[\u0000-\u001F]+/g, "");

  const result = JSON.parse(cleanStdout);
  resolve(result);
}catch (err) {
          console.error("JSON 解析失敗");
          console.error(stdout);
          reject(err);
        }
      }
    );
  });
}

// 第一次上鏈：計算 Hash，並存進 blockchain_records
async function addToBlockchain(product) {
  const p = normalizeProduct(product);

  const recordTimestamp = new Date().toISOString();
  const blockTimestamp = new Date().toISOString();

  const lastBlocks = await query(`
    SELECT block_hash, block_index
    FROM blockchain_records
    ORDER BY id DESC
    LIMIT 1
  `);

  let previousHash = "0";
  let blockIndex = 1;

  if (lastBlocks.length > 0) {
    previousHash = lastBlocks[0].block_hash;
    blockIndex = lastBlocks[0].block_index + 1;
  }

  const javaArgs = [
    toBase64(p.traceCode),
    toBase64(p.productName),
    toBase64(p.producerName),
    toBase64(p.location),
    toBase64(recordTimestamp),
    toBase64(blockTimestamp),
    String(blockIndex),
    previousHash
  ];

  const blockchainResult = await runJavaBlockchain(javaArgs);

  await query(`
    INSERT INTO blockchain_records
    (
      trace_code,
      product_name,
      producer_name,
      location,
      block_index,
      block_hash,
      previous_hash,
      merkle_root,
      nonce,
      record_timestamp,
      block_timestamp
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    p.traceCode,
    p.productName,
    p.producerName,
    p.location,
    blockchainResult.blockIndex,
    blockchainResult.blockHash,
    blockchainResult.previousHash,
    blockchainResult.merkleRoot,
    blockchainResult.nonce,
    blockchainResult.recordTimestamp,
    blockchainResult.blockTimestamp
  ]);

  return blockchainResult;
}

// 查詢時驗證：重新計算 Hash，並和資料庫原本 Hash 比對
async function verifyBlockchain(product) {
  const p = normalizeProduct(product);

  const savedBlocks = await query(`
    SELECT *
    FROM blockchain_records
    WHERE trace_code = ?
    ORDER BY id DESC
    LIMIT 1
  `, [p.traceCode]);

  if (savedBlocks.length === 0) {
    return {
      valid: false,
      message: "查無原始區塊鏈紀錄，無法驗證",
      originalHash: null,
      recalculatedHash: null
    };
  }

  const savedBlock = savedBlocks[0];

  const javaArgs = [
    toBase64(p.traceCode),
    toBase64(p.productName),
    toBase64(p.producerName),
    toBase64(p.location),
    toBase64(savedBlock.record_timestamp),
    toBase64(savedBlock.block_timestamp),
    String(savedBlock.block_index),
    savedBlock.previous_hash
  ];

  const verifyResult = await runJavaBlockchain(javaArgs);

  const isValid =
    verifyResult.blockHash === savedBlock.block_hash &&
    verifyResult.merkleRoot === savedBlock.merkle_root;

  return {
    valid: isValid,
    message: isValid
      ? "區塊鏈驗證成功，資料未被竄改"
      : "區塊鏈驗證失敗，資料可能被竄改",
    traceCode: p.traceCode,
    blockIndex: savedBlock.block_index,
    originalHash: savedBlock.block_hash,
    recalculatedHash: verifyResult.blockHash,
    originalMerkleRoot: savedBlock.merkle_root,
    recalculatedMerkleRoot: verifyResult.merkleRoot,
    previousHash: savedBlock.previous_hash,
    nonce: verifyResult.nonce,
    recordTimestamp: savedBlock.record_timestamp,
    blockTimestamp: savedBlock.block_timestamp
  };
}

module.exports = {
  addToBlockchain,
  verifyBlockchain
};