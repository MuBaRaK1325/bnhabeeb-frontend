const API="https://mayconnect-backend-1.onrender.com"
const token=localStorage.getItem("token")

/* GLOBAL ERROR */

window.onerror=function(){
showToast("Something went wrong ⚠️")
hideLoader()
return true
}

window.onunhandledrejection=function(){
showToast("Network issue ⚠️")
hideLoader()
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

document.body.appendChild(t)

setTimeout(()=>t.remove(),3000)

}

/* SPLASH */

function hideLoader(){

const loader=document.getElementById("splashLoader")

if(!loader) return

loader.classList.add("hide")

setTimeout(()=>{
loader.remove()
},500)

}

/* FIX STUCK SPLASH */

window.addEventListener("load",()=>{

setTimeout(()=>{
hideLoader()
},800)

})

/* SMART FETCH */

async function smartFetch(url,options={}){

const res=await fetch(url,options)

return res

}

/* LOGIN */

async function login(){

const username=document.getElementById("loginUsername").value
const password=document.getElementById("loginPassword").value

const res=await fetch(`${API}/api/login`,{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({username,password})

})

const data=await res.json()

if(!res.ok){

alert(data.message)

return

}

localStorage.setItem("token",data.token)

window.location="dashboard.html"

}

/* DASHBOARD */

async function loadDashboard(){

try{

const res=await fetch(`${API}/api/me`,{

headers:{
Authorization:`Bearer ${token}`
}

})

const user=await res.json()

document.getElementById("usernameDisplay").innerText=`Hello 👋 ${user.username}`

animateBalance(user.wallet_balance||0)

if(user.is_admin){

document.getElementById("adminPanel").style.display="block"

document.getElementById("profitBalance").innerText="₦"+user.profit_balance

}

if(!user.has_pin){

openSetPinModal()

}else{

document.getElementById("pinBtn").innerText="Change Transaction PIN"

}

}catch{

localStorage.removeItem("token")

window.location="login.html"

}

}

/* LOAD DASHBOARD */

if(window.location.pathname.includes("dashboard")){

window.addEventListener("load",loadDashboard)

}

/* BALANCE */

function animateBalance(balance){

const el=document.getElementById("walletBalance")

let start=0

const step=balance/40

const t=setInterval(()=>{

start+=step

if(start>=balance){

el.innerText="₦"+balance

clearInterval(t)

}else{

el.innerText="₦"+Math.floor(start)

}

},30)

}

/* PIN */

function openSetPinModal(){

document.getElementById("setPinModal").style.display="flex"

}

async function savePin(){

const pin=document.getElementById("newPin").value

await fetch(`${API}/api/set-pin`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},

body:JSON.stringify({pin})

})

showToast("PIN Saved")

document.getElementById("setPinModal").style.display="none"

}

/* CHANGE PASSWORD */

function openChangePasswordModal(){

document.getElementById("passwordModal").style.display="flex"

}

async function changePassword(){

const oldPassword=document.getElementById("oldPassword").value
const newPassword=document.getElementById("newPassword").value

const res=await fetch(`${API}/api/change-password`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},

body:JSON.stringify({oldPassword,newPassword})

})

const data=await res.json()

showToast(data.message)

document.getElementById("passwordModal").style.display="none"

}

/* BIOMETRIC */

function toggleBiometric(){

localStorage.setItem("biometric","enabled")

showToast("Biometric login enabled")

}

/* LOGOUT */

function logout(){

localStorage.removeItem("token")

window.location="login.html"

}