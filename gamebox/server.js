const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const app = express();
const server = http.createServer(app);

app.use(express.json({limit: '10mb'}));
app.use(express.static(path.join(__dirname, 'public')));

// ========== 账号好友、私聊内存存储 ==========
const users = {}; // {用户名:{password, friends:[], applyList:[], pendingApply:[]}}
const privateChat = {}; // 私聊记录 key:userA|userB

// 注册登录接口
app.post('/api/register', (req, res)=>{
  const {username, password} = req.body;
  if(!username || !password) return res.json({ok:false,msg:"账号密码不能为空"});
  if(users[username]) return res.json({ok:false,msg:"用户已存在"});
  users[username] = {password, friends:[], applyList:[], pendingApply:[]};
  res.json({ok:true});
})
app.post('/api/login', (req, res)=>{
  const {username, password} = req.body;
  if(!users[username] || users[username].password !== password) return res.json({ok:false,msg:"账号或密码错误"});
  res.json({ok:true, username});
})

// 搜索用户
app.get('/api/searchUser', (req,res)=>{
  const q = req.query.q;
  const found = Object.keys(users).filter(n=>n.includes(q));
  res.json({list:found});
})

// 发送好友申请
app.post('/api/sendApply', (req,res)=>{
  const {from, to} = req.body;
  if(!users[to]) return res.json({ok:false,msg:"用户不存在"});
  if(users[from].friends.includes(to)) return res.json({ok:false,msg:"已经是好友"});
  if(users[to].applyList.includes(from)) return res.json({ok:false,msg:"申请已发送"});
  users[to].applyList.push(from);
  users[from].pendingApply.push(to);
  res.json({ok:true});
})

// 获取好友申请列表
app.get('/api/getApply', (req,res)=>{
  const name = req.query.user;
  res.json({list:users[name].applyList});
})

// 处理好友申请
app.post('/api/handleApply', (req,res)=>{
  const {me, other, accept} = req.body;
  if(accept){
    users[me].friends.push(other);
    users[other].friends.push(me);
  }
  users[me].applyList = users[me].applyList.filter(x=>x!==other);
  users[other].pendingApply = users[other].pendingApply.filter(x=>x!==me);
  res.json({ok:true});
})

// 获取好友列表
app.get('/api/getFriends', (req,res)=>{
  const name = req.query.user;
  res.json({list:users[name].friends});
})

// 私聊保存
app.post('/api/sendPrivateMsg', (req,res)=>{
  const {from,to,msgType,content} = req.body;
  const key = [from,to].sort().join("|");
  if(!privateChat[key]) privateChat[key] = [];
  privateChat[key].push({from,to,msgType,content,time:Date.now()});
  res.json({ok:true});
})
app.get('/api/getPrivateMsg', (req,res)=>{
  const {u1,u2} = req.query;
  const key = [u1,u2].sort().join("|");
  res.json({list:privateChat[key]||[]});
})

// ========== 沙盒联机WebSocket ==========
const wss = new WebSocket.Server({ noServer: true });
const rooms = {};

server.on('upgrade', (request, socket, head) => {
  const params = new URLSearchParams(request.url.slice(1));
  const roomId = params.get('room');
  const userName = params.get('name');
  if(!roomId || !userName){ socket.destroy(); return; }
  wss.handleUpgrade(request, socket, head, (ws)=>{
    wss.emit('connection', ws, request, {roomId, userName});
  })
})

function broadcastRoom(room, data){
  Object.values(room.players).forEach(p=>{
    if(p.ws && p.ws.readyState === WebSocket.OPEN){
      p.ws.send(JSON.stringify(data));
    }
  })
}

wss.on('connection', (ws, req, info)=>{
  const {roomId, userName} = info;
  const pid = Date.now().toString(36);
  if(!rooms[roomId]){
    rooms[roomId] = {players:{}, worldSeed: roomId.charCodeAt(0)+roomId.charCodeAt(1)};
  }
  const room = rooms[roomId];
  room.players[pid] = {name:userName, x:20, y:10, ws};

  broadcastRoom(room, {
    type:"players",
    list: Object.fromEntries(Object.entries(room.players).map(([k,v])=>[k,{name:v.name,x:v.x,y:v.y}]))
  })

  ws.on('message', raw=>{
    let d;
    try{d=JSON.parse(raw)}catch(e){return}
    switch(d.type){
      case "move":
        room.players[pid].x = d.x;
        room.players[pid].y = d.y;
        broadcastRoom(room, {type:"move", id:pid, x:d.x, y:d.y});
        break;
      case "block":
        broadcastRoom(room, {type:"block", x:d.x, y:d.y, tile:d.tile});
        break;
      case "chat":
        broadcastRoom(room, {type:"chat", name:userName, content:d.content});
        break;
    }
  })
  ws.on('close', ()=>{
    delete room.players[pid];
    broadcastRoom(room, {type:"leave", id:pid});
    if(Object.keys(room.players).length===0) delete rooms[roomId];
  })
})

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>{
  console.log(`服务器启动在端口${PORT}`);
})
