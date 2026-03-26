const API = "https://mayconnect-backend-1.onrender.com";

/* TOKEN */
function getToken(){
  return localStorage.getItem("token");
}

/* ELEMENT */
function el(id){
  return document.getElementById(id);
}

/* SUCCESS SOUND */
const successSound = new Audio("sounds/success.mp3");

/* TOAST */
function showToast(msg){

  const t=document.createElement("div");

  t.innerText=msg;

  Object.assign(t.style,{
    position:"fixed",
    bottom:"30px",
    left:"50%",
    transform:"translateX(-50%)",
    background:"#000",
    padding:"12px 20px",
    borderRadius:"8px",
    color:"#fff",
    zIndex:"9999"
  });

  document.body.appendChild(t);

  setTimeout(()=>t.remove(),3000);

}

/* TRANSACTION ID */

function generateTransactionID(){
  return "MC"+Date.now()+Math.floor(Math.random()*1000);
}

/* WALLET ANIMATION */

function animateWallet(newBalance){

  const wallet = el("walletBalance");

  if(!wallet) return;

  let current = parseFloat(wallet.innerText.replace("₦",""));

  const step = (current - newBalance)/20;

  const interval=setInterval(()=>{

    current -= step;

    if(current <= newBalance){
      wallet.innerText=`₦${newBalance}`;
      clearInterval(interval);
    }else{
      wallet.innerText=`₦${Math.floor(current)}`;
    }

  },20)

}

/* SAVE TRANSACTION */

function saveTransaction(tx){

  let history=JSON.parse(localStorage.getItem("transactions") || "[]");

  history.unshift(tx);

  localStorage.setItem("transactions",JSON.stringify(history));

}

/* RENDER TRANSACTIONS */

function renderTransactions(){

  const history=JSON.parse(localStorage.getItem("transactions") || "[]");

  const container=el("transactionHistory");

  if(!container) return;

  container.innerHTML="";

  history.slice(0,5).forEach(tx=>{

    const div=document.createElement("div");

    div.className="transaction-card";

    div.innerHTML=`
    <p><strong>${tx.type}</strong> - ₦${tx.amount}</p>
    <p>${tx.phone} (${tx.network})</p>
    <p>${tx.date}</p>
    `;

    container.appendChild(div);

  });

}

/* NETWORK PREFIX */

const NETWORK_PREFIX={
MTN:["0803","0806","0703","0706","0813","0816","0810","0814","0903","0906","0913","0916"],
AIRTEL:["0802","0808","0701","0708","0812","0901","0902","0907","0911","0912"],
GLO:["0805","0807","0705","0811","0815","0905","0915"],
"9MOBILE":["0809","0817","0818","0908","0909"]
}

/* DETECT NETWORK */

function detectNetwork(phone){

if(!phone) return null

phone=phone.replace(/\D/g,"")

if(phone.startsWith("234")) phone="0"+phone.slice(3)

const prefix=phone.substring(0,4)

for(const net in NETWORK_PREFIX){
if(NETWORK_PREFIX[net].includes(prefix)){
return net
}
}

return null

}

/* NETWORK LOGO */

function showNetworkLogo(network){

const logo=el("networkLogo")

if(!logo) return

const logos={
MTN:"images/Mtn.png",
AIRTEL:"images/Airtel.png",
GLO:"images/Glo.png",
"9MOBILE":"images/9mobile.png"
}

logo.src=logos[network]||""

logo.style.display="block"

}

/* PHONE INPUT */

let lastNetworkLoaded=null

function handlePhoneInput(input){

const phone=input.value

if(phone.length<4) return

const network=detectNetwork(phone)

if(!network) return

showNetworkLogo(network)

if(network===lastNetworkLoaded) return

lastNetworkLoaded=network

loadDataPlans(network)

}

/* LOAD DATA PLANS */

async function loadDataPlans(network){

try{

const res=await fetch(`${API}/api/plans?network=${network}`,{
headers:{Authorization:`Bearer ${getToken()}`}
})

const plans=await res.json()

const container=el("plans")

if(!container) return

container.innerHTML=""

plans.forEach(plan=>{

const name=plan.plan||plan.name||"Data Plan"
const price=plan.price||plan.amount||0
const validity=plan.validity||"N/A"
const id=plan.plan_id||plan.id

const card=document.createElement("div")

card.className="planCard"

card.dataset.price=price

card.onclick=()=>{
document.querySelectorAll(".planCard").forEach(c=>c.classList.remove("selected"))
card.classList.add("selected")
}

card.innerHTML=`
<h4>${name}</h4>
<p>₦${price}</p>
<p>Validity: ${validity}</p>
<button onclick="openPinModal('${id}','data')">Buy</button>
`

container.appendChild(card)

})

}catch(e){

showToast("Failed to load plans")

}

}

/* PURCHASE */

let selectedPlan=null
let purchaseType=null

function openPinModal(plan,type){

selectedPlan=plan
purchaseType=type

el("pinModal")?.classList.remove("hidden")

}

function closePinModal(){

el("pinModal")?.classList.add("hidden")

}

/* DATA PURCHASE */

async function buyData(planId,pin){

const phone=el("phone")?.value

if(!phone){
showToast("Enter phone number")
return
}

try{

const res=await fetch(`${API}/api/buy-data`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${getToken()}`
},

body:JSON.stringify({plan_id:planId,phone,pin})

})

const data=await res.json()

if(!data.message){
showToast(data.error||"Transaction failed")
return
}

successSound.play()

const tx={
id:generateTransactionID(),
type:"DATA",
network:detectNetwork(phone),
phone,
amount:data.amount||data.price||0,
status:"SUCCESS",
date:new Date().toLocaleString()
}

saveTransaction(tx)

showReceipt(tx)

renderTransactions()

animateWallet(data.wallet_balance || 0)

loadDashboard()

}catch(e){

showToast("Network error")

}

}

/* AIRTIME PURCHASE */

async function buyAirtime(phone,amount,pin){

try{

const res=await fetch(`${API}/api/buy-airtime`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${getToken()}`
},

body:JSON.stringify({
network:detectNetwork(phone),
phone,
amount,
pin
})

})

const data=await res.json()

if(!data.message){
showToast(data.error||"Transaction failed")
return
}

successSound.play()

const tx={
id:generateTransactionID(),
type:"AIRTIME",
network:detectNetwork(phone),
phone,
amount,
status:"SUCCESS",
date:new Date().toLocaleString()
}

saveTransaction(tx)

showReceipt(tx)

renderTransactions()

animateWallet(data.wallet_balance || 0)

loadDashboard()

}catch(e){

showToast("Network error")

}

}

/* CONFIRM PURCHASE */

function confirmPurchase(){

const pin=el("pin")?.value || localStorage.getItem("userPin")

if(!pin){
showToast("Enter PIN")
return
}

const balanceText=el("walletBalance")?.innerText || "₦0"

const balance=parseFloat(balanceText.replace("₦",""))

let amount=0

if(purchaseType==="airtime"){
amount=parseFloat(el("amount")?.value||0)
}else{
const selectedCard=document.querySelector(".planCard.selected")
if(selectedCard){
amount=parseFloat(selectedCard.dataset.price||0)
}
}

if(balance < amount){
showToast("Insufficient funds")
return
}

if(purchaseType==="airtime"){
buyAirtime(el("phone")?.value,amount,pin)
}else{
buyData(selectedPlan,pin)
}

closePinModal()

}

/* BIOMETRIC LOGIN */

async function biometricLogin(){

try{

if(!window.PublicKeyCredential) return

await navigator.credentials.get({
publicKey:{
challenge:new Uint8Array(32),
timeout:60000,
userVerification:"required"
}
})

showToast("Biometric verified")

}catch(e){

showToast("Biometric authentication cancelled")

}

}

/* PROFESSIONAL RECEIPT */

function showReceipt(tx){

const overlay=document.createElement("div")

overlay.className="receiptOverlay"

overlay.innerHTML=`

<div class="receiptModal" id="receiptCard">

<h3>MayConnect Receipt</h3>

<p><b>Reference:</b> ${tx.id}</p>
<p><b>Type:</b> ${tx.type}</p>
<p><b>Network:</b> ${tx.network}</p>
<p><b>Phone:</b> ${tx.phone}</p>
<p><b>Amount:</b> ₦${tx.amount}</p>
<p><b>Status:</b> ${tx.status}</p>
<p><b>Date:</b> ${tx.date}</p>

<div style="margin-top:15px">

<button onclick="downloadReceipt()">Download</button>

<button onclick="shareReceipt()">Share</button>

<button onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>

</div>

</div>

`

Object.assign(overlay.style,{
position:"fixed",
top:"0",
left:"0",
width:"100%",
height:"100%",
background:"rgba(0,0,0,0.6)",
display:"flex",
justifyContent:"center",
alignItems:"center",
zIndex:10000
})

document.body.appendChild(overlay)

}

/* DOWNLOAD RECEIPT */

function downloadReceipt(){

html2canvas(document.getElementById("receiptCard")).then(canvas=>{

const link=document.createElement("a")

link.download="mayconnect_receipt.png"

link.href=canvas.toDataURL()

link.click()

})

}

/* SHARE RECEIPT */

async function shareReceipt(){

if(!navigator.share){
showToast("Sharing not supported")
return
}

await navigator.share({
title:"MayConnect Receipt",
text:"Transaction completed on MayConnect"
})

}

/* DASHBOARD */

async function loadDashboard(){

const token=getToken()

if(!token){
window.location="login.html"
return
}

await biometricLogin()

try{

const res=await fetch(`${API}/api/me`,{
headers:{Authorization:`Bearer ${token}`}
})

const user=await res.json()

if(el("usernameDisplay")){
el("usernameDisplay").innerText=`Hello ${user.username||"User"}`
}

if(el("walletBalance")){
el("walletBalance").innerText=`₦${user.wallet_balance||0}`
}

if(user.is_admin||user.username==="admin"){

el("adminPanel")?.classList.remove("hidden")

const profitEl=el("profitBalance")

if(profitEl){
profitEl.innerText=`₦${user.admin_wallet||0}`
}

}else{

el("adminPanel")?.classList.add("hidden")

}

renderTransactions()

}catch(e){

showToast("Failed to load dashboard")

}

const loader=el("dashboardLoader")

if(loader) loader.remove()

}

/* ADMIN WITHDRAW */

async function adminWithdraw(){

const amount=el("withdrawAmount")?.value
const bank=el("bankName")?.value
const account_number=el("accountNumber")?.value

if(!amount||!bank||!account_number){
showToast("Fill all fields")
return
}

try{

const res=await fetch(`${API}/api/admin/withdraw`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${getToken()}`
},

body:JSON.stringify({
amount,
bank,
account_number,
account_name:bank
})

})

const data=await res.json()

showToast(data.message||"Withdrawal completed")

loadDashboard()

}catch(e){

showToast("Withdrawal failed")

}

}

/* LOGOUT */

function logout(){

localStorage.removeItem("token")

window.location="login.html"

}

/* FIX LOADER */

window.addEventListener("load",()=>{
const loader=el("dashboardLoader")
if(loader) loader.style.display="none"
})

/* INIT */

document.addEventListener("DOMContentLoaded",loadDashboard)