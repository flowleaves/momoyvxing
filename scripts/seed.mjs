/**
 * 造测试数据
 *
 * 走 HTTP API 而不是直接写库 —— 这样 seed 跑通本身就等于端到端验证了接口。
 * 只有「把 created_at 错开」这一步必须直接改库（API 不该暴露这个能力）。
 *
 * 用法：先 npm run dev，另开一个终端 npm run db:seed
 */

import Database from "better-sqlite3";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const DB_PATH = process.env.DIARY_DB_PATH || "data/diary.db";

async function call(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  const setCookie = res.headers.getSetCookie?.() ?? [];
  return { status: res.status, data, setCookie };
}

function sessionCookie(setCookie) {
  const raw = setCookie.find((c) => c.startsWith("momo_session="));
  return raw ? raw.split(";")[0] : null;
}

/** 注册；已存在则登录 */
async function ensureUser(email, password, nickname, inviteCode = "momo") {
  const reg = await call("/api/auth/register", {
    method: "POST",
    body: { email, password, nickname, inviteCode },
  });

  if (reg.status === 200 && reg.data?.ok) {
    console.log(`  注册成功: ${nickname} <${email}>`);
    return { cookie: sessionCookie(reg.setCookie), id: reg.data.userId };
  }

  const login = await call("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (login.status === 200 && login.data?.ok) {
    console.log(`  已存在，直接登录: ${nickname}`);
    return { cookie: sessionCookie(login.setCookie), id: login.data.userId };
  }

  throw new Error(`无法创建用户 ${email}: ${JSON.stringify(reg.data)} ${JSON.stringify(login.data)}`);
}

const ENTRIES = [
  { text: "早上出门看到一只橘猫蹲在共享单车上，它看了我一眼，我也看了它一眼，然后它跳下来走了。我们大概算是认识了。", mood: "happy", tags: ["猫", "日常"] },
  { text: "楼下新开的面包店，可颂烤得特别好。老板说七点半出炉，我决定明天早起。\n\n（结果大概率起不来）", mood: "excited", tags: ["吃", "日常"] },
  { text: "忽然下雨，没带伞。索性不跑了，慢慢走回家。\n\n淋湿了，但心情意外地不错。", mood: "calm", tags: ["天气"] },
  { text: "今天开会开了三个小时，脑子已经是一团浆糊。\n\n晚上只想瘫着。", mood: "tired", tags: ["工作"] },
  { text: "翻到去年今天写的东西，那时候在为一件现在完全想不起来的事焦虑。\n\n感觉有点好笑，也有点温柔。", mood: "calm", tags: ["心情"] },
  { text: "试着煮了一次溏心蛋，第七个终于成功了。\n\n前六个的下场就不细说了。", mood: "happy", tags: ["吃", "日常"] },
  { text: "有人夸我今天的衣服好看。\n\n开心了一整个下午，虽然只是一句话。", mood: "happy", tags: ["日常"] },
  { text: "晚上散步，风很凉。路灯下自己的影子被拉得很长。\n\n突然觉得这样也挺好的。", mood: "calm", tags: ["心情"] },
  { text: "把拖了两个月的事情终于做完了。\n\n虽然过程很狼狈，但结果还行。", mood: "excited", tags: ["工作"] },
  { text: "有点难过，但说不上来为什么。\n\n就写下来吧，写下来好像就轻一点。", mood: "sad", tags: ["心情"] },
  { text: "买了一盆薄荷，放在窗台上。\n\n希望能活过这个月。", mood: "happy", tags: ["日常"] },
  { text: "地铁上旁边的小孩一直在看我的手机屏幕。\n\n于是我假装在看很重要的东西。", mood: "calm", tags: ["日常"] },
  { text: "今天什么都没做成，但也还好。\n\n不是每一天都要有意义的。", mood: "calm", tags: ["心情"] },
  { text: "半夜饿了，煮了碗面，加了个蛋。\n\n凌晨两点的面总是特别好吃。", mood: "happy", tags: ["吃"] },
  { text: "整理房间，翻出一堆没用的东西，但一个都舍不得扔。\n\n最后只是把它们换了个地方放。", mood: "tired", tags: ["日常"] },
  { text: "太阳很好，把被子晒了。\n\n晚上睡觉的时候会有一股太阳的味道。", mood: "happy", tags: ["日常"] },
  { text: "今天被一件小事气到了，现在想想其实也不值得。", mood: "angry", tags: ["心情"] },
  { text: "听到一首很久没听的歌，忽然回到某个夏天的下午。\n\n记忆这个东西真奇怪。", mood: "calm", tags: ["心情"] },
];

async function main() {
  console.log("检查服务器…");
  const ping = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ping@ping.ping", password: "x" }),
  }).catch(() => null);
  if (!ping) {
    console.error(`连不上 ${BASE}，先跑 npm run dev`);
    process.exit(1);
  }

  console.log("创建用户…");
  const momo = await ensureUser("momo@test.com", "test123456", "默默");
  const xing = await ensureUser("xing@test.com", "test123456", "杏");

  console.log("互相关注…");
  await call("/api/friends", { method: "POST", body: { action: "follow", userId: xing.id }, cookie: momo.cookie });
  await call("/api/friends", { method: "POST", body: { action: "follow", userId: momo.id }, cookie: xing.cookie });

  console.log("写日记…");
  const createdIds = [];

  for (let i = 0; i < ENTRIES.length; i++) {
    const e = ENTRIES[i];
    const isMomo = i % 3 !== 2;
    const owner = isMomo ? momo : xing;

    // 每 5 条里有 1 条设为「仅自己」，1 条设为「仅好友」，其余公开
    const visibility = i % 5 === 3 ? 1 : i % 5 === 4 ? 2 : 0;

    const res = await call("/api/diaries", {
      method: "POST",
      cookie: owner.cookie,
      body: { contentMd: e.text, mood: e.mood, visibility, tags: e.tags },
    });

    if (res.status === 201) {
      createdIds.push({ id: res.data.diary.id, index: i, owner: isMomo ? "默默" : "杏" });
    } else {
      console.warn(`  第 ${i + 1} 条失败:`, JSON.stringify(res.data));
    }
  }

  console.log(`  写入 ${createdIds.length} 条`);

  // 把时间错开，让时间轴看起来像真的（最近 10 天）
  console.log("调整时间分布…");
  const db = new Database(DB_PATH);
  const nowMs = Date.now();
  createdIds.forEach((item, idx) => {
    const hoursAgo = idx * 13 + (idx % 3) * 2;
    const ts = new Date(nowMs - hoursAgo * 3600 * 1000).toISOString();
    db.prepare("UPDATE diaries SET created_at = ?, updated_at = ? WHERE id = ?").run(ts, ts, item.id);
  });

  const summary = db
    .prepare(
      `SELECT u.nickname, COUNT(d.id) AS n
         FROM users u LEFT JOIN diaries d ON d.user_id = u.id AND d.deleted_at IS NULL
        GROUP BY u.id ORDER BY u.id`,
    )
    .all();
  db.close();

  console.log("\n完成。当前数据：");
  for (const s of summary) console.log(`  ${s.nickname}: ${s.n} 篇`);
  console.log("\n登录用：momo@test.com / test123456   或   xing@test.com / test123456");
}

main().catch((err) => {
  console.error("seed 失败:", err);
  process.exit(1);
});
