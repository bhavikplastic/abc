var invoice = {
    hNum: null,
    hDate: null,
    hBill: null,
    hItems: null,
    hTotal: null,

    init: () => {
        invoice.hNum = document.getElementById("inNum");
        invoice.hDate = document.getElementById("inDate");
        invoice.hBill = document.getElementById("inBill");
        invoice.hItems = document.getElementById("itemsList");
        invoice.hTotal = document.getElementById("totals");
    },

    add: () => {
        let row = document.createElement("div");
        row.className = "irow";
        row.innerHTML = `
            <input type="number" class="qty" min="1" placeholder="Qty" required onchange="invoice.total()">
            <input type="text" class="item" placeholder="Item Name" required>
            <input type="number" class="price" min="0.00" step="0.01" placeholder="Price Each" required onchange="invoice.total()">
            <input type="button" value="X" onclick="invoice.remove(this.parentElement)">
        `;
        invoice.hItems.appendChild(row);
        invoice.total();
    },

    remove: (row) => {
        row.remove();
        invoice.total();
    },

    total: () => {
        let total = 0;
        for (let row of invoice.hItems.querySelectorAll(".irow")) {
            let qty = parseInt(row.querySelector(".qty").value) || 0;
            let price = parseFloat(row.querySelector(".price").value) || 0;
            total += qty * price;
        }
        invoice.hTotal.innerHTML = "Grand Total: $" + total.toFixed(2);
    },

    print: () => {
        if (invoice.hItems.querySelectorAll(".irow").length == 0) {
            alert("Please add at least one item.");
            return false;
        }
        let printWindow = window.open("", "PRINT", "height=600,width=800");
        printWindow.document.write("<html><head><title>Invoice</title></head><body>");
        printWindow.document.write("<h1>Invoice</h1>");
        printWindow.document.write("<p>Invoice Number: " + invoice.hNum.value + "</p>");
        printWindow.document.write("<p>Date: " + invoice.hDate.value + "</p>");
        printWindow.document.write("<p>Bill To: " + invoice.hBill.value.replace(/\n/g, "<br>") + "</p>");
        printWindow.document.write("<h2>Items</h2>");
        printWindow.document.write("<table><tr><th>Qty</th><th>Item</th><th>Price Each
