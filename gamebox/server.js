// 账号数据库
const users = {};
const userSet = new Set(); // 专门统计注册用户总数

// 注册接口
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ ok: false, msg: "用户名密码不能为空" });
    if (users[username]) return res.json({ ok: false, msg: "用户名已存在" });
    
    users[username] = { password };
    userSet.add(username); // 注册成功自动加入统计
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

// 用户总数统计接口
app.get('/api/usercount', (req, res) => {
    res.json({ count: userSet.size });
});

