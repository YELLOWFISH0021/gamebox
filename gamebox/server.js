const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 内存数据库
const users = {}; // 账号密码
const userSet = new Set(); // 注册用户集合，用于统计人数
const posts = []; // 帖子列表，每条自带点赞数
const games = []; // 游戏列表，每条自带游玩次数

// 登录注册接口
app.post('/api/login', async (req,res)=>{
    const {username,password,action} = req.body
    if(action === "register"){
        if(users[username]) return res.json({success:false,msg:"用户名已存在！"})
        users[username] = {pwd:password}
        userSet.add(username)
        return res.json({success:true,msg:"注册成功"})
    }else if(action === "login"){
        if(!users[username] || users[username].pwd !== password){
            return res.json({success:false,msg:"账号或密码错误"})
        }
        return res.json({success:true})
    }
})

// 获取用户总数
app.get('/api/usercount',(req,res)=>{
    res.json({count: userSet.size})
})

// 发帖接口
app.post('/api/post',(req,res)=>{
    const {user,content} = req.body
    posts.unshift({
        user,
        content,
        time:new Date().toLocaleString(),
        likeCount: 0,
        likedUsers: []
    })
    res.json({success:true})
})

// 获取帖子列表
app.get('/api/posts',(req,res)=>{
    res.json(posts)
})

// 点赞接口（云端同步，防重复点赞）
app.post('/api/like',(req,res)=>{
    const {postId, username} = req.body
    const post = posts[postId]
    if(!post) return res.json({success:false,msg:"帖子不存在"})
    
    if(!post.likedUsers.includes(username)){
        post.likedUsers.push(username)
        post.likeCount++
    }
    res.json({success:true, likeCount: post.likeCount, liked: true})
})

// 上传游戏代码
app.post('/api/uploadgame',(req,res)=>{
    const {user,name,code} = req.body
    games.push({
        user,
        name,
        code,
        time:new Date().toLocaleString(),
        playCount: 0
    })
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

// 游玩次数+1
app.get('/api/playgame',(req,res)=>{
    const idx = Number(req.query.id)
    if(games[idx]){
        games[idx].playCount++
    }
    res.json({success:true})
})

const port = process.env.PORT || 3000;
app.listen(port,()=>{
    console.log(`服务启动，端口${port}`)
})
