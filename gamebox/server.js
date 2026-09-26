const express = require('express');
const path = require('path');
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ========== 数据库 ==========
const users = {}; // 账号密码
const userSet = new Set(); // 注册用户集合
const posts = []; // 帖子列表
const games = []; // 游戏列表

// 好友系统
const friendRequests = []; // 好友请求 {id, from, to, time, status}
const userFriends = {}; // 用户好友列表 {user: [friend1, friend2...]}
const chatMessages = {}; // 聊天记录 {user1_user2: [msg1, msg2...]}

// ========== 登录注册 ==========
app.post('/api/login', async (req,res)=>{
    const {username,password,action} = req.body
    if(action === "register"){
        if(users[username]) return res.json({success:false,msg:"用户名已存在！"})
        users[username] = {pwd:password}
        userSet.add(username)
        userFriends[username] = []
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

// 搜索用户
app.get('/api/searchuser', (req, res) => {
    const keyword = req.query.keyword.toLowerCase().trim();
    if(!keyword) return res.json([]);
    const list = [...userSet].filter(u => 
        u.toLowerCase().includes(keyword)
    ).slice(0, 10);
    res.json(list);
})

// ========== 好友系统 ==========
// 发送好友请求
app.post('/api/friend/request', (req, res) => {
    const { from, to } = req.body;
    if(!userSet.has(to)) return res.json({success:false, msg:"用户不存在"});
    if(from === to) return res.json({success:false, msg:"不能添加自己"});
    if(userFriends[from]?.includes(to)) return res.json({success:false, msg:"已经是好友了"});
    
    const exist = friendRequests.find(r => r.from === from && r.to === to && r.status === 'pending');
    if(exist) return res.json({success:false, msg:"已发送过申请"});

    friendRequests.push({
        id: Date.now(),
        from, to,
        time: new Date().toLocaleString(),
        status: 'pending'
    });
    res.json({success:true});
})

// 获取收到的好友请求
app.get('/api/friend/requests', (req, res) => {
    const username = req.query.username;
    const list = friendRequests.filter(r => r.to === username && r.status === 'pending');
    res.json(list);
})

// 处理好友请求
app.post('/api/friend/handle', (req, res) => {
    const { id, accept, username } = req.body;
    const request = friendRequests.find(r => r.id === id);
    if(!request) return res.json({success:false, msg:"请求不存在"});
    
    request.status = accept ? 'accepted' : 'rejected';
    
    if(accept){
        if(!userFriends[request.from]) userFriends[request.from] = [];
        if(!userFriends[request.to]) userFriends[request.to] = [];
        if(!userFriends[request.from].includes(request.to)){
            userFriends[request.from].push(request.to);
        }
        if(!userFriends[request.to].includes(request.from)){
            userFriends[request.to].push(request.from);
        }
    }
    res.json({success:true});
})

// 获取好友列表
app.get('/api/friend/list', (req, res) => {
    const username = req.query.username;
    res.json(userFriends[username] || []);
})

// ========== 聊天系统 ==========
function getChatKey(a, b){
    return [a, b].sort().join('_');
}

// 发送消息
app.post('/api/chat/send', (req, res) => {
    const { from, to, type, content } = req.body;
    const key = getChatKey(from, to);
    if(!chatMessages[key]) chatMessages[key] = [];
    
    chatMessages[key].push({
        id: Date.now(),
        from, to, type, content,
        time: new Date().toLocaleString()
    });
    res.json({success:true});
})

// 获取聊天记录
app.get('/api/chat/history', (req, res) => {
    const { user, friend } = req.query;
    const key = getChatKey(user, friend);
    res.json(chatMessages[key] || []);
})

// ========== 帖子系统 ==========
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

app.get('/api/posts',(req,res)=>{
    res.json(posts)
})

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

// ========== 游戏系统 ==========
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

app.get('/api/games',(req,res)=>{
    res.json(games)
})

app.get('/api/getgame',(req,res)=>{
    const idx = Number(req.query.id)
    res.json(games[idx])
})

app.get('/api/playgame',(req,res)=>{
    const idx = Number(req.query.id)
    if(games[idx]){
        games[idx].playCount++
    }
    res.json({success:true})
})

// 删除游戏
app.delete('/api/game/:id', (req, res) => {
    const idx = Number(req.params.id);
    if (idx < 0 || idx >= games.length) {
        return res.json({ success: false, msg: "游戏不存在" });
    }
    games.splice(idx, 1);
    res.json({ success: true });
})

const port = process.env.PORT || 3000;
app.listen(port,()=>{
    console.log(`服务启动，端口${port}`)
})
