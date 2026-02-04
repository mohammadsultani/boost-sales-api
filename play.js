const fs = require("fs");
const path = require("path");

/* 
  138_600_260126171233.RCZ  468_008_260126214707.RCZ  999_999_260126102311.RCZ
  138_600_260127171234.RCZ  468_008_260127220144.RCZ  999_999_260127102312.RCZ
  138_600_260128171235.RCZ  468_008_260128203900.RCZ  999_999_260128102314.RCZ
  138_600_260129171236.RCZ  468_008_260129213335.RCZ  999_999_260129102314.RCZ
  138_600_260130171237.RCZ  468_008_260130210555.RCZ  999_999_260130102315.RCZ
  138_600_260131171238.RCZ  468_008_260131212501.RCZ  999_999_260131102316.RCZ

*/

const date = "new-26";
const filePath = path.join(__dirname, "test", date + ".RCZ");

let totalSales = 0;
let totalTax = 0;
let billCount = 0;
let qty = [];

const content = fs.readFileSync(filePath, "utf8");
const lines = content.split(/\r?\n/);

for (const line of lines) {
  if (!line.trim()) continue;

  // IMPORTANT: RCZ files are TAB separated
  const columns = line.split("\t");

  const rowType = columns[0];

  // -------------------------
  // TYPE 3 → TOTAL SALES
  // COL4 = TOTAL BILL RM
  // -------------------------
  if (rowType === "3") {
    billCount++;
    //   const salesValue = Number(columns[4]); // COL5

    // if (!isNaN(salesValue)) {
    //   totalSales += salesValue; // handles negatives naturally
    // }
  }

  // -------------------------
  // TYPE 2 → TAX
  // COL15 = TAX RM
  // -------------------------
  if (rowType === "2") {
    // Log the qty
    // console.log(columns[4])
    // qty.push(columns[4]);

    // if (columns[1] == "11004911") {
    //   console.log("not included ------>", columns[1]);
    //   return;
    // }

    const qty = columns[4];

    const salesValue = Number(columns[5]); // COL5
    const taxValue = Number(columns[14]); // COL15

    if (!isNaN(salesValue)) {
      totalSales += salesValue * qty - taxValue; // handles negatives naturally
    }

    if (!isNaN(taxValue)) {
      totalTax += taxValue; // handles negatives naturally
    }
  }
}

console.log("File:", date);
console.log("Bill count:", billCount);
console.log("Total sales:", totalSales.toFixed(2));
console.log("Total tax:", totalTax.toFixed(2));
// console.log("Total sales (net):", (totalSales - totalTax).toFixed(2));
// console.log("Qty array:", JSON.stringify(qty));
/*
  468 files:
  File: 468_008_260126214707
  Bill count: 42
  Total sales: 318.53
  Total tax: 91.00

  File: 468_008_260127220144
  Bill count: 90
  Total sales: 687.64
  Total tax: 176.00

  File: 468_008_260128203900
  Bill count: 68
  Total sales: 508.10
  Total tax: 145.00

  File: 468_008_260129213335
  Bill count: 74
  Total sales: 687.27
  Total tax: 156.00

  File: 468_008_260130210555
  Bill count: 121
  Total sales: 996.37
  Total tax: 265.00

  File: 468_008_260131212501
  Bill count: 163
  Total sales: 1385.95
  Total tax: 316.00
*********************************************************************************************
  138 files:
  File: 138_600_260126171233
  Bill count: 46
  Total sales: 313.53
  Total tax: 25.88

  File: 138_600_260127171234
  Bill count: 91
  Total sales: 610.68
  Total tax: 50.46

  File: 138_600_260128171235
  Bill count: 73
  Total sales: 487.60
  Total tax: 40.26

  File: 138_600_260129171236
  Bill count: 84
  Total sales: 574.62
  Total tax: 47.45

  File: 138_600_260130171237
  Bill count: 128
  Total sales: 991.07
  Total tax: 81.81

  File: 138_600_260131171238
  Bill count: 174
  Total sales: 1289.15
  Total tax: 106.39




*/
