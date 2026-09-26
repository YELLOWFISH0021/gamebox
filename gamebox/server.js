const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 简易本地文件存储（Render重启会清空，演示够用，给同学看没问题）
const dbPath = './db.json';
if(!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({users:[], posts:[], games:[]}));

function readDB(){return JSON.parse(fs.readFileSync(dbPath))}
function saveDB(data){fs.writeFileSync(dbPath, JSON.stringify(data))}

//注册
app.post('/api/register',(req,res)=>{
  const {username,password}=req.body;
  const db=readDB();
  if(db.users.find(u=>u.username===username)) return res.json({ok:false,msg:"用户名已存在"});
  db.users.push({username,password});
  saveDB(db);
  res.json({ok:true});
})
//发帖
app.post('/api/post',(req,res)=>{
  const {username,content}=req.body;
  const db=readDB();
  db.posts.push({username,content,time:new Date().toLocaleString()});
  saveDB(db);
  res.json({ok:true});
})
//获取帖子
app.get('/api/posts',(req,res)=>{
  const db=readDB();
  res.json(db.posts);
})
//上传游戏html
app.post('/api/uploadgame',(req,res)=>{
  const {name,code,author}=req.body;
  const db=readDB();
  db.games.push({name,code,author,id:Date.now()});
  saveDB(db);
  res.json({ok:true});
})
//获取游戏列表
app.get('/api/games',(req,res)=>{
  const db=readDB();
  res.json(db.games);
})
//读取单个游戏
app.get('/api/game/:id',(req,res)=>{
  const db=readDB();
  const g=db.games.find(x=>x.id==req.params.id);
  res.json(g||null);
})

app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'public/index.html')));
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
