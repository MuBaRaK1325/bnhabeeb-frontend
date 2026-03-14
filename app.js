// ========================================
// CONFIG
// ========================================

const API = "https://mayconnect-backend-1.onrender.com"
const token = localStorage.getItem("token")

// ========================================
// PAGE GUARD
// ========================================

const page = window.location.pathname
const isLogin = page.endsWith("/") || page.includes("index.html")

if(!token && !isLogin){
window.location.href="index.html"
}

if(token && isLogin){
window.location.href="dashboard.html"
}

// ========================================
// SOUNDS
// ========================================

const welcomeSound = new Audio("sounds/welcome.mp3")
const successSound = new Audio("sounds/success.mp3")

function playWelcome(){
welcomeSound.currentTime = 0
welcomeSound.play().catch(()=>{})
}

function playSuccess(){
successSound.currentTime = 0
successSound.play().catch(()=>{})
}

// ========================================
// SPLASH LOADER
// ========================================

function hideLoader(){

const loader = document.getElementById("splashLoader")

if(!loader) return

loader.classList.add("hide")

setTimeout(()=>{
loader.style.display="none"
},500)

}

// ========================================
// TOAST
// ========================================

function showToast(msg){

const toast=document.createElement("div")
toast.className="toast"
toast.innerText=msg

document.body.appendChild(toast)

setTimeout(()=>{
toast.remove()
},4000)

}

// ========================================
// NETWORK PREFIX
// ========================================

const NETWORK_PREFIX={

MTN:["0803","0806","0813","0816","0703","0706","0903","0906","0913","0916"],
AIRTEL:["0802","0808","0812","0701","0708","0901","0902","0907"],
GLO:["0805","0807","0811","0705","0905"],
"9MOBILE":["0809","0817","0818","0908","0909"]

}

// ========================================
// FORMAT PHONE
// ========================================

function formatPhone(phone){

phone=phone.replace(/\D/g,"")

if(phone.startsWith("0")){
return "+234"+phone.substring(1)
}

if(phone.startsWith("234")){
return "+"+phone
}

return phone

}

// ========================================
// DETECT NETWORK
// ========================================

function detectNetwork(phone){

phone=phone.replace(/\D/g,"")

const prefix=phone.substring(0,4)

for(const net in NETWORK_PREFIX){

if(NETWORK_PREFIX[net].includes(prefix)){
return net
}

}

return null

}

// ========================================
// NETWORK LOGO
// ========================================

function showNetworkLogo(network){

const logo=document.getElementById("networkLogo")

if(!logo) return

const logos={
MTN:"logos/mtn.png",
AIRTEL:"logos/airtel.png",
GLO:"logos/glo.png",
"9MOBILE":"logos/9mobile.png"
}

if(network && logos[network]){
logo.src=logos[network]
logo.style.display="block"
}else{
logo.style.display="none"
}

}

// ========================================
// PHONE INPUT HANDLER
// ========================================

function handlePhoneInput(input){

let phone=input.value.replace(/\D/g,"")

if(phone.length>11) phone=phone.slice(0,11)

input.value=phone

if(phone.length>=4){

const network=detectNetwork(phone)

showNetworkLogo(network)

if(network){
loadPlans(network)
}

}

}

// ========================================
// CONTACT SAVE
// ========================================

function saveRecipient(phone){

let contacts=JSON.parse(localStorage.getItem("recipients")||"[]")

if(!contacts.includes(phone)){

contacts.push(phone)

localStorage.setItem("recipients",JSON.stringify(contacts))

}

}

function loadRecipients(){

const container=document.getElementById("savedRecipients")

if(!container) return

const contacts=JSON.parse(localStorage.getItem("recipients")||"[]")

container.innerHTML=""

contacts.forEach(phone=>{

container.innerHTML+=`
<button onclick="useRecipient('${phone}')">${phone}</button>
`

})

}

function useRecipient(phone){

const input=document.getElementById("phone")

if(input){

input.value=phone

handlePhoneInput(input)

}

}

// ========================================
// LOGIN
// ========================================

async function login(){

const username=document.getElementById("loginUsername").value
const password=document.getElementById("loginPassword").value

const res=await fetch(`${API}/api/login`,{

method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({username,password})

})

const data=await res.json()

if(!res.ok){
alert(data.message)
return
}

localStorage.setItem("token",data.token)

window.location.href="dashboard.html"

}

// ========================================
// BIOMETRIC LOGIN
// ========================================

async function biometricLogin(){

if(!window.PublicKeyCredential){
alert("Biometric not supported")
return
}

alert("Biometric login coming from saved session")

const savedToken = localStorage.getItem("token")

if(savedToken){

window.location.href="dashboard.html"

}else{

alert("No biometric session found")

}

}

// ========================================
// DASHBOARD
// ========================================

async function loadDashboard(){

if(!token) return

const res=await fetch(`${API}/api/me`,{
headers:{ Authorization:`Bearer ${token}` }
})

const user=await res.json()

if(!res.ok) return

const name=document.getElementById("usernameDisplay")

if(name){
name.innerText=`Hello 👋 ${user.username}`
}

animateBalance(Number(user.wallet_balance||0))

if(user.is_admin){

const adminPanel=document.getElementById("adminPanel")

if(adminPanel) adminPanel.style.display="block"

}

playWelcome()

loadTransactions()

loadRecipients()

hideLoader()

}

window.addEventListener("load",loadDashboard)

// ========================================
// WALLET ANIMATION
// ========================================

function animateBalance(balance){

const el=document.getElementById("walletBalance")

let start=0

const step=balance/40

const timer=setInterval(()=>{

start+=step

if(start>=balance){

el.innerText="₦"+balance.toLocaleString()

clearInterval(timer)

}else{

el.innerText="₦"+Math.floor(start).toLocaleString()

}

},30)

}

// ========================================
// TRANSACTIONS
// ========================================

async function loadTransactions(){

const container=document.getElementById("transactionHistory")

if(!container) return

const res=await fetch(`${API}/api/transactions`,{
headers:{ Authorization:`Bearer ${token}` }
})

const tx=await res.json()

container.innerHTML=""

if(!Array.isArray(tx)) return

tx.forEach(t=>{

container.innerHTML+=`

<div class="transaction-card">

<h4>${t.type.toUpperCase()}</h4>

<p>₦${Number(t.amount).toLocaleString()}</p>

<small>${new Date(t.created_at).toLocaleString()}</small>

<button onclick="repeatPurchase('${t.phone}')">Repeat</button>

</div>

`

})

}

// ========================================
// REPEAT PURCHASE
// ========================================

function repeatPurchase(phone){

const phoneInput=document.getElementById("phone")

if(phoneInput){

phoneInput.value=phone

handlePhoneInput(phoneInput)

}

}

// ========================================
// LOAD DATA PLANS
// ========================================

async function loadPlans(network){

const container=document.getElementById("plans")

if(!container) return

const res=await fetch(`${API}/api/plans?network=${network}`,{
headers:{ Authorization:`Bearer ${token}` }
})

const plans=await res.json()

container.innerHTML=""

if(!Array.isArray(plans)) return

plans.forEach(plan=>{

container.innerHTML+=`

<div class="planCard">

<h4>${plan.plan_name}</h4>

<p>₦${Number(plan.price).toLocaleString()}</p>

<button onclick="openPinModal(${plan.plan_id},'data')">Buy</button>

</div>

`

})

}

// ========================================
// PURCHASE
// ========================================

let selectedPlan=null
let purchaseType=null

function openPinModal(id,type){

selectedPlan=id
purchaseType=type

document.getElementById("pinModal").style.display="flex"

}

function closePinModal(){

document.getElementById("pinModal").style.display="none"

}

async function confirmPurchase(){

const phone=formatPhone(document.getElementById("phone").value)
const pin=document.getElementById("pin").value

let endpoint=""
let body={}

if(purchaseType==="data"){

endpoint="/api/buy-data"

body={plan_id:selectedPlan,phone,pin}

}

if(purchaseType==="airtime"){

const amount=document.getElementById("airtimeAmount").value
const network=detectNetwork(phone)

endpoint="/api/buy-airtime"

body={network,phone,amount,pin}

}

const res=await fetch(`${API}${endpoint}`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},

body:JSON.stringify(body)

})

const data=await res.json()

if(!res.ok){
alert(data.message)
return
}

saveRecipient(phone)

playSuccess()

showToast("✅ Purchase Successful")

closePinModal()

loadDashboard()

}

// ========================================
// ADMIN WITHDRAW
// ========================================

async function adminWithdraw(){

const bank=document.getElementById("bankName").value
const account_number=document.getElementById("accountNumber").value
const amount=document.getElementById("withdrawAmount").value

const res=await fetch(`${API}/api/admin/withdraw`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},

body:JSON.stringify({bank,account_number,amount})

})

const data=await res.json()

if(!res.ok){
alert(data.message)
return
}

showToast("💰 Withdrawal successful")

loadDashboard()

}

// ========================================
// SUPPORT
// ========================================

function contactSupport(){

window.open(
"https://wa.me/2348117988561",
"_blank"
)

}

function callSupport(){

window.location.href="tel:08117988561"

}

// ========================================
// LOGOUT
// ========================================

function logout(){

localStorage.removeItem("token")

window.location.href="index.html"

}