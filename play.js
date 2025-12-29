const axios = require("axios");
const fs = require("fs");

const fetchSales = async () => {
  try {
    const response = await axios.post(
      "https://boostthailand.redcatcloud.com.au/api/v1/reports/kpi/salesby",
      {
        Fields: [
          "TxnDate",
          "TxnTime",
          "StoreID",
          "SaleID",
          "PLUCode",
          "PLUItem",
          "Amount",
          "Sold",
        ],
        Constraints: {
          Operator: "and",
          Value: [
            { Field: "StoreID", Condition: "==", Value: ["1386"] },
            { Field: "Date", Condition: "==", Value: ["2025/06/12"] },
          ],
        },
        // Order: [["SaleID", "desc"]],
        Start: 0,
        Limit: 1000,
      },
      {
        timeout: 5 * 60 * 1000, // 5 minutes
        headers: {
          "Content-Type": "application/json",
          "X-Redcat-Authtoken":
            "uXfWYI/J/7oFCHF4Qs39PEhXWZr0WR6ySpEkvuf3qSkBqXZjaY/KIK+wWFTvk7nYBaUwZHPeJDETA2ypY7ip7WU6Qb9p5Vv1EIaz28SNKvM=",
        },
      }
    );
    console.log("Number of documents ---> ", response.data.count);
    if (!response.data?.count) {
      console.log("response --> ", JSON.stringify(response.data, null, 2));
    }
    fs.writeFileSync("./test.json", JSON.stringify(response.data));
    console.log("---- done ------");
  } catch (error) {
    console.log("error ---> ", error);
  }
};

fetchSales();

// const sales = JSON.parse(fs.readFileSync("./test.json"));

// const totalSales = sales.data.reduce(
//   (acc, ele) => (acc += ele[ele.length - 1]),
//   0
// );
// console.log("total sales ----> ", totalSales);

// token = uXfWYI/J/7oFCHF4Qs39PEhXWZr0WR6ySpEkvuf3qSkBqXZjaY/KIK+wWFTvk7nYBaUwZHPeJDETA2ypY7ip7WU6Qb9p5Vv1EIaz28SNKvM=
// Since 10:55 AM on June 26, 2025

/*
 Notes about the data:

- Quantity = Gross Amount / Gross Price
  (This gives the number of items sold.)

- Transaction count is **not** the same as quantity.

- Gross Price and Price are the same.

- GST is the total tax for the entire row (includes quantity).

- Gross Price = price per unit **including** tax.

- Net Price = price per unit **excluding** tax.

- Gross Amount = total paid for the item (quantity × unit price including tax).

- Net Amount = total paid excluding tax (quantity × net price).

- Amount and Net Amount are the same.

- To get the total bill, use the Gross Amount

- Discount of the bill will be a line item with CategoryName = POS Discounts


 "POSSaleType",
          "POSSaleTypeDesc",
          "InputTypeLabel",
          "InputType",
          "SaleID",
          "PLUItem",
          "GrossAmount",
          "StoreName",
          "UserName",
          "CategoryName",
          "CategoryID",
          "POSSectionName",
          "TerminalEnteredID",
          "TerminalEnteredName",
          "ClassName",
          "BrandName",
          "TxnHour",
          "PLUCode",
          "TerminalFinalisedName",
          "Amount",
          "BundlePrice",
          "GrossPrice",
          "NetPrice",
          "Sold",
          "HeaderBitMask",
          "ClassID",
          "POSAreaID",
          "LastUpdate",
          "LineID",
          "UserID",
          "BundleID",
          "PLUID",
          "NetAmount",
          "POSSectionID",
          "POSAreaName",
          "ParentPLUCode",
          "ParentPLUID",
          "Price",
          "HeaderID",
          "TxnTime",
          "SaleTypeID",
          "RealTimeTxn",
          "StoreID",
          "TxnDate",
          "TxnCount",
          "TxnDateTime",
          "TerminalFinalisedID",
          "UTCLastUpdate",
          "TxnFifteenMinute",
          "TxnHalfHour",
          "GST",
*/

/*

const mallNames = [];
// console.log("length ---> ", sales.data.length);
sales.data.map((item, index) => {
  const payments = item[1][0][1];
  const total = payments.reduce(
    (acc, ele) =>
      (acc +=
        ele[0] !== "Total"
          ? Number(ele[1].replace(/[^0-9.,]/g, "").replace(/,/g, ""))
          : 0),
    0
  );
  const count = payments.reduce(
    (acc, ele) =>
      (acc +=
        ele[0] !== "Total"
          ? Number(ele[2].replace(/[^0-9.,]/g, "").replace(/,/g, ""))
          : 0),
    0
  );

  // console.log("total ---> ", total);
  // console.log("count ---> ", count);

  const totalAmount = payments[payments.length - 1][1]
    .replace(/[^0-9.,]/g, "")
    .replace(/,/g, "");

  const totalCount = payments[payments.length - 1][2]
    .replace(/[^0-9.,]/g, "")
    .replace(/,/g, "");

  // now checking if the total and the count matches each other:
  if (total != totalAmount) {
    console.log("not equal amount --> ", totalAmount, total);
  }
  if (totalCount != count) {
    console.log("not equal count --> ", totalCount, count);
  }

  // console.log("Equal amount --> ", totalAmount, total);
  // console.log("Equal count --> ", totalCount, count);

  // console.log("amount ---> ", totalAmount);
  // console.log("count ---> ", totalCount);
});


Some comments on Boost sales data API

There are two APIs which we can use to get sales data:

First one is sales by item which has the details of the item sold. 
This API has no payment type details.

The other one is sales media.
This API gives total sales for an outlet for a specific date.
The total sales is broken down by payment type. But it is a total figure for the day eg: Cash: 2000.





Username: AcesoftwareAPI

Password: AcesoftwareAPI1234

ZIP file password: ~ja19co65

https://boostthailand.redcatcloud.com.au/admin

https://boostthailand.redcatcloud.com.au/api-documentation/

*/
