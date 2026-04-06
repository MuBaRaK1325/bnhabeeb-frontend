const API="https://mayconnect-backend-1.onrender.com"

const welcomeSound=new Audio("sounds/welcome.mp3")
const successSound=new Audio("sounds/success.mp3")

let cachedPlans=[]
let currentBalance=0
let currentUser=null
let ws=null
let hasPlayedWelcome=false

/* ================= HELPERS ================= */

function getToken(){
return localStorage.getItem("token")
}

function el(id){
return document.getElementById(id)
}

function showToast(msg){
const t=document.createElement("div")
t.innerText=msg

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
})

document.body.appendChild(t)
setTimeout(()=>t.remove(),3000)
}

/* ================= AUTH ================= */

function checkAuth(){
const token=getToken()
if(!token){
window.location.replace("login.html")
return false
}
return true
}

/* ================= DASHBOARD ================= */

function loadDashboard(){

if(!checkAuth()) return

let payload

try{
payload = JSON.parse(atob(getToken().split(".")[1]))
}catch{
logout()
return
}

currentUser = payload
document.body.style.display="block"

/* USER */
if(el("usernameDisplay")){
el("usernameDisplay").innerText="Hello "+payload.username
}

/* ADMIN */
if(payload.is_admin){
if(el("admin")) el("admin").style.display="block"
}

/* LOAD */
fetchTransactions()
loadPlans()
loadAdminProfit()

setTimeout(connectWebSocket,1000)

/* SOUND */
if(!hasPlayedWelcome){
welcomeSound.play().catch(()=>{})
hasPlayedWelcome=true
}

/* PUSH */
initPush()

}

/* ================= PUSH ================= */

async function initPush(){
if(!("Notification" in window)) return

if(Notification.permission !== "granted"){
await Notification.requestPermission()
}
}

function pushNotify(title,body){
if(Notification.permission==="granted"){
new Notification(title,{body})
}
}

/* ================= WALLET ================= */

function animateWallet(balance){
currentBalance=Number(balance||0)
if(el("walletBalance")){
el("walletBalance").innerText="₦"+currentBalance.toLocaleString()
}
}

/* ================= TRANSACTIONS ================= */

async function fetchTransactions(){

try{

const res=await fetch(API+"/api/transactions",{
headers:{Authorization:"Bearer "+getToken()}
})

const tx=await res.json()

if(tx.length){
animateWallet(tx[0].wallet_balance)
pushNotify("Wallet Updated","Balance: ₦"+tx[0].wallet_balance)
}

const home=el("transactionHistory")
const all=el("allTransactions")

if(home){
home.innerHTML=""
tx.slice(0,5).forEach(t=>home.appendChild(txCard(t)))
}

if(all){
all.innerHTML=""
tx.forEach(t=>all.appendChild(txCard(t)))
}

}catch{}
}

function txCard(t){
const div=document.createElement("div")
div.className="transactionCard"

div.innerHTML=`
<strong>${t.type}</strong> ₦${t.amount}<br>
${t.phone||""}<br>
<span>${t.status}</span>
`
return div
}

/* ================= PLANS ================= */

async function loadPlans(){

const res=await fetch(API+"/api/plans",{
headers:{Authorization:"Bearer "+getToken()}
})

const plans=await res.json()

cachedPlans=plans
updatePlans()
}

function updatePlans(){

const network=el("networkSelect")?.value
const select=el("planSelect")

if(!select) return

select.innerHTML=""

cachedPlans
.filter(p=>!network || p.network===network)
.forEach(plan=>{
const opt=document.createElement("option")
opt.value=plan.id
opt.textContent=`${plan.name} (${plan.validity}) - ₦${plan.price}`
select.appendChild(opt)
})

}

/* ================= NETWORK DETECT ================= */

function detectNetwork(phone){

if(!phone) return

let logo=""

if(/^0803|0703|0903/.test(phone)) logo="MTN.png"
if(/^0805|0705|0905/.test(phone)) logo="Glo.png"
if(/^0802|0702|0902/.test(phone)) logo="Airtel.png"

if(el("networkLogo")){
el("networkLogo").src="images/"+logo
}

}

/* ================= BUY DATA ================= */

async function buyData(pin){

const phone=el("dataPhone").value
const planId=el("planSelect").value

if(!phone || !planId){
showToast("Fill all fields")
return
}

const res=await fetch(API+"/api/buy-data",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({phone,plan_id:planId,pin})
})

const data=await res.json()

if(res.ok){
successSound.play()
showToast("Data Sent")
fetchTransactions()
}else{
showToast(data.message)
}

}

/* ================= BUY AIRTIME ================= */

async function buyAirtime(pin){

const phone=el("airtimePhone").value
const amount=el("airtimeAmount").value

const res=await fetch(API+"/api/buy-airtime",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({phone,amount,pin})
})

const data=await res.json()

if(res.ok){
successSound.play()
showToast("Airtime Sent")
fetchTransactions()
}else{
showToast(data.message)
}

}

/* ================= 🔥 BIOMETRIC FIX ================= */

async function confirmBiometric(){

if(localStorage.getItem("biometric")!=="true"){
showToast("Enable biometric first")
return
}

try{
await navigator.credentials.get({
publicKey:{
challenge:new Uint8Array(32),
timeout:60000
}
})
}catch{}

/* CONTINUE */
if(purchaseType==="data") buyData("biometric")
if(purchaseType==="airtime") buyAirtime("biometric")

}

/* ================= ADMIN ================= */

async function loadAdminProfit(){

try{
const res=await fetch(API+"/api/admin/profits",{
headers:{Authorization:"Bearer "+getToken()}
})

if(!res.ok) return

const data=await res.json()
if(el("adminTotalProfit")){
el("adminTotalProfit").innerText="₦"+data.total_profit
}
}catch{}
}

/* ================= PROFILE ================= */

async function changePassword(){

const oldPass=prompt("Old password")
const newPass=prompt("New password")

if(!oldPass || !newPass) return

const res=await fetch(API+"/api/change-password",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({oldPass,newPass})
})

const data=await res.json()
showToast(data.message)
}

async function changePin(){

const oldPin=prompt("Old PIN")
const newPin=prompt("New PIN")

if(!oldPin || !newPin) return

const res=await fetch(API+"/api/change-pin",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({oldPin,newPin})
})

const data=await res.json()
showToast(data.message)
}

/* ================= WS ================= */

function connectWebSocket(){

const wsURL=API.replace("https","wss")
ws=new WebSocket(wsURL+"?token="+getToken())

ws.onmessage=(msg)=>{
const data=JSON.parse(msg.data)

if(data.type==="wallet_update"){
animateWallet(data.balance)
pushNotify("Wallet Update","₦"+data.balance)
}
}

}

/* ================= 🔥 LOGOUT FIX ================= */

function logout(){
try{ if(ws) ws.close() }catch{}
localStorage.clear()
window.location.href="login.html"
}

/* ================= START ================= */

document.addEventListener("DOMContentLoaded",()=>{

loadDashboard()

if(el("networkSelect")){
el("networkSelect").addEventListener("change",updatePlans)
}

if(el("dataPhone")){
el("dataPhone").addEventListener("input",(e)=>detectNetwork(e.target.value))
}

})