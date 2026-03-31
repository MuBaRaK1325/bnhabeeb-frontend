/* ==============================
   MAYCONNECT LOGIN SCRIPT
================================ */

const API = "https://mayconnect-backend-1.onrender.com";

/* INPUTS */

const usernameInput = document.getElementById("loginUsername");
const passwordInput = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const loader = document.getElementById("loginLoader");

/* SOUND */

const welcomeSound = new Audio("welcome.mp3");

/* ================= AUTO LOGIN ================= */

document.addEventListener("DOMContentLoaded", () => {

const token = localStorage.getItem("token");

if (token) {
window.location.href = "dashboard.html";
}

});

/* ================= PASSWORD TOGGLE ================= */

function togglePassword(){

if(!passwordInput) return;

passwordInput.type =
passwordInput.type === "password" ? "text" : "password";

}

/* ================= LOGIN ================= */

if(loginBtn){

loginBtn.addEventListener("click",login);

}

async function login(){

const username = usernameInput.value.trim();
const password = passwordInput.value.trim();

if(!username || !password){

alert("Enter username and password");
return;

}

loginBtn.disabled = true;
loader.style.display = "flex";

try{

const res = await fetch(API + "/api/login",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
username,
password
})

});

const data = await res.json();

if(!res.ok){

throw new Error(data.message || "Login failed");

}

/* SAVE TOKEN */

localStorage.setItem("token",data.token);
localStorage.setItem("username",data.username);

/* ADMIN DETECTION */

if(data.is_admin){

alert("Welcome Admin");

}

/* PLAY LOGIN SOUND */

welcomeSound.play().catch(()=>{});

/* REDIRECT */

setTimeout(()=>{

window.location.href="dashboard.html";

},600);

}catch(err){

alert(err.message || "Server connection failed");

loginBtn.disabled=false;
loader.style.display="none";

}

}

/* ================= BIOMETRIC LOGIN ================= */

async function biometricLogin(){

const biometricEnabled = localStorage.getItem("biometric");
const token = localStorage.getItem("token");

if(biometricEnabled!=="true"){

alert("Enable biometric inside dashboard first");
return;

}

if(!token){

alert("Login normally first before using biometric");
return;

}

if(!window.PublicKeyCredential){

alert("Biometric not supported on this device");
return;

}

try{

const challenge = new Uint8Array(32);
crypto.getRandomValues(challenge);

await navigator.credentials.get({

publicKey:{
challenge,
timeout:60000,
userVerification:"preferred"
}

});

loader.style.display="flex";

setTimeout(()=>{

window.location.href="dashboard.html";

},500);

}catch{

alert("Biometric verification failed");

}

}