const fs = require('fs');
const path = require('path');

// ===== CONFIG: Canza kawai kafin ka gina brand daban =====
const BRAND = {
  name: 'BNHABEEB Data Hub',
  appId: 'com.bnhabeeb.datahub',
  webDir: '.'  // <<<<<<<< CANZA WANNAN DAGA 'dist-app' ZUWA '.'
};

const srcDir = './';
const distDir = `./${BRAND.webDir}/`;

console.log(`🔨 Building ${BRAND.name}...`);

// ===== 1. Tace app.js - cire duk admin functions =====
let appCode = fs.readFileSync('app.js', 'utf8');

// Share daga ADMIN comment har ƙarshen file
appCode = appCode.replace(/\/\* ================= ADMIN:[\s\S]*$/, '');

// Share duk admin function calls da suka rage
const adminCalls = [
  'loadAdminTransactions', 'loadAdminUsers', 'loadAdminPlans',
  'setUserTier', 'forceDeductTransaction', 'reverseTransaction',
  'addPlan', 'togglePlan', 'editPlan', 'savePlanEdit'
];
adminCalls.forEach(fn => {
  appCode = appCode.replace(new RegExp(`${fn}\\([^)]*\\);?`, 'g'), '');
});

// Ƙara runtime guard a sama
const guard = `const IS_APP = window.Capacitor !== undefined;
if(IS_APP) {
  document.addEventListener('DOMContentLoaded', () => {
    ['transactionsManager', 'plansManager', 'usersManager', 
     'addPlanModal', 'editPlanModal'].forEach(id => {
      document.getElementById(id)?.remove();
    });
  });
  window.loadAdminTransactions = () => {};
  window.loadAdminUsers = () => {};
  window.loadAdminPlans = () => {};
  window.forceDeductTransaction = () => {};
  window.reverseTransaction = () => {};
  window.setUserTier = () => {};
  window.addPlan = () => {};
  window.togglePlan = () => {};
  window.editPlan = () => {};
  window.savePlanEdit = () => {};
}
`;
appCode = guard + '\n' + appCode;

// ===== 2. Tace index.html - cire duk admin sections =====
let htmlCode = fs.readFileSync('index.html', 'utf8');
htmlCode = htmlCode.replace(/<!-- ADMIN:[\s\S]*?<!-- ADD PLAN MODAL -->[\s\S]*?<\/div>\s*<\/div>/g, '');
htmlCode = htmlCode.replace(/<!-- EDIT PLAN MODAL -->[\s\S]*?<\/div>\s*<\/div>/g, '');

// ===== 3. Ƙirƙiri capacitor.config.ts ta atomatik =====
const capacitorConfig = `import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: '${BRAND.appId}',
  appName: '${BRAND.name}',
  webDir: '${BRAND.webDir}',
  bundledWebRuntime: false,
  plugins: {
    StatusBar: { style: 'DARK', backgroundColor: '#0f172a' }
  }
};
export default config;
`;

// ===== 4. Copy fayiloli zuwa dist-app =====
fs.rmSync(distDir, {recursive: true, force: true});
fs.mkdirSync(distDir, {recursive: true});

fs.readdirSync(srcDir).forEach(file => {
  if(file === 'app.js') {
    fs.writeFileSync(path.join(distDir, 'app.js'), appCode);
  } else if(file === 'index.html') {
    fs.writeFileSync(path.join(distDir, 'index.html'), htmlCode);
  } else if(file === 'capacitor.config.ts') {
    fs.writeFileSync(path.join(distDir, 'capacitor.config.ts'), capacitorConfig);
  } else if(!file.startsWith('.') && file !== 'node_modules' && file !== distDir.replace('./','').replace('/','') && file !== 'build-app.js') {
    const stat = fs.statSync(file);
    if(stat.isFile()) fs.copyFileSync(file, path.join(distDir, file));
  }
});

console.log(`✅ Success! ${BRAND.name} build ready in ${distDir}`);
console.log(`📦 Next: cd ${distDir} && npx cap init`);