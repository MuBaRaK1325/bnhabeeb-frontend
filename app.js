const backendUrl = "https://mayconnect-backend-1.onrender.com"

const token = () => localStorage.getItem("token")

const $ = id => document.getElementById(id)

/* ================= AUTH GUARD ================= */

if (!token() && !location.pathname.includes("login"))
location.href = "login.html"

/* ================= DASHBOARD LOAD ================= */

async function loadDashboard(){

const res = await fetch(`${backendUrl}/api/wallet`,{
headers:{Authorization:`Bearer ${token()}`}
})

const data = await res.json()

$("walletBalance").textContent=`₦${data.wallet_balance}`

$("greeting").textContent=`Hello, ${data.name} 👋`

if(data.is_admin){

document.getElementById("adminPanel").style.display="block"

}

}

/* ================= LOAD PLANS ================= */

async function loadPlans(){

const res = await fetch(`${backendUrl}/api/plans`,{
headers:{Authorization:`Bearer ${token()}`}
})

const plans = await res.json()

const grid = $("plansGrid")

grid.innerHTML=""

plans.forEach(p=>{

const card=document.createElement("div")

card.className="plan-card"

card.innerHTML=`
<h4>${p.network}</h4>
<p>${p.name}</p>
<strong>₦${p.price}</strong>
`

card.onclick=()=>selectPlan(p)

grid.appendChild(card)

})

}

/* ================= SELECT PLAN ================= */

let selectedPlan=null

function selectPlan(plan){

selectedPlan=plan

$("confirmOrderBtn").classList.remove("hidden")

}

/* ================= PURCHASE ================= */

async function confirmOrder(){

const phone=$("phone").value

if(!phone)return alert("Enter phone")

const res = await fetch(`${backendUrl}/api/purchase`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token()}`
},

body:JSON.stringify({
plan:selectedPlan.plan_id,
phone
})

})

const data=await res.json()

if(res.ok){

document.getElementById("successSound").play()

alert("Purchase successful")

}else{

alert(data.error)

}

}

/* ================= SET PIN ================= */

async function submitPin(){

const pin=[...document.querySelectorAll(".pin-inputs input")]
.map(i=>i.value)
.join("")

const res=await fetch(`${backendUrl}/api/set-pin`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token()}`
},

body:JSON.stringify({pin})

})

if(res.ok){

alert("PIN saved")

}

}

/* ================= ADMIN WITHDRAW ================= */

async function adminWithdraw(){

const amount=$("withdrawAmount").value
const bank=$("bankName").value
const account=$("accountNumber").value

const res=await fetch(`${backendUrl}/api/admin/withdraw`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token()}`
},

body:JSON.stringify({amount,bank,account})

})

const data=await res.json()

alert(data.message || data.error)

}

/* ================= MORE ================= */

function toggleMore(){

document.getElementById("morePanel").classList.toggle("hidden")

}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded",()=>{

if(location.pathname.includes("dashboard")){

document.getElementById("welcomeSound")?.play()

loadDashboard()

}

if(document.getElementById("plansGrid")){

loadPlans()

}

})