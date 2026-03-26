const API = "https://mayconnect-backend-1.onrender.com";

/* TOKEN */
function getToken() {
  return localStorage.getItem("token");
}

/* ELEMENT */
function el(id) {
  return document.getElementById(id);
}

/* SUCCESS SOUND */
const successSound = new Audio("sounds/success.mp3");

/* TOAST */
function showToast(msg) {
  const t = document.createElement("div");
  t.innerText = msg;
  Object.assign(t.style, {
    position: "fixed",
    bottom: "30px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#000",
    padding: "12px 20px",
    borderRadius: "8px",
    color: "#fff",
    zIndex: "9999"
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* TRANSACTION ID */
function generateTransactionID() {
  return "MC" + Date.now() + Math.floor(Math.random() * 1000);
}

/* SAVE TRANSACTION */
function saveTransaction(tx) {
  let history = JSON.parse(localStorage.getItem("transactions") || "[]");
  history.unshift(tx);
  localStorage.setItem("transactions", JSON.stringify(history));
}

/* NETWORK PREFIX */
const NETWORK_PREFIX = {
  MTN: ["0803","0806","0703","0706","0813","0816","0810","0814","0903","0906","0913","0916"],
  AIRTEL: ["0802","0808","0701","0708","0812","0901","0902","0907","0911","0912"],
  GLO: ["0805","0807","0705","0811","0815","0905","0915"],
  "9MOBILE": ["0809","0817","0818","0908","0909"]
};

/* DETECT NETWORK */
function detectNetwork(phone) {
  if (!phone) return null;
  phone = phone.replace(/\D/g, "");
  if (phone.startsWith("234")) phone = "0" + phone.slice(3);
  const prefix = phone.substring(0, 4);
  for (const net in NETWORK_PREFIX) {
    if (NETWORK_PREFIX[net].includes(prefix)) return net;
  }
  return null;
}

/* NETWORK LOGO */
function showNetworkLogo(network) {
  const logo = el("networkLogo");
  if (!logo) return;
  const logos = {
    MTN: "images/Mtn.png",
    AIRTEL: "images/Airtel.png",
    GLO: "images/Glo.png",
    "9MOBILE": "images/9mobile.png"
  };
  logo.src = logos[network] || "";
  logo.style.display = "block";
}

/* PHONE INPUT */
let lastNetworkLoaded = null;
function handlePhoneInput(input) {
  const phone = input.value;
  if (phone.length < 4) return;
  const network = detectNetwork(phone);
  if (!network) return;
  showNetworkLogo(network);
  if (network === lastNetworkLoaded) return;
  lastNetworkLoaded = network;
  loadDataPlans(network);
}

/* LOAD DATA PLANS */
async function loadDataPlans(network) {
  try {
    const token = getToken();
    const res = await fetch(`${API}/api/plans?network=${network}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const plans = await res.json();
    const container = el("plans");
    if (!container) return;
    container.innerHTML = "";
    plans.forEach(plan => {
      const name = plan.plan || plan.name || "Data Plan";
      const price = plan.price || plan.amount || 0;
      const validity = plan.validity || plan.duration || "N/A";
      const id = plan.plan_id || plan.id;
      const card = document.createElement("div");
      card.className = "planCard";
      card.innerHTML = `
        <h4>${name}</h4>
        <p>₦${price}</p>
        <p>Validity: ${validity}</p>
        <button onclick="openPinModal('${id}','data')">Buy</button>
      `;
      container.appendChild(card);
    });
  } catch {
    showToast("Failed to load plans");
  }
}

/* PURCHASE MODAL */
let selectedPlan = null;
let purchaseType = null;
function openPinModal(plan, type) {
  selectedPlan = plan;
  purchaseType = type;
  el("pinModal")?.classList.remove("hidden");
}
function closePinModal() {
  el("pinModal")?.classList.add("hidden");
}

/* DATA PURCHASE */
async function buyData(planId, pin) {
  const phone = el("phone")?.value;
  if (!phone) { showToast("Enter phone number"); return; }
  try {
    const res = await fetch(`${API}/api/buy-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ plan_id: planId, phone, pin })
    });
    const data = await res.json();
    if (!data.message) { showToast(data.error || "Transaction failed"); return; }
    successSound.play();
    const tx = {
      id: generateTransactionID(),
      type: "DATA",
      network: detectNetwork(phone),
      phone,
      amount: data.amount || data.price || 0,
      status: "SUCCESS",
      date: new Date().toLocaleString()
    };
    saveTransaction(tx);
    showReceipt(tx);
  } catch {
    showToast("Network error");
  }
}

/* AIRTIME PURCHASE */
async function buyAirtime(phone, amount, pin) {
  try {
    const res = await fetch(`${API}/api/buy-airtime`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ network: detectNetwork(phone), phone, amount, pin })
    });
    const data = await res.json();
    if (!data.message) { showToast(data.error || "Transaction failed"); return; }
    successSound.play();
    const tx = {
      id: generateTransactionID(),
      type: "AIRTIME",
      network: detectNetwork(phone),
      phone,
      amount,
      status: "SUCCESS",
      date: new Date().toLocaleString()
    };
    saveTransaction(tx);
    showReceipt(tx);
  } catch {
    showToast("Network error");
  }
}

/* CONFIRM PURCHASE */
function confirmPurchase() {
  const pin = el("pin")?.value || localStorage.getItem("userPin");
  if (!pin) { showToast("Enter PIN"); return; }
  if (purchaseType === "airtime") {
    buyAirtime(el("phone")?.value, el("amount")?.value, pin);
  } else {
    buyData(selectedPlan, pin);
  }
  closePinModal();
}

/* BIOMETRIC ENABLE & PURCHASE */
function enableBiometric() {
  localStorage.setItem("biometric", "true");
  showToast("Biometric enabled");
}
function confirmBiometric() {
  const savedPin = localStorage.getItem("userPin");
  if (!localStorage.getItem("biometric")) { showToast("Enable biometric first"); return; }
  if (!savedPin) { showToast("Set transaction PIN first"); return; }
  if (purchaseType === "airtime") {
    buyAirtime(el("phone")?.value, el("amount")?.value, savedPin);
  } else {
    buyData(selectedPlan, savedPin);
  }
}

/* SAVE PIN */
function savePin() {
  const pinInputs = document.querySelectorAll(".pinInputs input");
  const pin = Array.from(pinInputs).map(i => i.value).join("");
  if (!pin || pin.length !== 4) { showToast("Enter 4-digit PIN"); return; }
  localStorage.setItem("userPin", pin);
  showToast("PIN saved");
  el("setPinBtn")?.classList.add("hidden");
  el("changePinBtn")?.classList.remove("hidden");
  closePinModal();
}

/* RECEIPT */
function showReceipt(tx) {
  const div = document.createElement("div");
  div.innerHTML = `
    <div class="receipt">
      <h3>MayConnect Receipt</h3>
      <p>Reference: ${tx.id}</p>
      <p>Type: ${tx.type}</p>
      <p>Network: ${tx.network}</p>
      <p>Phone: ${tx.phone}</p>
      <p>Amount: ₦${tx.amount}</p>
      <p>Status: ${tx.status}</p>
      <p>Date: ${tx.date}</p>
    </div>
  `;
  document.body.appendChild(div);
}

/* DASHBOARD */
async function loadDashboard() {
  const token = getToken();
  if (!token) { window.location = "login.html"; return; }
  try {
    const res = await fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    const user = await res.json();

    if (el("usernameDisplay")) el("usernameDisplay").innerText = `Hello ${user.username || 'User'}`;
    if (el("walletBalance")) el("walletBalance").innerText = `₦${user.wallet_balance || 0}`;

    /* ADMIN PANEL */
    if (user.is_Admin) {
      el("AdminPanel")?.classList.remove("hidden");
      const profitEl = el("profitBalance");
      if (profitEl) profitEl.innerText = `₦${user.admin_wallet || 0}`;
    } else el("adminPanel")?.classList.add("hidden");

    /* PIN BUTTON LOGIC */
    if (user.pin || localStorage.getItem("userPin")) {
      el("setPinBtn")?.classList.add("hidden");
      el("changePinBtn")?.classList.remove("hidden");
    } else {
      el("setPinBtn")?.classList.remove("hidden");
      el("changePinBtn")?.classList.add("hidden");
    }

  } catch (e) { console.log(e); showToast("Failed to load dashboard"); }
  el("dashboardLoader")?.remove();
}

/* ADMIN WITHDRAW */
async function adminWithdraw() {
  const amount = el("withdrawAmount")?.value;
  const bank = el("bankName")?.value;
  const account_number = el("accountNumber")?.value;
  if (!amount || !bank || !account_number) { showToast("Fill all fields"); return; }
  try {
    const res = await fetch(`${API}/api/admin/withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ amount, bank, account_number, account_name: bank })
    });
    const data = await res.json();
    showToast(data.message || "Withdrawal completed");
    loadDashboard();
  } catch { showToast("Withdrawal failed"); }
}

/* LOGOUT */
function logout() {
  localStorage.removeItem("token");
  window.location = "login.html";
}

/* MOBILE FIX */
window.addEventListener("load", () => { document.body.style.display = "block"; });

/* INIT DASHBOARD */
document.addEventListener("DOMContentLoaded", loadDashboard);