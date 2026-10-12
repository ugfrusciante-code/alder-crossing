const {app,BrowserWindow,session,Menu,protocol,net}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

protocol.registerSchemesAsPrivileged([{scheme:'alder',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.setName('Alder Crossing');
app.whenReady().then(()=>{
 const root=path.resolve(__dirname,'../dist');
 protocol.handle('alder',request=>{
  const url=new URL(request.url);
  const requested=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  const file=path.resolve(root,'.'+requested);
  if(url.host!=='game'||!file.startsWith(root+path.sep))return new Response('Not found',{status:404});
  return net.fetch(pathToFileURL(file).toString());
 });
 session.defaultSession.setPermissionRequestHandler((_web,_permission,done)=>done(false));
 session.defaultSession.setPermissionCheckHandler(()=>false);
 const win=new BrowserWindow({width:1440,height:900,minWidth:680,minHeight:560,title:'Cozy Village · Alder Crossing',backgroundColor:'#25322b',show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('alder://game/'))event.preventDefault()});
 win.once('ready-to-show',()=>win.show());
 win.loadURL('alder://game/');
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Alder Crossing',submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'unhide'},{type:'separator'},{role:'quit'}]},{label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'Window',submenu:[{role:'minimize'},{role:'togglefullscreen'}]}]));
});
app.on('window-all-closed',()=>app.quit());
