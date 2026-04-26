# ClearStrata 入口架构锁定文档（DOMAIN & ENTRY FLOW LOCK）

## 🎯 目的

本文件用于**锁定系统入口架构**，防止后续开发中出现：

* 多套扫码入口
* 多套登录流程
* 多套数据库逻辑
* 不同域名之间状态错乱
* 重复开发 / 功能打架

**所有涉及扫码 / 登录 / 入楼 / 审核 / 路由的修改，必须遵守本文件。**

---

## 🌐 一、域名分层（必须遵守）

### 当前（测试阶段）

```text
clearstrataaiserena.vercel.app
= 唯一真实业务入口（测试用）
```

⚠️ 测试阶段禁止混用：

```text
www.clearstrata.ai（暂不参与真实业务）
```

---

### 最终（上线结构）

```text
www.clearstrata.ai
= 官网 + Demo（只读）+ 销售转化

app.clearstrata.ai
= 唯一真实业务入口（登录 / 入楼 / 审核 / 后台）
```

---

## 🧠 二、核心原则（绝对规则）

### 规则 1：真实业务只有一套

```text
扫码 / 登录 / 入楼 / 审核 / 后台
只能有一套逻辑
```

---

### 规则 2：数据库只有一套

```text
Supabase 单实例
通过 property_id 做多物业隔离
```

---

### 规则 3：不允许多入口写入

```text
❌ www 不允许写入数据库
❌ demo 不允许写入数据库
✔ 只有 app / vercel.app 可以写入
```

---

### 规则 4：不允许新增第二套入楼函数

```text
❌ 禁止新增：
submit_join_request_v2
enter_property_v3
new_join_flow

✔ 统一使用：
submit_join_request
```

---

## 🚪 三、统一入口路由（必须固定）

```text
/entry           扫码入楼入口
/login           登录页
/join/pending    审核中
/join/rejected   审核失败
/                已入楼后的首页
/admin/*         后台管理
```

---

## 🔄 四、标准用户流程（唯一合法流程）

```text
1️⃣ 扫码
→ /entry?propertyId=xxx&inviteCode=xxx

2️⃣ 未登录
→ /login?redirect=/entry...

3️⃣ 登录后返回
→ /entry

4️⃣ 提交申请
→ submit_join_request

5️⃣ 判断结果：
   - 白名单 → auto_approved → 进入系统
   - 非白名单 → /join/pending

6️⃣ council 审核

7️⃣ 审核通过后
→ property_members.status = active

8️⃣ 用户再次进入系统
→ 自动进入该物业（无感）
```

---

## 🔐 五、权限与状态规则

### 未入楼用户

```text
❌ 不能访问首页
❌ 不能访问后台
✔ 只能在 /entry 或 /join/pending
```

---

### pending 用户

```text
访问 /
→ 自动跳转 /join/pending
```

---

### 已通过用户

```text
访问 /
→ 自动进入物业后台
```

---

## ⚠️ 六、禁止行为（非常重要）

```text
❌ 在 www.clearstrata.ai 写入数据库
❌ 新增第二套路由（/entry2 /join2 等）
❌ 使用多个域名混合业务流程
❌ 为 demo 单独做数据库
❌ 为不同物业创建不同数据库
❌ 在不同文件实现不同 join 流程
```

---

## 🧪 七、当前开发约束（Cursor 必须遵守）

```text
当前所有真实业务修改：
只能发生在 clearstrataaiserena.vercel.app 对应代码中

未来上线：
只替换域名为 app.clearstrata.ai
不重写逻辑
```

---

## 🧭 八、未来扩展（允许但必须遵守）

允许新增：

```text
/demo                Demo 页面（只读）
/pricing             定价
/contact-sales       联系销售
/admin/leads         平台管理
```

但：

```text
❌ 不允许影响真实业务入口
```

---

## 🧩 九、一句话原则（必须牢记）

```text
www = 看（只读）
app = 做（可写）
数据库 = 一套（property_id隔离）
```

---

## 🚨 十、执行规则

任何以下修改：

* 扫码
* 登录
* join request
* pending 页面
* 审核流程
* 首页 guard

必须先检查本文件，否则禁止提交。

---

## ✅ 状态

```text
当前阶段：测试阶段（vercel.app）
目标阶段：上线结构（app + www 分离）
```
