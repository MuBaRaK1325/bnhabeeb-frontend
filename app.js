// ========================================
// CONFIG
// ========================================

const API = "https://mayconnect-backend-1.onrender.com"
const token = localStorage.getItem("token")

// ========================================
// PAGE GUARD (DEPLOYMENT SAFE)
// ========================================

const currentPage = window.location.pathname
const isLoginPage =
  currentPage.endsWith("/") ||
  currentPage.includes("index.html")

if (!token && !isLoginPage) {
  window.location.href = "index.html"
}

if (token && isLoginPage) {
  window.location.href = "dashboard.html"
}

// ========================================
// SPLASH LOADER
// ========================================

window.addEventListener("load", () => {
  const loader = document.getElementById("splashLoader")
  if (loader) {
    setTimeout(() => {
      loader.style.display = "none"
    }, 1500)
  }
})

// ========================================
// SOUNDS
// ========================================

const welcomeSound = new Audio("sounds/welcome.mp3")
const successSound = new Audio("sounds/success.mp3")

function playWelcomeSound() {
  welcomeSound.play().catch(() => {})
}

// ========================================
// AUTH FUNCTIONS
// ========================================

async function login() {

  const usernameInput = document.getElementById("loginUsername")
  const passwordInput = document.getElementById("loginPassword")

  if (!usernameInput || !passwordInput) {
    alert("Login inputs not found")
    return
  }

  const username = usernameInput.value.trim()
  const password = passwordInput.value.trim()

  if (!username || !password) {
    alert("Enter username and password")
    return
  }

  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.message || "Login failed")
      return
    }

    localStorage.setItem("token", data.token)
    window.location.href = "dashboard.html"

  } catch (err) {
    alert("Server error")
  }
}

async function signup() {

  const username = document.getElementById("signupUsername").value
  const email = document.getElementById("signupEmail").value
  const password = document.getElementById("signupPassword").value

  const res = await fetch(`${API}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password })
  })

  const data = await res.json()
  if (!res.ok) return alert(data.message)

  localStorage.setItem("token", data.token)
  window.location.href = "dashboard.html"
}

// ========================================
// DASHBOARD LOAD
// ========================================

async function loadDashboard() {

  if (!token) return

  try {
    const res = await fetch(`${API}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    const user = await res.json()
    if (!res.ok) return

    const usernameDisplay = document.getElementById("usernameDisplay")
    if (usernameDisplay) {
      usernameDisplay.innerText = `Hello 👋 ${user.username}`
    }

    const wallet = document.getElementById("walletBalance")
    if (wallet) {
      wallet.innerText = `₦${Number(user.wallet_balance || 0).toLocaleString()}`
    }

    // ADMIN PANEL
    if (user.is_admin) {
      const adminPanel = document.getElementById("adminPanel")
      if (adminPanel) adminPanel.style.display = "block"
    }

    playWelcomeSound()
    loadTransactions()

  } catch (err) {
    console.log("Dashboard load error")
  }
}

loadDashboard()

// ========================================
// LOAD TRANSACTIONS
// ========================================

async function loadTransactions() {

  if (!token) return

  const res = await fetch(`${API}/transactions`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  const transactions = await res.json()
  const container = document.getElementById("transactionHistory")
  if (!container) return

  container.innerHTML = ""

  if (!transactions.length) {
    container.innerHTML = "<p>No transactions yet</p>"
    return
  }

  transactions.reverse().forEach(tx => {
    container.innerHTML += `
      <div class="transaction-card">
        <h4>${tx.network || ""} - ${tx.type}</h4>
        <p>₦${Number(tx.amount).toLocaleString()}</p>
        <small>Status: ${tx.status}</small><br>
        <small>${new Date(tx.created_at).toLocaleString()}</small>
      </div>
    `
  })
}

// ========================================
// LOAD DATA PLANS
// ========================================

async function loadPlans(network) {

  const res = await fetch(`${API}/plans?network=${network}`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  const plans = await res.json()
  const container = document.getElementById("plans")
  if (!container) return

  container.innerHTML = ""

  plans.forEach(plan => {
    container.innerHTML += `
      <div class="planCard">
        <h4>${plan.name}</h4>
        <p>₦${Number(plan.price).toLocaleString()}</p>
        <button onclick="openPinModal(${plan.plan_id}, 'data')">
          Buy
        </button>
      </div>
    `
  })
}

// ========================================
// BUY DATA & AIRTIME
// ========================================

let selectedPlan = null
let purchaseType = null

function openPinModal(id, type) {
  selectedPlan = id
  purchaseType = type
  const modal = document.getElementById("pinModal")
  if (modal) modal.style.display = "flex"
}

function closePinModal() {
  const modal = document.getElementById("pinModal")
  if (modal) modal.style.display = "none"
}

async function confirmPurchase() {

  const phone = document.getElementById("phone")?.value
  const pin = document.getElementById("pin")?.value

  if (!phone || !pin) {
    alert("Enter phone and PIN")
    return
  }

  let endpoint = ""
  let body = {}

  // DATA
  if (purchaseType === "data") {
    endpoint = "/buy-data"
    body = { plan_id: selectedPlan, phone, pin }
  }

  // AIRTIME
  if (purchaseType === "airtime") {
    const amount = document.getElementById("airtimeAmount")?.value
    if (!amount) {
      alert("Enter airtime amount")
      return
    }
    endpoint = "/buy-airtime"
    body = { network: selectedPlan, phone, amount, pin }
  }

  const res = await fetch(`${API}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })

  const data = await res.json()
  if (!res.ok) return alert(data.message)

  successSound.play().catch(() => {})
  alert("Purchase successful")

  closePinModal()
  loadDashboard()
}

// ========================================
// ADMIN WITHDRAW
// ========================================

async function adminWithdraw() {

  const bank = document.getElementById("bankName")?.value
  const account_number = document.getElementById("accountNumber")?.value
  const account_name = document.getElementById("accountName")?.value
  const amount = document.getElementById("withdrawAmount")?.value

  if (!bank || !account_number || !account_name || !amount) {
    alert("Fill all fields")
    return
  }

  const res = await fetch(`${API}/admin/withdraw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ bank, account_number, account_name, amount })
  })

  const data = await res.json()
  if (!res.ok) return alert(data.message)

  alert("Withdrawal successful")
  loadDashboard()
}

// ========================================
// TAB NAVIGATION
// ========================================

function openTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(tab => {
    tab.style.display = "none"
  })
  const active = document.getElementById(tabId)
  if (active) active.style.display = "block"
}

// ========================================
// LOGOUT
// ========================================

function logout() {
  localStorage.removeItem("token")
  window.location.href = "index.html"
}