const baseUrl = "https://script.google.com/macros/s/AKfycbyg9RmH2iFblNzWNBBL7J4SR-W003CQnDju8RPoPBINF_cD6Fdidkn7h9QLvMsL8u4z/exec";
const whatsappNumber = "917593925926";

// 💡 50g മുതൽ തുടങ്ങേണ്ട സാധനങ്ങൾ
const specialItems = [
  "കറിവേപ്പില", "Curry leaves", "Curryleaves",
  "മല്ലിചെപ്പ്", "Coriander", "Coriander leaves",
  "പൊതീന", "Mint", "Mint leaves"
]; 

// 💡 Piece (എണ്ണം) ആയി കണക്കാക്കേണ്ട സാധനങ്ങൾ
const pieceItems = [
  "വെള്ളരിക്ക", "വെള്ളരി", "കോളിഫ്ലവർ", "കോളി ഫ്ലവർ", "മത്തങ്ങ", "തേങ്ങ", "കരിക്കിൻ", "cucumber", "cauliflower"
];

let productList = [];
let cart = {};

// ആദ്യമായി ലോഡ് ചെയ്യുമ്പോൾ കാണിക്കാൻ
if (document.getElementById("products")) {
  document.getElementById("products").innerHTML = "<p style='text-align:center;'>Loading products...</p>";
}

function fetchData() {
  // Cache ബാധിക്കാതിരിക്കാൻ Timestamp ചേർക്കുന്നു
  const fetchUrl = `${baseUrl}?t=${new Date().getTime()}`;

  fetch(fetchUrl, {
    method: "GET",
    redirect: "follow" // 💡 Google Script 302 Redirect പ്രശ്നം പരിഹരിക്കുന്നു
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then(data => {
      productList = Array.isArray(data) ? data : (data.data || []);
      displayProducts();
    })
    .catch(error => {
      console.error("Error fetching data:", error);
      if (productList.length === 0 && document.getElementById("products")) {
        document.getElementById("products").innerHTML = "<p style='color: red; text-align: center;'>ഡാറ്റ ലോഡ് ചെയ്യുന്നതിൽ പിഴവ്!</p>";
      }
    });
}

// ആദ്യ തവണ വിളിക്കുന്നു
fetchData();

// ഓരോ 10 സെക്കന്റിലും പശ്ചാത്തലത്തിൽ ആട്ടോമാറ്റിക് അപ്‌ഡേറ്റ് ചെയ്യുന്നു
setInterval(fetchData, 10000);

function displayProducts() {
  const container = document.getElementById("products");
  if (!container) return;

  if (productList.length === 0) {
    container.innerHTML = "<p style='text-align:center;'>No products available</p>";
    return;
  }

  let html = "";

  productList.forEach((item, index) => {
    // ഷീറ്റിലെ കീ വാക്കുകൾ ചെറിയ അക്ഷരങ്ങളാക്കി മാറ്റി പരിശോധിക്കുന്നു
    const keys = Object.keys(item).reduce((acc, key) => {
      acc[key.toLowerCase().replace(/\s+/g, '')] = item[key];
      return acc;
    }, {});

    let name = keys['name'] || "No Name";
    let offPrice = parseFloat(keys['offerprice']) || 0;

    if (name !== "No Name" && offPrice > 0) {
      const itemKey = `prod_${index}`;

      let isPiece = pieceItems.some(p => p.toLowerCase().trim() === name.toString().toLowerCase().trim());
      let isSpecial = specialItems.some(special => special.toLowerCase().trim() === name.toString().toLowerCase().trim());

      let changeValue = isPiece ? 1 : (isSpecial ? 0.05 : 0.25);
      let unitText = isPiece ? "Piece" : "kg";

      let currentQtyText = cart[itemKey] ? formatWeight(cart[itemKey].qty, isPiece) : "0";

      html += `
        <div class="product">
          <div class="product-details">
            <p class="product-name">${name}</p>
            <p class="product-price">₹${offPrice}/${unitText}</p>
          </div>
          <div class="qty-controls">
            <button class="btn-minus" onclick="changeQty('${itemKey}', '${name}', ${offPrice}, -${changeValue}, ${isPiece})">-</button>
            <span class="qty-value" id="qty-${itemKey}">${currentQtyText}</span>
            <button class="btn-plus" onclick="changeQty('${itemKey}', '${name}', ${offPrice}, ${changeValue}, ${isPiece})">+</button>
          </div>
        </div>
      `;
    }
  });

  container.innerHTML = html;
  updateCartUI();
}

function changeQty(key, name, pricePerUnit, change, isPiece = false) {
  if (!cart[key]) {
    cart[key] = { name: name, price: pricePerUnit, qty: change > 0 ? 0 : -change, isPiece: isPiece };
  }

  const latestProduct = productList.find((item, idx) => `prod_${idx}` === key);
  if (latestProduct) {
    const keys = Object.keys(latestProduct).reduce((acc, k) => {
      acc[k.toLowerCase().replace(/\s+/g, '')] = latestProduct[k];
      return acc;
    }, {});
    cart[key].price = parseFloat(keys['offerprice']) || pricePerUnit;
  }

  cart[key].qty += change;
  cart[key].qty = Math.round(cart[key].qty * 100) / 100;

  if (cart[key].qty < 0) {
    cart[key].qty = 0;
  }

  if (cart[key].qty > 100) {
    cart[key].qty = 100;
    alert("Maximum order capacity is 100");
  }

  const currentQty = cart[key].qty;
  const qtyElem = document.getElementById(`qty-${key}`);
  if (qtyElem) {
    qtyElem.innerText = formatWeight(currentQty, isPiece);
  }

  if (currentQty === 0) {
    delete cart[key];
  }

  updateCartUI();
}

function formatWeight(qty, isPiece = false) {
  if (qty === 0) return "0";

  if (isPiece) {
    return `${qty} Piece`;
  }

  let totalGrams = Math.round(qty * 1000);
  let kilograms = Math.floor(totalGrams / 1000);
  let grams = totalGrams % 1000;

  if (kilograms > 0 && grams > 0) {
    return `${kilograms}kg ${grams}g`;
  } else if (kilograms > 0) {
    return `${kilograms}kg`;
  } else {
    return `${grams}g`;
  }
}

function updateCartUI() {
  const cartItemsDiv = document.getElementById("cart-items");
  const cartTotalDiv = document.getElementById("cart-total");

  if (!cartItemsDiv || !cartTotalDiv) return;

  const activeKeys = Object.keys(cart);

  if (activeKeys.length === 0) {
    cartItemsDiv.innerHTML = "Cart Empty";
    cartTotalDiv.innerHTML = " Total ₹0";
    return;
  }

  let html = "";
  let total = 0;

  activeKeys.forEach(key => {
    const item = cart[key];

    const latestProduct = productList.find((p, idx) => `prod_${idx}` === key);
    if (latestProduct) {
      const keys = Object.keys(latestProduct).reduce((acc, k) => {
        acc[k.toLowerCase().replace(/\s+/g, '')] = latestProduct[k];
        return acc;
      }, {});
      item.price = parseFloat(keys['offerprice']) || item.price;
    }

    const itemTotal = item.price * item.qty;
    total += itemTotal;

    html += `
      <div class="cart-item">
        <span>${item.name} (${formatWeight(item.qty, item.isPiece)})</span>
        <span>₹${itemTotal.toFixed(2)}</span>
      </div>
    `;
  });

  cartItemsDiv.innerHTML = html;
  cartTotalDiv.innerHTML = ` Total ₹${total.toFixed(2)}`;
}

function sendWhatsAppOrder() {
  const nameElem = document.getElementById("cust-name");
  const phoneElem = document.getElementById("cust-phone");
  const addressElem = document.getElementById("cust-address");

  const name = nameElem ? nameElem.value.trim() : "";
  const phone = phoneElem ? phoneElem.value.trim() : "";
  const address = addressElem ? addressElem.value.trim() : "";

  const activeKeys = Object.keys(cart);

  if (activeKeys.length === 0) {
    alert("Please add items to your cart first!");
    return;
  }

  if (!name || !phone || !address) {
    alert("Please fill Name, Phone, and Address.");
    return;
  }

  let message = `*New Vegetable Order From NSI VEGETABLES*\n\n`;
  message += `*Customer Details:*\n`;
  message += `Name: ${name}\n`;
  message += `Phone: ${phone}\n`;
  message += `Address: ${address}\n\n`;
  message += `*Items:*\n`;

  let grandTotal = 0;
  activeKeys.forEach((key, index) => {
    const item = cart[key];
    const itemTotal = item.price * item.qty;
    grandTotal += itemTotal;
    message += `${index + 1}. ${item.name} - ${formatWeight(item.qty, item.isPiece)} (₹${itemTotal.toFixed(2)})\n`;
  });

  message += `\n*Total: ₹${grandTotal.toFixed(2)}*`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodedMessage}`;

  window.open(whatsappUrl, '_blank');
}