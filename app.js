const API="https://mayconnect-backend-1.onrender.com"

/* TOKEN */

function getToken(){
return localStorage.getItem("token")
}

/* TOAST */

function showToast(msg){

const t=document.createElement("div")
t.innerText=msg
t.style.position="fixed"
t.style.bottom="30px"
t.style.left="50%"
t.style.transform="translateX(-50%)"
t.style.background="#000"
t.style.padding="12px 20px"
t.style.borderRadius="8px"
t.style.color="#fff"
t.style.zIndex="9999"

document.body.appendChild(t)

setTimeout(()=>t.remove(),3000)

}

/* SAFE ELEMENT GETTER */

function el(id){
return document.getElementById(id)
}

/* NETWORK PREFIX */

const NETWORK_PREFIX={
MTN:["0803","0806","0813","0816","0703","0706","0903","0906"],
AIRTEL:["0802","0808","0812","0701","0708","0901","0902"],
GLO:["0805","0807","0811","0705","0905"],
"9MOBILE":["0809","0817","0818","0908"]
}

/* DETECT NETWORK */

function detectNetwork(phone){

phone=phone.replace(/\D/g,"")

if(phone.startsWith("234")){
phone="0"+phone.slice(3)
}

const prefix=phone.substring(0,4)

for(const network in NETWORK_PREFIX){
if(NETWORK_PREFIX[network].includes(prefix)){
return network
}
}

return null
}

/* SHOW NETWORK LOGO */

function showNetworkLogo(network){

const logo=el("networkLogo")
const badge=el("networkName")

if(!logo) return

const logos={
MTN:"images/MTN.png",
AIRTEL:"images/Airtel.png",
GLO:"images/Glo.png",
"9MOBILE":"images/9mobile.png"
}

logo.src=logos[network] || ""
logo.style.display="block"
logo.style.border="3px solid #2f6bff"
logo.style.borderRadius="50%"
logo.style.padding="5px"

if(badge){
badge.innerText=network
badge.style.display="inline-block"
}

}

/* PHONE INPUT */

function handlePhoneInput(input){

const phone=input.value

if(phone.length<4) return

const network=detectNetwork(phone)

if(!network) return

showNetworkLogo(network)

if(el("plans")){
loadDataPlans(network)
}

}

/* LOAD DATA PLANS */

async function loadDataPlans(network){

try{

const token=getToken()

const res=await fetch(`${API}/api/plans`,{
headers:{Authorization:`Bearer ${token}`}
})

const plans=await res.json()

const container=el("plans")

if(!container) return

container.innerHTML=""

const filtered=plans.filter(p =>
p.network && p.network.toUpperCase().includes(network)
)

filtered.forEach(plan=>{

const card=document.createElement("div")
card.className="planCard"

card.innerHTML=`
<h4>${plan.plan}</h4>
<p>₦${plan.price}</p>
<p>${plan.validity || ""}</p>
<button onclick="openPinModal('${plan.plan_id}','data')">Buy</button>
`

container.appendChild(card)

})

}catch(e){

console.log(e)
showToast("Failed to load plans")

}

}

/* PIN MODAL */

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

/* BUY DATA */

async function buyData(planId,pin){

const phone=el("phone")?.value
const token=getToken()

try{

const res=await fetch(`${API}/api/buy-data`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},

body:JSON.stringify({
plan_id:planId,
phone,
pin
})

})

const data=await res.json()

if(!res.ok){
showToast(data.message)
return
}

showToast("Data purchase successful")

}catch{

showToast("Network error")

}

}

/* BUY AIRTIME */

async function buyAirtime(phone,amount,pin){

const token=getToken()

try{

const res=await fetch(`${API}/api/buy-airtime`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},

body:JSON.stringify({
network:detectNetwork(phone),
phone,
amount,
pin
})

})

const data=await res.json()

if(!res.ok){
showToast(data.message)
return
}

showToast("Airtime successful")

}catch{

showToast("Network error")

}

}

/* CONFIRM PURCHASE */

function confirmPurchase(){

const pin=el("pin")?.value

if(!pin){
showToast("Enter transaction PIN")
return
}

if(purchaseType==="airtime"){

const phone=el("phone").value
const amount=el("amount").value

buyAirtime(phone,amount,pin)

}else{

buyData(selectedPlan,pin)

}

closePinModal()

}

/* SAVE PIN */

async function savePin(){

const pin=el("pin")?.value

if(!pin){
showToast("Enter PIN")
return
}

const token=getToken()

try{

const res=await fetch(`${API}/api/set-pin`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},

body:JSON.stringify({pin})

})

const data=await res.json()

showToast(data.message || "PIN saved")

}catch{

showToast("Failed to save PIN")

}

closePinModal()

}

/* BIOMETRIC */

function toggleBiometric(){

const enabled=localStorage.getItem("biometric")

if(enabled){

localStorage.removeItem("biometric")
showToast("Biometric disabled")

}else{

localStorage.setItem("biometric","true")
showToast("Biometric enabled")

}

}

/* PASSWORD */

function changePassword(){
showToast("Password change coming soon")
}

/* DASHBOARD LOADER CONTROL */

function hideLoader(){

const loader=el("dashboardLoader")

if(loader){
loader.style.display="none"
}

}

/* DASHBOARD */

async function loadDashboard(){

const token=getToken()

if(!token){
window.location="login.html"
return
}

try{

const res=await fetch(`${API}/api/user`,{
headers:{Authorization:`Bearer ${token}`}
})

if(!res.ok) throw new Error("API failed")

const user=await res.json()

if(el("usernameDisplay")){
el("usernameDisplay").innerText=`Hello 👋 ${user.name}`
}

if(el("walletBalance")){
el("walletBalance").innerText=`₦${user.wallet || 0}`
}

if(el("profileName")){
el("profileName").innerText=user.name
}

if(el("profileEmail")){
el("profileEmail").innerText=user.email
}

if(user.isAdmin && el("adminPanel")){
el("adminPanel").style.display="block"
}

}catch(e){

console.log("Dashboard API error:",e)

showToast("Dashboard loaded offline")

}

/* ALWAYS HIDE LOADER */

hideLoader()

}

/* AUTO LOADER TIMEOUT (FINTECH FIX) */

setTimeout(()=>{
hideLoader()
},5000)

/* START DASHBOARD */

window.addEventListener("load",()=>{

if(el("walletBalance")){
loadDashboard()
}

})

/* LOGOUT */

function logout(){

localStorage.removeItem("token")

window.location="login.html"

}