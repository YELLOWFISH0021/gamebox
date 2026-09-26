const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const app = express(); // 这里定义app！之前漏了
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static('public'));

const users = {};
const userSet = new Set(); // 用户统计

// 注册接口
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ ok: false, msg: "用户名密码不能为空" });
    if (users[username]) return res.json({ ok: false, msg: "用户名已存在" });
    
    users[username] = { password };
    userSet.add(username);
    res.json({ ok: true, msg: "注册成功" });
});

// 登录接口
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!users[username] || users[username].password !== password) {
        return res.json({ ok: false, msg: "用户名或密码不正确" });
    }
    res.json({ ok: true });
});

// 用户总数接口
app.get('/api/usercount', (req, res) => {
    res.json({ count: userSet.size });
});

// WebSocket
wss.on('connection', (ws)=>{
  ws.on('message', (data)=>{
    wss.clients.forEach(client=>{
      if(client.readyState === WebSocket.OPEN) client.send(data);
    })
  })
})

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>{
  console.log(`服务启动，端口：${PORT}`);
})
