const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 内存数据库，服务器重启全部清空
const users = {};
const posts = [];
const games = [];

// 登录注册接口
app.post('/api/login', async (req,res)=>{
    const {username,password,action} = req.body
    if(action === "register"){
        if(users[username]) return res.json({success:false,msg:"用户名已存在！"})
        users[username] = {pwd:password}
        return res.json({success:true,msg:"注册成功"})
    }else if(action === "login"){
        if(!users[username] || users[username].pwd !== password){
            return res.json({success:false,msg:"账号或密码错误"})
        }
        return res.json({success:true})
    }
})

// 发帖接口
app.post('/api/post',(req,res)=>{
    const {user,content} = req.body
    posts.unshift({user,content,time:new Date().toLocaleString()})
    res.json({success:true})
})

// 获取帖子列表
app.get('/api/posts',(req,res)=>{
    res.json(posts)
})

// 上传游戏代码
app.post('/api/uploadgame',(req,res)=>{
    const {user,name,code} = req.body
    games.push({user,name,code,time:new Date().toLocaleString()})
    res.json({success:true})
})

// 获取游戏列表
app.get('/api/games',(req,res)=>{
    res.json(games)
})

// 获取单个游戏代码
app.get('/api/getgame',(req,res)=>{
    const idx = Number(req.query.id)
    res.json(games[idx])
})

const port = process.env.PORT || 3000;
app.listen(port,()=>{
    console.log(`服务启动，端口${port}`)
})
