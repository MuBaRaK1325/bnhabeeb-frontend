const API = "https://mayconnect-backend-1.onrender.com"
const token = localStorage.getItem("token")

/* ==============================
GLOBAL ERROR HANDLER
============================== */

window.onerror = function(){
showToast("Something went wrong ⚠️")
hideLoader()
return true
}

window.onunhandledrejection = function(){
showToast("Network issue ⚠️")
hideLoader()
}

/* ==============================
SAFE JSON PARSER
============================== */

async function safeJSON(res){

const text = await res.text()

try{
return JSON.parse(text)
}catch(e){
console.error("Invalid JSON:", text)
showToast("Server error ⚠️")
hideLoader()
return null
}

}

/* ==============================
SMART FETCH (RETRY)
============================== */

async function smartFetch(url, options={}, retries=2){

try{

const res = await fetch(url, options)

if(!res.ok && retries > 0){
await new Promise(r=>setTimeout(r,1000))
return smartFetch(url, options, retries-1)
}

return res

}catch(err){

if(retries > 0){
await new Promise(r=>setTimeout(r,1000))
return smartFetch(url, options, retries-1)
}

throw err

}

}

/* ==============================
OFFLINE DETECTION
============================== */

window.addEventListener("offline",()=>showToast("⚠️ No internet"))
window.addEventListener("online",()=>showToast("✅ Back online"))

/* ==============================
PAGE GUARD
============================== */

const page = window.location.pathname
const isLogin = page.endsWith("/") || page.includes("index.html")

if(!token && !isLogin){
window.location.href="index.html"
}

if(token && isLogin){
window.location.href="dashboard.html"
}

/* ==============================
SOUNDS
============================== */

const welcomeSound = new Audio("sounds/welcome.mp3")
const successSound = new Audio("sounds/success.mp3")

function playWelcome(){
welcomeSound.currentTime=0
welcomeSound.play().catch(()=>{})
}

function playSuccess(){
successSound.currentTime=0
successSound.play().catch(()=>{})
}

/* ==============================
LOADER
============================== */

function hideLoader(){
const loader=document.getElementById("splashLoader")
if(!loader) return

loader.classList.add("hide")

setTimeout(()=>{
loader.style.display="none"
},500)
}

/* NEVER STUCK AGAIN */
setTimeout(()=>hideLoader(),5000)

/* ==============================
TOAST
============================== */

function showToast(msg){
const t=document.createElement("div")
t.className="toast"
t.innerText=msg
document.body.appendChild(t)
setTimeout(()=>t.remove(),3000)
}

/* ==============================
NETWORK + PHONE
============================== */

const NETWORK_PREFIX={
MTN:["0803","0806","0813","0816","0703","0706","0903","0906","0913","0916"],
AIRTEL:["0802","0808","0812","0701","0708","0901","0902","0907"],
GLO:["0805","0807","0811","0705","0905"],
"9MOBILE":["0809","0817","0818","0908","0909"]
}

function normalizePhone(p){ return p.replace(/\D/g,"") }

function formatPhone(p){
p=normalizePhone(p)
if(p.startsWith("0")) return "+234"+p.slice(1)
if(p.startsWith("234")) return "+"+p
return p
}

function detectNetwork(p){
p=normalizePhone(p)
const prefix=p.substring(0,4)
for(const n in NETWORK_PREFIX){
if(NETWORK_PREFIX[n].includes(prefix)) return n
}
return null
}

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

let typingTimer=null

function handlePhoneInput(input){

let phone=normalizePhone(input.value)
if(phone.length>11) phone=phone.slice(0,11)

input.value=phone

clearTimeout(typingTimer)

typingTimer=setTimeout(()=>{

if(phone.length>=4){
const net=detectNetwork(phone)
showNetworkLogo(net)
if(net) loadPlans(net)
}

},400)

}

/* ==============================
SAVE CONTACT
============================== */

function saveRecipient(phone){
let list=JSON.parse(localStorage.getItem("recipients")||"[]")
if(!list.includes(phone)){
list.push(phone)
localStorage.setItem("recipients",JSON.stringify(list))
}
}

/* ==============================
LOGIN (FIXED)
============================== */

async function login(){

try{

const username=document.getElementById("loginUsername").value
const password=document.getElementById("loginPassword").value

const res=await smartFetch("${API}/api/login",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({username,password})
})

const data=await safeJSON(res)
if(!data) return

if(!res.ok){
alert(data.message || "Login failed")
return
}

localStorage.setItem("token",data.token)
window.location.replace("dashboard.html")

}catch{
showToast("Login failed ⚠️")
hideLoader()
}

}

/* ==============================
DASHBOARD
============================== */

async function loadDashboard(){

if(!token) return

try{

const res=await smartFetch("${API}/api/me",{
headers:{Authorization:"Bearer ${token}"}
})

const user=await safeJSON(res)
if(!user) return

const name=document.getElementById("usernameDisplay")
if(name){
name.innerText="Hello 👋 ${user.username}"
}

/* wallet */
animateBalance(Number(user.wallet_balance||0))

/* profit balance (ADMIN) */
if(user.is_admin){

const adminPanel=document.getElementById("adminPanel")
if(adminPanel) adminPanel.style.display="block"

const profit=document.getElementById("profitBalance")
if(profit){
profit.innerText="₦"+Number(user.profit_balance||0).toLocaleString()
}

}

loadTransactions()
playWelcome()

}catch{

showToast("Session expired")

localStorage.removeItem("token")

setTimeout(()=>{
window.location.replace("index.html")
},1500)

}

hideLoader()

}

if(page.includes("dashboard.html")){
window.addEventListener("load",loadDashboard)
}

/* ==============================
BALANCE
============================== */

function animateBalance(balance){

const el=document.getElementById("walletBalance")
if(!el) return

let start=0
const step=balance/40

const t=setInterval(()=>{

start+=step

if(start>=balance){
el.innerText="₦"+balance.toLocaleString()
clearInterval(t)
}else{
el.innerText="₦"+Math.floor(start).toLocaleString()
}

},30)

}

/* ==============================
LOAD PLANS
============================== */

async function loadPlans(network){

const container=document.getElementById("plans")
if(!container) return

try{

const res=await smartFetch("${API}/api/plans?network=${network}",{
headers:{Authorization:"Bearer ${token}"}
})

let plans=await safeJSON(res)
if(!Array.isArray(plans)) return

const unique=[...new Map(plans.map(p=>[p.plan_id,p])).values()]
unique.sort((a,b)=>a.price-b.price)

container.innerHTML=""

unique.forEach(p=>{
container.innerHTML+=`

<div class="planCard">
<h4>${p.plan_name}</h4>
<p>₦${Number(p.price).toLocaleString()}</p>
<button onclick="openPinModal(${p.plan_id},'data')">Buy</button>
</div>`
})}catch{
showToast("Failed to load plans")
}

}

/* ==============================
PURCHASE
============================== */

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

try{

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

const res=await smartFetch("${API}${endpoint}",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer ${token}"
},
body:JSON.stringify(body)
})

const data=await safeJSON(res)
if(!data) return

if(!res.ok){
alert(data.message)
return
}

playSuccess()
showToast("✅ Purchase Successful")

closePinModal()
saveRecipient(phone)

if(page.includes("dashboard")){
loadDashboard()
}

}catch{
showToast("Transaction failed ⚠️")
}

}

/* ==============================
LOGOUT
============================== */

function logout(){
localStorage.removeItem("token")
window.location.replace("index.html")
}