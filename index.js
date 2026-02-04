const axios = require("axios");
const fs = require("fs");
const archiver = require("archiver");
const zipEncrypted = require("archiver-zip-encrypted");

// const tokenLink = "https://boostthailand.redcatcloud.com.au/api/v1/login";
// const salesDataLink =
//   "https://boostthailand.redcatcloud.com.au/api/v1/reports/kpi/salesby";
const fields = [
  "SaleID",
  "PLUItem",
  "GrossAmount",
  "CategoryName",
  "PLUCode",
  "GrossPrice",
  "TxnDateTime",
  "GST",

  // "POSSaleTypeDesc",
  // "InputTypeLabel",
  // "InputType",
  // "StoreName",
  // "UserName",
  // "CategoryID",
  // "POSSectionName",
  // "TerminalEnteredID",
  // "TerminalEnteredName",
  // "ClassName",
  // "BrandName",
  // "TxnHour",
  // "TerminalFinalisedName",
  // "Amount",
  // "BundlePrice",
  // "NetPrice",
  // "Sold",
  // "HeaderBitMask",
  // "ClassID",
  // "POSAreaID",
  // "LastUpdate",
  // "LineID",
  // "UserID",
  // "BundleID",
  // "PLUID",
  // "NetAmount",
  // "POSSectionID",
  // "POSAreaName",
  // "ParentPLUCode",
  // "ParentPLUID",
  // "Price",
  // "HeaderID",
  // "TxnTime",
  // "SaleTypeID",
  // "RealTimeTxn",
  // "StoreID",
  // "TxnDate",
  // "TxnCount",
  // "TerminalFinalisedID",
  // "UTCLastUpdate",
  // "TxnFifteenMinute",
  // "TxnHalfHour",
];
const IDX = {
  SaleID: 0,
  PLUItem: 1,
  GrossAmount: 2,
  CategoryName: 3,
  PLUCode: 4,
  GrossPrice: 5,
  TxnDateTime: 6,
  GST: 7,
};

// zipping the text file with password protection
archiver.registerFormat("zip-encrypted", zipEncrypted);

let storeCode,
  tokenLink,
  salesLink,
  machineID,
  lastRunDate,
  outputDirectory,
  userName,
  password,
  authType,
  datesToFetch = [],
  failedSalesDate = [],
  token = null,
  numberOfBills = 0;

const getToken = async () => {
  try {
    const response = await axios.post(
      tokenLink,
      {
        username: userName,
        psw: password,
        auth_type: authType,
      },
      {
        timeout: 2 * 60 * 1000, // 2 min
      },
    );

    // console.log("response token ---> ", response.data);
    if (response.data.success && response.data.token) {
      return (token = response.data.token);
    }
    throw new Error("Failed to retrieve token");
  } catch (error) {
    console.error("Error fetching token:", error);
    logMessage(`Error fetching token: ${error}\n`);
    await wait(2000);
    throw error;
  }
};

const apiCall = async (start, date) => {
  try {
    const response = await axios.post(
      salesLink,
      {
        Fields: [...fields],
        Constraints: {
          Operator: "and",
          Value: [
            { Field: "StoreID", Condition: "==", Value: [storeCode] },
            { Field: "Date", Condition: "==", Value: [date] },
          ],
        },
        Order: [["SaleID", "asc"]],
        Start: start,
        Limit: 1000,
      },
      {
        timeout: 2 * 60 * 1000, // 2 min
        headers: {
          "Content-Type": "application/json",
          "X-Redcat-Authtoken": token,
        },
      },
    );
    // console.log(
    //   "API call response ---> ",
    //   JSON.stringify(response.data, null, 2)
    // );
    return response.data;
  } catch (error) {
    // console.error("API call error:", error);
    throw error;
  }
};

const getSalesData = async (date) => {
  try {
    if (!date) return;
    // date = "2025/12/25";
    await getToken();
    const response = await apiCall(0, date);
    // console.log(" ----- Sales response ---- ", response);
    if (response.success) {
      if (response.count === 0) {
        console.log(`No sales records available for ${date}`);
        logMessage(`No sales records available for ${date}`);
        await wait(1000);
        return "NO_SALES";
      }

      // Here if the count in the response is more than 1000 we need to make multiple calls
      if (response.count > 1000) {
        let allData = response.data;
        let totalCalls = Math.ceil(response.count / 1000);
        for (let i = 1; i < totalCalls; i++) {
          const start = i * 1000;
          const res = await apiCall(start, date);
          allData = allData.concat(res.data);
        }
        // Write all data to test.json testing
        // fs.writeFileSync("test.json", JSON.stringify(allData));

        // console.log("Total sales data fetched:", allData.length);
        return await outputFile(allData, date);
      } else {
        // Write all data to test.json testing
        // fs.writeFileSync("test.json", JSON.stringify(response.data));

        // console.log("Sales data:", response.data.length);
        return await outputFile(response.data, date);
      }
    }
  } catch (error) {
    console.error("Error fetching sales data:", error);
    throw error;
  }
};

const outputFile = async (data, date) => {
  try {
    let content = "FH\t\t\n"; // file header

    let currentSaleID = null;
    let billRows = [];

    // let billCount = 0;
    numberOfBills = 0;

    const writeBill = (rows) => {
      if (!rows.length) return;

      const first = rows[0];
      const billID = first[IDX.SaleID];

      const billDate = new Date(first[IDX.TxnDateTime]);
      const d = billDate.getDate();
      const m = String(billDate.getMonth() + 1).padStart(2, "0");
      const y = String(billDate.getFullYear()).slice(-2);
      const formattedDate = `${d}/${m}/${y}`;

      const timeSec =
        billDate.getHours() * 360000 +
        billDate.getMinutes() * 6000 +
        billDate.getSeconds() * 100;

      // Total bill = sum of GrossAmount (items + discounts)
      const totalBill = rows.reduce(
        (sum, r) => sum + Number(r[IDX.GrossAmount] || 0),
        0,
      );

      /* ========== BILL HEADER (1) ========== */
      content +=
        "1\t" +
        billID +
        "\tN/A\t" +
        formattedDate +
        "\t" +
        timeSec +
        "\tN/A\t" +
        totalBill +
        "\tN/A".repeat(8) +
        "\n";

      /* ========== ITEM LINES (2) ========== */
      rows.forEach((r) => {
        const grossAmount = Number(r[IDX.GrossAmount] || 0);
        const grossPrice = Number(r[IDX.GrossPrice] || 0);

        const qty = grossPrice > 0 ? grossAmount / grossPrice : "1";

        const categoryName = r[IDX.CategoryName] || "N/A";
        let itemName = r[IDX.PLUItem] || "N/A";

        // If itemName or categoryName contains "voucher" or "discount", set itemName to "VOUCHER" or "Discount"
        itemName =
          itemName.toLowerCase().includes("voucher") ||
          categoryName.toLowerCase().includes("voucher")
            ? "VOUCHER"
            : itemName.toLowerCase().includes("discount") ||
                categoryName.toLowerCase().includes("discount")
              ? "Discount"
              : itemName;

        content +=
          "2\t" +
          billID +
          "\t" +
          (r[IDX.PLUCode] ?? "N/A") +
          "\t" +
          itemName +
          "\t" +
          qty +
          "\t" +
          grossPrice +
          "\tN/A".repeat(8) +
          "\t" +
          Number(r[IDX.GST] || 0) +
          "\t\t" +
          "\n";
      });

      /* ========== PAYMENT LINE (3) ========== */
      content +=
        "3\t" +
        billID +
        "\t1\tN/A\t" +
        totalBill +
        "\tN/A\tCASH" +
        "\tN/A".repeat(8) +
        "\n";
    };

    /* ========== GROUP BY SALE ID ========== */
    for (const row of data) {
      const saleID = row[IDX.SaleID];

      if (saleID !== currentSaleID) {
        if (billRows.length) writeBill(billRows);
        billRows = [row];
        currentSaleID = saleID;
        // testing
        numberOfBills++;
      } else {
        billRows.push(row);
      }
    }

    if (billRows.length) writeBill(billRows);

    const dateObject = new Date(date);
    const fileDate =
      String(dateObject.getFullYear()).substring(2) +
      String(dateObject.getMonth() + 1).padStart(2, "0") +
      String(dateObject.getDate()).padStart(2, "0");

    const timeStamp = new Date();

    const hour = String(timeStamp.getHours()).padStart(2, "0");
    const minutes = String(timeStamp.getMinutes()).padStart(2, "0");
    const seconds = String(timeStamp.getSeconds()).padStart(2, "0");

    const fileName = machineID + fileDate + hour + minutes + seconds; //+ ".RCZ";

    // for testing
    // fs.writeFileSync(outputDirectory + `${fileName}.RCZ`, content);

    const output = fs.createWriteStream(outputDirectory + `${fileName}.ZIP`);
    const archive = archiver.create("zip-encrypted", {
      zlib: { level: 8 },
      encryptionMethod: "zip20", // the other more secure option is 'aes256', but not fully supported
      password: "~ja19co65",
    });

    // output.on("close", () => {
    //   console.log(`ZIP created: ${archive.pointer()} bytes`);
    // });
    archive.on("error", (err) => {
      throw err;
    });

    // Pipe archive to file
    archive.pipe(output);

    // Add your text file
    archive.append(content, { name: fileName + ".RCZ" });

    // Finalize
    await archive.finalize();
    return "SUCCESS";
  } catch (error) {
    throw error;
  }
};

const toDate = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d); // LOCAL midnight
};

const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const readSettingsAndComputeDates = async () => {
  try {
    fs.writeFileSync("./log.txt", "", "utf-8");
    logMessage("The program started running.\n");
    console.log("The program started running");

    const raw = fs.readFileSync("settings.txt", "utf8");
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const today = new Date();
    const yesterday = addDays(today, -1);
    const thirtyDaysAgo = addDays(today, -30);

    /* ========= PARSE CONFIG ========= */

    userName =
      lines[0]?.split("=")[0] == "USER_NAME" ? lines[0]?.split("=")[1] : null;
    password =
      lines[1]?.split("=")[0] == "PASSWORD" ? lines[1]?.split("=")[1] : null;

    authType =
      lines[2]?.split("=")[0] == "AUTH_TYPE" ? lines[2]?.split("=")[1] : null;

    tokenLink =
      lines[3]?.split("=")[0] == "TOKEN_LINK" ? lines[3]?.split("=")[1] : null;
    salesLink =
      lines[4]?.split("=")[0] == "SALES_LINK" ? lines[4]?.split("=")[1] : null;
    outputDirectory =
      lines[5]?.split("=")[0] == "OUTPUT_DIRECTORY"
        ? lines[5]?.split("=")[1]
        : null;
    storeCode =
      lines[6]?.split("=")[0] == "STORE_ID" ? lines[6]?.split("=")[1] : null;
    machineID =
      lines[7]?.split("=")[0] == "MACHINE_ID" ? lines[7]?.split("=")[1] : null;
    lastRunDate =
      lines[8]?.split("=")[0] == "LAST_RUN_DATE"
        ? lines[8]?.split("=")[1]
        : null;

    if (
      !tokenLink ||
      !salesLink ||
      !outputDirectory ||
      !storeCode ||
      !machineID ||
      !lastRunDate
    ) {
      throw new Error("Missing required configuration in settings.txt");
    }

    /*
   ========= HANDLE LAST RUN DATE =========
    If LAST_RUN_DATE is yesterday → do nothing
    If LAST_RUN_DATE is within last 30 days → fetch missing dates
    If LAST_RUN_DATE is older than 30 days → fetch only the last 30 days
  */

    const lastRun = toDate(lastRunDate);

    // Determine where to start
    let startDate;

    // If last run is older than 30 days, start from 30 days ago
    if (lastRun < thirtyDaysAgo) {
      startDate = thirtyDaysAgo;
    }
    // If last run is within last 30 days, start from next day
    else if (lastRun < yesterday) {
      startDate = addDays(lastRun, 1);
    }

    // Generate dates up to yesterday
    if (startDate) {
      let cursor = startDate;

      while (cursor <= yesterday) {
        datesToFetch.push(formatDate(cursor));
        cursor = addDays(cursor, 1);
      }
    }

    /* ========= ALWAYS INCLUDE YESTERDAY ========= */

    datesToFetch.push(formatDate(yesterday));

    /* ========= HANDLE MANUAL DATE INPUTS (LINE 4+) ========= */

    for (let i = 9; i < lines.length; i++) {
      const entry = lines[i];

      // Date range
      if (entry.includes(",")) {
        let [startStr, endStr] = entry.split(",");

        let start = startOfDay(toDate(startStr.trim()));
        let end = startOfDay(toDate(endStr.trim()));

        // Clamp to allowed window
        // if (start < thirtyDaysAgo) start = thirtyDaysAgo;
        // if (end > yesterday) end = yesterday;

        if (start > end) continue;

        let cursor = start;
        while (cursor <= end) {
          datesToFetch.push(formatDate(cursor));
          cursor = addDays(cursor, 1);
        }
      }
      // Single date
      else {
        const date = startOfDay(toDate(entry.trim()));
        // console.log("Manual date entry:", formatDate(date));
        if (date <= yesterday) {
          datesToFetch.push(formatDate(date));
        }
      }
    }

    /* ========= REMOVE DUPLICATES + SORT ========= */

    datesToFetch = [...new Set(datesToFetch)].sort();

    logMessage(
      "Preparing to fetch sales data for the following dates:\n" +
        datesToFetch.join(", ") +
        "\n",
    );

    // console.log("Dates to fetch:", datesToFetch);
    // console.log("Store Code:", storeCode);
    // console.log("Machine ID:", machineID);
    // console.log("Last Run Date:", lastRunDate);

    // Now process each date sequentially
    await (async () => {
      for (const date of datesToFetch) {
        console.log(`\nFetching sales data for date: ${date}`);
        try {
          const result = await getSalesData(date);
          if (result === "NO_SALES") continue;
          logMessage(
            `Sales data fetched successfully for ${date}. (Number of Bills: ${numberOfBills})\n`,
          );
          console.log(
            `Sales data fetched successfully for ${date}. (Number of Bills: ${numberOfBills})`,
          );
        } catch (error) {
          console.error(`Failed to fetch data for ${date}`);
          logMessage(`Failed to fetch data for ${date}: ${error}\n`);
          failedSalesDate.push(date);
        }
      }
    })();
  } catch (error) {
    console.error("Error in:", error);
    return logMessage(`Error in: ${error.message}\n`);
  } finally {
    if (failedSalesDate.length) {
      console.log("\nDates that failed to fetch sales data:", failedSalesDate);
      logMessage(
        `Dates that failed to fetch sales data: ${failedSalesDate.join(", ")}\n`,
      );
    } else {
      console.log("\nAll dates fetched successfully.");
    }

    const uniqueFailedDates = [...new Set(failedSalesDate)];
    const runDate = formatDate(new Date());
    let content =
      "USER_NAME=" +
      userName +
      "\n" +
      "PASSWORD=" +
      password +
      "\n" +
      "AUTH_TYPE=" +
      authType +
      "\n" +
      "TOKEN_LINK=" +
      tokenLink +
      "\n" +
      "SALES_LINK=" +
      salesLink +
      "\n" +
      "OUTPUT_DIRECTORY=" +
      outputDirectory +
      "\n" +
      "STORE_ID=" +
      storeCode +
      "\n" +
      "MACHINE_ID=" +
      machineID +
      "\n" +
      "LAST_RUN_DATE=" +
      runDate +
      "\n" +
      (uniqueFailedDates.length ? uniqueFailedDates.join("\n") : "");
    fs.writeFileSync("./settings.txt", content);

    console.log("The program finished running.");
    logMessage("The program finished running.\n");
    return wait(3000);
  }
};

readSettingsAndComputeDates();

function logMessage(message) {
  const time = new Date().toLocaleString();
  const logMessage =
    typeof message === "string"
      ? message
      : message?.stack || message?.message || String(message);

  const logEntry = `${time} - ${logMessage}\n`;

  try {
    fs.appendFileSync("./log.txt", logEntry, "utf-8");
  } catch (fsError) {
    console.error("Failed to write to log file:", fsError);
    wait(1000);
  }
}

// getSalesData();
