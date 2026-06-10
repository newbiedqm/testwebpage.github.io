(function () {
  "use strict";

  const MAX_DAYS = 30;
  const SAVE_KEY = "goosegooseduck.save.v1";
  const LAYOUT_KEY = "goosegooseduck.layout.v1";
  const PHASES = ["早市", "夜摊", "深夜"];
  const PHASE_TAGS = ["进货与备料", "出摊与排队", "群聊与发酵"];
  const CHOICE_COLORS = ["#ffe66d", "#7bed9f", "#70d6ff", "#ff9ff3"];

  const STAT_META = {
    cash: { label: "现金", group: "visible", min: -60, max: 220, unit: "¥" },
    trust: { label: "信任", group: "visible", min: 0, max: 100 },
    compliance: { label: "合规", group: "visible", min: 0, max: 100 },
    traffic: { label: "流量", group: "visible", min: 0, max: 100 },
    stamina: { label: "体力", group: "visible", min: 0, max: 100 },
    nameRealityGap: { label: "名实差", group: "hidden", min: 0, max: 100 },
    studentFilter: { label: "学生滤镜", group: "hidden", min: 0, max: 100 },
    capitalization: { label: "资本化", group: "hidden", min: 0, max: 100 },
    absurdity: { label: "荒诞度", group: "hidden", min: 0, max: 100 }
  };

  const INITIAL_STATS = {
    cash: 70,
    trust: 54,
    compliance: 44,
    traffic: 24,
    stamina: 76,
    nameRealityGap: 0,
    studentFilter: 36,
    capitalization: 8,
    absurdity: 6
  };

  const dom = {
    body: document.body,
    newGameBtn: document.getElementById("new-game-btn"),
    continueBtn: document.getElementById("continue-btn"),
    layoutButtons: Array.from(document.querySelectorAll(".layout-option")),
    resetBtn: document.getElementById("reset-btn"),
    saveBtn: document.getElementById("save-btn"),
    helpBtn: document.getElementById("help-btn"),
    closeHelpBtn: document.getElementById("close-help-btn"),
    muteBtn: document.getElementById("mute-btn"),
    helpModal: document.getElementById("help-modal"),
    seedLabel: document.getElementById("seed-label"),
    visibleStats: document.getElementById("visible-stats"),
    dayLabel: document.getElementById("day-label"),
    phaseLabel: document.getElementById("phase-label"),
    stallLabel: document.getElementById("stall-label"),
    eventCard: document.getElementById("event-card"),
    sceneSprite: document.getElementById("scene-sprite"),
    eventTag: document.getElementById("event-tag"),
    eventTitle: document.getElementById("event-title"),
    eventText: document.getElementById("event-text"),
    choices: document.getElementById("choices"),
    logList: document.getElementById("log-list")
  };

  let state = null;
  let currentEvent = null;
  let motionEnabled = true;
  let layoutMode = "auto";

  const EVENTS = [
    {
      id: "C001",
      schedule: { day: 1, phase: 0 },
      scene: "fruit",
      tag: "第一天 · 水果摊",
      title: "西南门第一桶金",
      text: "你把水果摊推到白塔大学西南门。苹果很红，香蕉很黄，但晚自习下课的学生只想吃热的。隔壁保安提醒你：摊位别压线，人生也别压线。",
      choices: [
        {
          label: "先稳住水果摊",
          effects: { cash: 6, trust: 4, compliance: 4, traffic: -1, stamina: -4 },
          flags: ["fruitRoots"],
          log: "你先卖水果，顺手记下每位熟客的口味。"
        },
        {
          label: "今晚试烤几只腿",
          effects: { cash: 10, trust: 2, compliance: -2, traffic: 8, stamina: -9 },
          flags: ["earlyGrill"],
          log: "烤炉一亮，校门口的空气立刻有了论文致谢的味道。"
        },
        {
          label: "建群接龙预订",
          effects: { cash: 4, trust: 5, traffic: 5, stamina: -3, studentFilter: 4 },
          flags: ["chatGroup"],
          log: "第一个群名叫“西南门补给站”，十分钟后已经 47 人。"
        }
      ]
    },
    {
      id: "C002",
      schedule: { day: 1, phase: 1 },
      scene: "night",
      tag: "招牌命名",
      title: "今天到底卖什么腿",
      text: "第一批烤腿卖得很快。学生问你招牌叫什么，你看着烤炉、价签和供应商发来的消息，意识到名字可能比火候还烫手。",
      choices: [
        {
          label: "写“林姨鹅腿”",
          effects: { cash: 12, traffic: 13, trust: 3, nameRealityGap: 12, studentFilter: 6 },
          flags: ["nameGoose"],
          log: "招牌一挂，大家排队拍照。你也第一次感到名字会自己长腿。"
        },
        {
          label: "写“林姨鸭腿”",
          effects: { cash: 6, traffic: 4, trust: 8, compliance: 5, nameRealityGap: -3 },
          flags: ["nameDuck"],
          log: "有人说不够传奇，但账本和良心都比较安静。"
        },
        {
          label: "写“林姨烤腿”",
          effects: { cash: 8, traffic: 8, trust: 5, compliance: 2, nameRealityGap: 2 },
          flags: ["nameRoastLeg"],
          log: "这个名字不够炸裂，但非常耐解释。"
        },
        {
          label: "只写一个大字：“腿”",
          effects: { cash: 5, traffic: 10, absurdity: 12, compliance: -3 },
          flags: ["nameLeg"],
          log: "学生们沉默片刻，开始讨论这是极简主义还是逃避定义。"
        }
      ]
    },
    {
      id: "C003",
      schedule: { day: 3, phase: 2 },
      scene: "night",
      tag: "群聊发酵",
      title: "群里开始叫你阿姨",
      text: "群成员从 47 变成 300。有人负责接龙，有人负责拍照，有人负责在树洞里写“这不是夜宵，这是精神补给”。你突然有点紧张。",
      choices: [
        {
          label: "每天限量，卖完就休息",
          effects: { cash: 4, trust: 9, traffic: -4, stamina: 8, studentFilter: 4 },
          flags: ["limitedSupply"],
          log: "限量让队伍更短，也让传说更长。"
        },
        {
          label: "加量接单，大家都别饿着",
          effects: { cash: 18, trust: 3, traffic: 10, stamina: -15, compliance: -3 },
          flags: ["overwork"],
          log: "你烤到手腕发酸，群里却第一次出现“姨辛苦了”。"
        },
        {
          label: "让学生管理员维护秩序",
          effects: { trust: 5, traffic: 5, studentFilter: 8, absurdity: 3 },
          flags: ["studentMods"],
          log: "群规第一条：不许催姨，除非你的导师也在催你。"
        }
      ]
    },
    {
      id: "C004",
      schedule: { day: 6, phase: 1 },
      scene: "night",
      tag: "高校抢姨",
      title: "四所学校同时邀请你出摊",
      text: "白塔大学、青藤大学、人民路大学、航空桥学院都想让你今晚过去。群里投票已经吵成了区域经济学研讨会。",
      choices: [
        {
          label: "轮流出摊，按日历排班",
          effects: { cash: 10, trust: 8, traffic: 8, stamina: -8, compliance: 2 },
          flags: ["campusRotation"],
          log: "日历一发，学生们第一次觉得排班表也能浪漫。"
        },
        {
          label: "只守白塔大学西南门",
          effects: { trust: 12, traffic: -5, stamina: 4, studentFilter: 6 },
          stallName: "白塔大学西南门",
          flags: ["homeGate"],
          log: "你守住老地方，队伍里多了几位毕业生。"
        },
        {
          label: "让亲戚开分摊",
          effects: { cash: 16, traffic: 10, capitalization: 12, compliance: -6, nameRealityGap: 5 },
          flags: ["familyBranch"],
          log: "效率上来了，口味开始出现版本号。"
        },
        {
          label: "发起“抢姨杯”校际赛",
          effects: { cash: 8, traffic: 18, absurdity: 13, stamina: -6 },
          flags: ["campusCup"],
          log: "冠军奖品是明晚优先排队权，亚军奖品是承认自己输了。"
        }
      ]
    },
    {
      id: "C005",
      schedule: { day: 8, phase: 0 },
      scene: "supply",
      tag: "供应链波动",
      title: "真鹅腿涨价 70%",
      text: "供应商老赵把报价单往你手里一塞：真鹅腿今天涨 70%。他说不是针对你，是整个禽类下肢市场都在重写均衡。",
      choices: [
        {
          label: "继续进真鹅腿，直接涨价",
          effects: { cash: -14, trust: 9, compliance: 6, traffic: -6, nameRealityGap: -8 },
          flags: ["trueGooseRoute"],
          log: "价格变高了，解释成本变低了。"
        },
        {
          label: "改成鸭腿，群里明说并降价",
          effects: { cash: 7, trust: 10, compliance: 8, traffic: -3, nameRealityGap: -10 },
          flags: ["transparentDuck"],
          log: "群里安静了三分钟，然后有人说：至少今晚不用写物种鉴定报告。"
        },
        {
          label: "统一叫“秘制烤腿”",
          effects: { cash: 14, trust: 1, traffic: 5, nameRealityGap: 10, compliance: 1 },
          flags: ["roastLegPivot"],
          log: "名字变稳了，但评论区开始研究你的措辞。"
        },
        {
          label: "先停卖一天，说“鹅还在路上”",
          effects: { cash: -16, trust: 4, traffic: 10, stamina: 6, absurdity: 8 },
          flags: ["gooseOnRoad"],
          log: "这句话被做成表情包。没人知道鹅在哪，但大家都在等。"
        }
      ]
    },
    {
      id: "C006",
      schedule: { day: 11, phase: 2 },
      scene: "lecture",
      tag: "校园采访",
      title: "你被邀请分享创业故事",
      text: "校园记者举着录音笔：林姨，您觉得自己为什么成为一代人的精神符号？旁边的投影仪已经打开，标题页大得像热搜。",
      choices: [
        {
          label: "讲清进货、命名和改名历史",
          effects: { trust: 12, compliance: 8, traffic: -2, nameRealityGap: -14, stamina: -4 },
          flags: ["publicSupplyStory"],
          log: "台下没有掌声雷动，但很多人把菜单重新看了一遍。"
        },
        {
          label: "只讲奋斗故事和校门口温情",
          effects: { traffic: 16, studentFilter: 14, trust: 3, nameRealityGap: 6 },
          flags: ["warmNarrative"],
          log: "稿子很感人，供应链部分被剪成了三秒钟。"
        },
        {
          label: "现场宣布加盟计划",
          effects: { cash: 24, traffic: 10, capitalization: 18, trust: -7, studentFilter: -9 },
          flags: ["franchisePitch"],
          log: "掌声里混进了商业计划书翻页的声音。"
        },
        {
          label: "回答：符号不符号，要看抽检报告",
          effects: { compliance: 10, trust: 5, absurdity: 8, traffic: 6 },
          flags: ["inspectionPoetry"],
          log: "这句话被学生做成了论文答辩封面。"
        }
      ]
    },
    {
      id: "C007",
      schedule: { day: 15, phase: 0 },
      scene: "supply",
      tag: "扩张选择",
      title: "订单多到手机发烫",
      text: "你已经无法靠一个烤炉接住所有订单。有人建议开小程序，有人建议找代运营，还有人建议把排队系统写进课程项目。",
      choices: [
        {
          label: "坚持手工限量",
          effects: { cash: 5, trust: 13, traffic: -6, stamina: -8, capitalization: -4 },
          flags: ["handmadeLimit"],
          log: "队伍短了，但每只腿都还像你亲手签名。"
        },
        {
          label: "上线预约小程序",
          effects: { cash: 18, compliance: 8, traffic: 8, capitalization: 12, stamina: -5 },
          flags: ["miniProgram"],
          log: "系统终于会自动编号，也终于会自动暴露延迟。"
        },
        {
          label: "交给 MCN 代运营",
          effects: { cash: 30, traffic: 18, capitalization: 26, trust: -12, studentFilter: -12 },
          flags: ["mcn"],
          log: "第一条广告语写着：不重要是什么腿，重要的是谁定义了腿。"
        },
        {
          label: "让学生写鲁棒排队算法",
          effects: { traffic: 12, absurdity: 14, trust: 2, compliance: -3 },
          flags: ["queueOptimization"],
          log: "算法上线第一天，把校长排到了明年。"
        }
      ]
    },
    {
      id: "C008",
      schedule: { day: 18, phase: 0 },
      scene: "supply",
      tag: "标签整改",
      title: "招牌不能只写一个“腿”",
      text: "你收到整改建议：商品标签必须明确主要原料。招牌上只写一个“腿”不够，哪怕它在哲学上很有张力。",
      choices: [
        {
          label: "写清“鸭腿/鹅腿，以当日标签为准”",
          effects: { compliance: 16, trust: 9, traffic: -4, nameRealityGap: -18 },
          flags: ["clearLabel"],
          log: "菜单没那么神秘了，但投诉入口也安静了。"
        },
        {
          label: "改名“禽类下肢综合体”",
          effects: { compliance: 2, traffic: 10, absurdity: 18, nameRealityGap: 3 },
          flags: ["poultryComplex"],
          log: "监管人员看了很久，说：你这个字面上也不是完全不对。"
        },
        {
          label: "保留老招牌，旁边贴小字说明",
          effects: { compliance: 7, trust: 3, nameRealityGap: -5, traffic: 2 },
          flags: ["smallPrint"],
          log: "小字很小，但截图可以放大。"
        },
        {
          label: "只写“姨知道你饿了”",
          effects: { traffic: 12, compliance: -12, absurdity: 15, nameRealityGap: 10 },
          flags: ["auntieKnows"],
          log: "学生们很感动，表格们没有。"
        }
      ]
    },
    {
      id: "C009",
      schedule: { day: 21, phase: 1 },
      scene: "night",
      tag: "进军写字楼",
      title: "CBD 快闪邀请",
      text: "一个写字楼商圈邀请你快闪三天。白领顾客问发票、问标签、问售后，还问为什么群公告像口头文学。",
      choices: [
        {
          label: "做标准化包装再去",
          effects: { cash: 12, compliance: 14, trust: 5, traffic: 4, capitalization: 8 },
          stallName: "国贸外卖口",
          flags: ["standardPack"],
          log: "包装变硬了，故事变短了，客诉路径变清楚了。"
        },
        {
          label: "保持微信群接龙",
          effects: { cash: 18, traffic: 10, compliance: -8, trust: -5, nameRealityGap: 4 },
          stallName: "国贸外卖口",
          flags: ["chatInCbd"],
          log: "白领们第一次在午休时间体验校门口玄学。"
        },
        {
          label: "拒绝快闪，回校门口",
          effects: { cash: -6, trust: 10, studentFilter: 8, traffic: -5, stamina: 4 },
          stallName: "白塔大学西南门",
          flags: ["backToCampus"],
          log: "你推车回到老地方，路灯像把故事重新调亮。"
        },
        {
          label: "开直播边卖边解释标签",
          effects: { cash: 10, traffic: 18, compliance: 4, absurdity: 9, stamina: -8 },
          flags: ["liveExplain"],
          log: "弹幕问：姨，今晚卖的是哪一种叙事？"
        }
      ]
    },
    {
      id: "C010",
      schedule: { day: 24, phase: 2 },
      scene: "crisis",
      tag: "截图之夜",
      title: "群公告被截图转发",
      text: "旧公告、订单截图、供应商聊天记录、老顾客回忆同时出现。树洞热帖标题是：我只是想知道我啃的是哪一种鸟类的下肢。",
      choices: [
        {
          label: "公开票据、改名、可退款",
          effects: { cash: -24, trust: 18, compliance: 14, traffic: -12, nameRealityGap: -25 },
          flags: ["crisisTransparent"],
          log: "你把能公开的都公开了。热度掉得很快，信任回得很慢。"
        },
        {
          label: "发长文讲陪伴和记忆",
          effects: { traffic: 15, studentFilter: 10, trust: -12, nameRealityGap: 12 },
          flags: ["crisisWarmEssay"],
          log: "长文很长，评论区更长。"
        },
        {
          label: "表示“大家一直都知道”",
          effects: { cash: 5, trust: -22, traffic: 12, nameRealityGap: 18, absurdity: 4 },
          flags: ["everyoneKnows"],
          log: "群里第一次出现了五分钟没有人接龙的真空。"
        },
        {
          label: "直播讨论腿的本体论",
          effects: { traffic: 22, absurdity: 24, trust: -5, compliance: -4 },
          flags: ["ontologyTalk"],
          log: "你说：当我说鹅腿时，我在说一个历史过程。弹幕开始刷问号。"
        }
      ]
    },
    {
      id: "C011",
      schedule: { day: 27, phase: 0 },
      scene: "crisis",
      tag: "抽检通知",
      title: "监管人员来了",
      text: "市场监管人员语气很温和，但手里的表格厚得像一本博士论文。你突然意识到，票据也是一种叙事。",
      choices: [
        {
          label: "主动配合，提供全部票据",
          effects: { compliance: 18, trust: 10, cash: -8, nameRealityGap: -10 },
          flags: ["inspectionPassed"],
          log: "表格填完了，群里有人说这比资格考还严谨。"
        },
        {
          label: "暂停营业，等待结果",
          effects: { cash: -28, trust: 7, compliance: 8, traffic: -14, stamina: 8 },
          flags: ["pauseForInspection"],
          log: "三天不开摊，群里开始研究附近还有没有精神补给。"
        },
        {
          label: "让助手解释",
          effects: { stamina: 5, capitalization: 4, trust: -8, compliance: -8, nameRealityGap: 8 },
          flags: ["assistantExplains"],
          log: "助手解释了十分钟，大家更想看票据了。"
        },
        {
          label: "直播抽检流程",
          effects: { traffic: 18, absurdity: 12, compliance: 5, stamina: -8 },
          flags: ["inspectionLive"],
          log: "直播间人数暴涨，监管人员的表格成了当晚最硬核的道具。"
        }
      ]
    },
    {
      id: "C012",
      schedule: { day: 30, phase: 2 },
      scene: "ending",
      tag: "第三十天",
      title: "最后一晚的队伍",
      text: "三十天过去，校门口的灯还是那么亮。群里有人问今天还有吗，有人问明天还在吗，还有人只发了一个排队编号。你准备给这一局写下最后一个动作。",
      choices: [
        {
          label: "把菜单重新写清楚",
          effects: { trust: 8, compliance: 10, traffic: -4, nameRealityGap: -15 },
          flags: ["finalClearMenu"],
          log: "新菜单没有那么神秘，但很多人拍照留念。"
        },
        {
          label: "把小摊交给标准化团队",
          effects: { cash: 22, capitalization: 16, compliance: 8, studentFilter: -8 },
          flags: ["finalBrandTeam"],
          log: "小摊像公司了，公司不像小摊了。"
        },
        {
          label: "宣布明天随机卖一种腿",
          effects: { traffic: 16, absurdity: 18, trust: -4, nameRealityGap: 8 },
          flags: ["finalRandomLeg"],
          log: "学生们觉得这不严谨，但非常适合这个时代。"
        },
        {
          label: "收炉，回去睡觉",
          effects: { stamina: 14, trust: 5, traffic: -8 },
          flags: ["finalSleep"],
          log: "今晚没有彩蛋，只有睡眠。"
        }
      ]
    },
    {
      id: "R001",
      phase: 0,
      scene: "supply",
      tag: "早市随机",
      title: "冷链车迷路",
      text: "正规冷链车停在了隔壁幼儿园门口。司机说导航显示这里也是高等教育。",
      condition: (s) => s.day >= 5 && s.stats.compliance >= 35,
      choices: [
        { label: "骑三轮去接货", effects: { stamina: -9, compliance: 6, trust: 2 }, log: "你成功把冷链从儿童区拯救出来。" },
        { label: "延迟出摊，等司机找路", effects: { traffic: -5, trust: -2, compliance: 7 }, log: "今晚队伍短了，但票据完整得发光。" },
        { label: "先用小冰柜旧货顶一下", effects: { cash: 8, compliance: -12, nameRealityGap: 4 }, log: "冰柜发出一种不适合写进宣传文案的声音。" }
      ]
    },
    {
      id: "R002",
      phase: 0,
      scene: "fruit",
      tag: "早市随机",
      title: "香料配方被风吹走",
      text: "一阵大风把秘制配方吹到学院公告栏，上面压着一张博士后招聘启事。",
      condition: (s) => s.stats.stamina <= 60,
      choices: [
        { label: "冲过去抢回来", effects: { stamina: -7, traffic: 3 }, log: "你跑赢了风，也跑输了膝盖。" },
        { label: "公开配方，主打透明", effects: { trust: 9, traffic: 6, capitalization: -4 }, flags: ["openRecipe"], log: "配方公开后，大家发现最难复制的是你本人。" },
        { label: "宣布采用开源烧烤协议", effects: { absurdity: 12, traffic: 7 }, flags: ["openSourceGrill"], log: "计算机系要求加许可证，法学院要求先定义烧烤。" }
      ]
    },
    {
      id: "R003",
      phase: 0,
      scene: "supply",
      tag: "早市随机",
      title: "老赵推荐神秘货源",
      text: "供应商老赵压低声音：这批货便宜，名字也灵活。你看着报价单，感觉它在对你的合规值微笑。",
      choices: [
        { label: "拒绝，换正规供应商", effects: { cash: -10, compliance: 12, trust: 4, nameRealityGap: -5 }, log: "你花了更多钱，买到了一点睡眠质量。" },
        { label: "少量试试，别声张", effects: { cash: 14, compliance: -12, nameRealityGap: 13, trust: -3 }, log: "货很便宜，解释会很贵。" },
        { label: "让老赵写清楚品名", effects: { cash: -4, compliance: 8, trust: 2 }, log: "老赵叹气：你现在怎么像表格成精。" }
      ]
    },
    {
      id: "R004",
      phase: 1,
      scene: "night",
      tag: "夜摊随机",
      title: "博士生要开发票",
      text: "一位博士生买完腿后小声问：姨，能开发票吗？我想把它报成田野调查材料费。",
      choices: [
        { label: "补齐票据流程", effects: { cash: -9, compliance: 12, trust: 5 }, flags: ["invoiceReady"], log: "票据流程上线，博士生眼里有了经费到账的光。" },
        { label: "手写“腿类研究专用收据”", effects: { cash: 3, compliance: -6, absurdity: 7 }, log: "收据看着很真诚，真诚到不像票据。" },
        { label: "送他烤面筋，让他别问", effects: { cash: -2, trust: 2, compliance: -3 }, log: "面筋解决了饥饿，没有解决会计制度。" }
      ]
    },
    {
      id: "R005",
      phase: 1,
      scene: "night",
      tag: "夜摊随机",
      title: "保安划线",
      text: "保安拿出粉笔，在地上画了一条线：摊可以摆，烟不能过线，学生的灵魂也不能过线。",
      choices: [
        { label: "后退一米", effects: { traffic: -3, compliance: 8, trust: 2 }, log: "线很直，队伍很歪，但都还在秩序里。" },
        { label: "让学生蛇形走位", effects: { traffic: 5, absurdity: 5, stamina: -3 }, log: "队伍像贪吃蛇，保安像关卡设计师。" },
        { label: "公告采用边界条件排队法", effects: { traffic: 8, absurdity: 9, stamina: -4 }, flags: ["boundaryQueue"], log: "理学院学生表示这个模型可以讨论。" }
      ]
    },
    {
      id: "R006",
      phase: 1,
      scene: "night",
      tag: "夜摊随机",
      title: "留学生误会",
      text: "留学生看着招牌问：Goose? Duck? Auntie? 随后发帖说自己找到了禽类认识论最终关卡。",
      condition: (s) => s.stats.traffic >= 40,
      choices: [
        { label: "做双语菜单", effects: { compliance: 5, traffic: 6, trust: 3, nameRealityGap: -4 }, log: "菜单变长了，误会变短了。" },
        { label: "改名 Goose Goose Duck Leg", effects: { traffic: 12, nameRealityGap: 7, absurdity: 8 }, flags: ["englishMeme"], log: "游戏社团立刻申请联动。" },
        { label: "解释这是文化语境", effects: { trust: 2, absurdity: 5, traffic: 3 }, log: "解释成功了一半，因为另一半需要注释。" }
      ]
    },
    {
      id: "R007",
      phase: 1,
      scene: "night",
      tag: "夜摊随机",
      title: "同行模仿",
      text: "校门口出现了“鹅腿大姨”“鹅腿二姨”“鹅腿姨父”“腿类联合实验室”四个摊位。",
      condition: (s) => s.stats.traffic >= 55,
      choices: [
        { label: "注册商标", effects: { cash: -16, compliance: 4, capitalization: 6, trust: 2 }, flags: ["trademark"], log: "你第一次知道法律文书也能闻起来像烤炉。" },
        { label: "拼味道，继续手工烤", effects: { stamina: -12, trust: 8, traffic: 3 }, log: "你赢在火候，输在腰椎。" },
        { label: "成立“腿门矩阵”", effects: { cash: 22, capitalization: 18, nameRealityGap: 7, absurdity: 9 }, flags: ["legMatrix"], log: "矩阵成立当天，没人知道总店是哪一家。" },
        { label: "招牌写“本摊非二姨”", effects: { traffic: 7, absurdity: 6, trust: 1 }, log: "这句话被做成了防伪标识。" }
      ]
    },
    {
      id: "R008",
      phase: 2,
      scene: "crisis",
      tag: "群聊随机",
      title: "学生催单",
      text: "群里 99+。有人问“姨，我的腿呢？”有人回“你的腿在路上”。第三个人说不要进行人身攻击。",
      repeatable: true,
      maxRepeats: 1,
      choices: [
        { label: "老实按顺序解释", effects: { stamina: -5, trust: 5 }, log: "你解释完第 26 单，发现第 27 单又问了一遍。" },
        { label: "发统一公告", effects: { stamina: -2, trust: 1, compliance: 1 }, log: "公告很统一，理解不太统一。" },
        { label: "让助手回复", effects: { stamina: 4, capitalization: 3, trust: -2 }, flags: ["assistantReply"], log: "助手效率很高，语气像刚学会公关。" },
        { label: "发送表情包“鹅正在赶来”", effects: { traffic: 5, absurdity: 5 }, log: "表情包跑得比订单快。" }
      ]
    },
    {
      id: "R009",
      phase: 2,
      scene: "crisis",
      tag: "树洞随机",
      title: "匿名质疑帖",
      text: "树洞出现匿名帖：我不是不相信姨，我只是想知道我啃的是哪一种鸟类的下肢。",
      condition: (s) => s.stats.nameRealityGap >= 20 || s.stats.traffic >= 62,
      choices: [
        { label: "公开原料和进货票据", effects: { trust: 12, compliance: 9, nameRealityGap: -16, cash: -5 }, flags: ["postedReceipts"], log: "截图继续传，但方向开始变了。" },
        { label: "回应“大家吃的是情怀”", effects: { traffic: 9, nameRealityGap: 8, trust: -9, studentFilter: 4 }, log: "情怀很香，评论区很烫。" },
        { label: "只回复“已阅”", effects: { absurdity: 6, trust: -6 }, log: "短到像声明，硬到像烤糊。" },
        { label: "邀请发帖人参观备料", effects: { stamina: -8, trust: 9, compliance: 4, nameRealityGap: -6 }, log: "参观结束后，对方发帖：至少这次我看见了。" }
      ]
    },
    {
      id: "R010",
      phase: 2,
      scene: "crisis",
      tag: "群聊随机",
      title: "公告错别字",
      text: "你想写“今日烤腿已售罄”，结果发成“今日烤腿已受惊”。",
      condition: (s) => s.stats.stamina <= 45,
      choices: [
        { label: "撤回重发", effects: { stamina: -2, trust: 1 }, log: "撤回很快，但截图更快。" },
        { label: "解释：鹅鸭都很敏感", effects: { absurdity: 8, traffic: 7 }, flags: ["sensitivePoultry"], log: "大家接受了这个设定，甚至开始心疼今晚的腿。" },
        { label: "投票：冷静腿还是受惊腿", effects: { traffic: 12, absurdity: 11, trust: -2 }, flags: ["startledLeg"], log: "受惊腿以 71% 得票率成为新品。" }
      ]
    },
    {
      id: "R011",
      phase: 1,
      scene: "night",
      tag: "夜摊随机",
      title: "校长排队",
      text: "校长排到了队尾。学生们突然安静，因为大家第一次见到有人比导师还需要等待。",
      condition: (s) => s.stats.traffic >= 76,
      choices: [
        { label: "坚持按顺序", effects: { trust: 11, traffic: 5, studentFilter: 4 }, flags: ["principalQueued"], log: "校长点头，学生鼓掌，保安也想拍照。" },
        { label: "给校长插队", effects: { cash: 5, trust: -16, compliance: -2 }, log: "队伍仍然排着，但灵魂已经散了。" },
        { label: "让校长扫码进群", effects: { traffic: 9, absurdity: 10, trust: 2 }, flags: ["principalInGroup"], log: "群名片一出来，大家开始规范发言。" }
      ]
    },
    {
      id: "R012",
      phase: 2,
      scene: "lecture",
      tag: "学术随机",
      title: "博导提出合作",
      text: "管理学院博导说：你的排队系统很有研究价值。我们可以发一篇非平稳夜宵需求下的禽类供应链鲁棒优化。",
      condition: (s) => s.stats.traffic >= 55 && s.stats.absurdity >= 18,
      choices: [
        { label: "同意合作，要求共同一作", effects: { traffic: 8, absurdity: 12, trust: 2 }, flags: ["paperCoauthor"], log: "学生们第一次在小吃摊旁边讨论作者顺序。" },
        { label: "拒绝，今晚只处理熟食", effects: { stamina: 3, trust: 4 }, log: "你把研究问题留给明天，把烤炉留给今晚。" },
        { label: "开放订单数据做课程项目", effects: { traffic: 7, compliance: -5, absurdity: 8 }, flags: ["dataProject"], log: "课程项目上线后，隐私设置成为新的隐藏关卡。" }
      ]
    },
    {
      id: "R013",
      phase: 2,
      scene: "ending",
      tag: "荒诞随机",
      title: "鹅本人来了",
      text: "凌晨一点，一只戴着学生证的鹅站在摊前，学生证上写着“白塔大学访问学者”。",
      condition: (s) => s.stats.absurdity >= 42,
      choices: [
        { label: "给它一把青菜", effects: { absurdity: 5, trust: 3, cash: -1 }, log: "访问学者吃得很慢，像在审稿。" },
        { label: "请它担任品牌伦理顾问", effects: { absurdity: 16, compliance: 4, trust: 5 }, flags: ["ethicsGoose"], log: "它没有签字，但留下了脚印。你理解为同意。" },
        { label: "询问肖像授权", effects: { capitalization: 12, absurdity: 12, traffic: 6 }, flags: ["goosePortrait"], log: "谈判失败，因为对方只接受生菜结算。" }
      ]
    },
    {
      id: "R014",
      phase: 1,
      scene: "night",
      tag: "夜摊随机",
      title: "雨夜外卖单",
      text: "暴雨把队伍冲散，外卖单却突然爆了。骑手问你能不能把每个袋子都写清楚。",
      choices: [
        { label: "写清原料和编号", effects: { compliance: 7, trust: 6, stamina: -8, cash: 3 }, log: "字写到最后有点歪，但每袋都能对上。" },
        { label: "只写昵称，熟人自取", effects: { cash: 10, compliance: -5, nameRealityGap: 5, stamina: -3 }, log: "昵称很亲切，错单也很亲切。" },
        { label: "停外卖，现场卖完", effects: { trust: 4, traffic: -4, stamina: 5 }, log: "你少赚了一点，多保住几袋热乎。" }
      ]
    },
    {
      id: "R015",
      phase: 0,
      scene: "fruit",
      tag: "早市随机",
      title: "毕业生回校",
      text: "一个毕业生拖着行李箱来找你，说当年答辩前吃过一只，现在想再买一只带走。",
      choices: [
        { label: "按老价格卖给他", effects: { cash: -2, trust: 8, studentFilter: 7 }, log: "他拍了一张照，没有发朋友圈，只是笑了笑。" },
        { label: "按现价卖，送一瓶水", effects: { cash: 6, trust: 4, studentFilter: 3 }, log: "情怀没有打折，水打了。" },
        { label: "请他帮忙写推荐帖", effects: { traffic: 9, studentFilter: 9, trust: -2 }, log: "推荐帖很真诚，真诚到像广告。" }
      ]
    },
    {
      id: "R016",
      phase: 2,
      scene: "crisis",
      tag: "平台随机",
      title: "短视频号要拍你",
      text: "本地短视频号想拍“校门口最懂年轻人的阿姨”。镜头已经架好，标题已经想好，事实还没核过。",
      condition: (s) => s.stats.traffic >= 45,
      choices: [
        { label: "接受，但先核菜单和票据", effects: { traffic: 8, compliance: 7, trust: 4, stamina: -5 }, log: "视频没那么爆，但评论区少了很多问号。" },
        { label: "接受，主打励志故事", effects: { traffic: 18, studentFilter: 10, nameRealityGap: 6, stamina: -4 }, flags: ["viralVideo"], log: "视频爆了，菜单也被放大了。" },
        { label: "拒绝拍摄", effects: { traffic: -5, trust: 5, stamina: 4 }, log: "热度错过了你，但你也错过了一场暴雨。" }
      ]
    },
    {
      id: "R017",
      phase: 1,
      scene: "supply",
      tag: "夜摊随机",
      title: "烤炉突然罢工",
      text: "烤炉发出一声很有态度的响动，然后不动了。队伍看着你，你看着烤炉，烤炉看着宇宙。",
      choices: [
        { label: "现场维修", effects: { cash: -8, stamina: -10, trust: 4 }, log: "你修好了烤炉，也重新理解了扳手。" },
        { label: "改卖水果和饮料", effects: { cash: 4, trust: 3, traffic: -6, stamina: 5 }, flags: ["fruitFallback"], log: "水果摊的灵魂短暂复活。" },
        { label: "宣布今晚是冷餐实验", effects: { traffic: 6, absurdity: 12, trust: -7 }, log: "实验失败得很有教育意义。" }
      ]
    },
    {
      id: "R018",
      phase: 0,
      scene: "lecture",
      tag: "课程随机",
      title: "学生会邀请你办讲座",
      text: "学生会邀请你做“从水果到烤腿：个体经营的韧性”讲座。你看了眼备货表，感觉韧性正在被库存检验。",
      choices: [
        { label: "去讲座，出摊推迟", effects: { traffic: 6, studentFilter: 8, cash: -6, stamina: -4 }, log: "你讲了半小时，学生听到最后都饿了。" },
        { label: "拒绝讲座，按时出摊", effects: { cash: 8, trust: 4, traffic: -2 }, log: "今晚没有 PPT，只有炭火。" },
        { label: "讲座现场卖预订单", effects: { cash: 18, traffic: 10, capitalization: 8, trust: -5 }, log: "学生会第一次怀疑自己办的是招商会。" }
      ]
    },
    {
      id: "R019",
      phase: 2,
      scene: "crisis",
      tag: "助手随机",
      title: "助手口误",
      text: "助手在群里回复：今天这个不是那个，那个也不是这个，反正都很好吃。群里安静了。",
      condition: (s) => hasFlag(s, "assistantReply") || hasFlag(s, "familyBranch") || s.stats.capitalization >= 35,
      choices: [
        { label: "立刻纠正并道歉", effects: { trust: 7, compliance: 4, nameRealityGap: -6, stamina: -5 }, log: "你把话说清楚，虽然说清楚也会疼。" },
        { label: "让助手继续解释", effects: { stamina: 3, trust: -10, nameRealityGap: 9, absurdity: 4 }, log: "助手越解释，大家越像在听谜语。" },
        { label: "今晚暂停接单整理口径", effects: { cash: -14, compliance: 6, trust: 5, traffic: -5 }, log: "少赚一晚，换来明天不那么乱。" }
      ]
    },
    {
      id: "R020",
      phase: 1,
      scene: "night",
      tag: "夜摊随机",
      title: "情侣吵架",
      text: "一对情侣因为最后一只腿该谁吃吵了起来。后面队伍自发开庭，法学院学生已经举手。",
      choices: [
        { label: "切成两半", effects: { trust: 6, traffic: 3, stamina: -2 }, log: "一只腿被分成两份，和平暂时成立。" },
        { label: "按订单顺序执行", effects: { compliance: 5, trust: 2, studentFilter: -2 }, log: "规则没有温度，但很耐用。" },
        { label: "宣布加开“情感调解串”", effects: { cash: 8, traffic: 8, absurdity: 8 }, log: "新品不好吃，但非常有戏剧功能。" }
      ]
    },
    {
      id: "R021",
      phase: 0,
      scene: "supply",
      tag: "早市随机",
      title: "进货单被咖啡泡了",
      text: "你把进货单和学生送的咖啡放在一起。十分钟后，原料名称变成了抽象水墨。",
      choices: [
        { label: "重新找供应商补单", effects: { stamina: -5, compliance: 6, trust: 2 }, log: "补单很麻烦，但比补信任便宜。" },
        { label: "凭记忆进货", effects: { cash: 8, compliance: -8, nameRealityGap: 6 }, log: "你的记忆很努力，票据不承认努力。" },
        { label: "把泡坏的单子裱起来", effects: { absurdity: 7, traffic: 4 }, log: "学生说这叫供应链废墟美学。" }
      ]
    },
    {
      id: "R022",
      phase: 2,
      scene: "ending",
      tag: "荒诞随机",
      title: "AI 林姨上线",
      text: "有人给群里接入了 AI 回复助手。它每次都说“还有 17 只腿”，无论真实库存是多少。",
      condition: (s) => hasFlag(s, "miniProgram") || s.stats.capitalization >= 45,
      choices: [
        { label: "关闭 AI，人工回复", effects: { trust: 6, stamina: -6, capitalization: -4 }, log: "人类回复慢，但至少知道今晚还有几只。" },
        { label: "训练它识别库存", effects: { cash: -8, compliance: 3, capitalization: 7, trust: 2 }, flags: ["trainedAiAuntie"], log: "AI 学会了库存，也学会了说快到了。" },
        { label: "让它继续生成抽象公告", effects: { traffic: 8, absurdity: 14, trust: -5 }, flags: ["aiAuntie"], log: "公告越来越像诗，订单越来越像谜。" }
      ]
    },
    {
      id: "R023",
      phase: 0,
      scene: "supply",
      tag: "早市随机",
      title: "一次性餐盒断货",
      text: "批发市场的餐盒卖空了。摊前还有半箱纸袋、一捆油纸，以及一位环保社团同学热切的眼神。",
      choices: [
        { label: "买贵一点的合规餐盒", effects: { cash: -9, compliance: 7, trust: 3 }, log: "餐盒贵了，但每一袋都能体面地走出校门。" },
        { label: "改用油纸现场包", effects: { cash: 4, stamina: -7, trust: 5 }, log: "手工感上来了，你的手速也被迫上来了。" },
        { label: "推出自带饭盒优惠", effects: { traffic: 4, trust: 6, compliance: 3, cash: -3 }, flags: ["bringBoxDiscount"], log: "环保社团转发了你，顺便纠正了你的垃圾分类。" }
      ]
    },
    {
      id: "R024",
      phase: 0,
      scene: "lecture",
      tag: "早市随机",
      title: "食品安全培训",
      text: "街道通知下午有食品安全培训。讲义很厚，标题很硬，时间刚好压着你的备料窗口。",
      choices: [
        { label: "认真参加培训", effects: { compliance: 12, trust: 3, stamina: -5, cash: -4 }, flags: ["safetyTraining"], log: "你学会了三个新表格，也学会了表格之间的亲属关系。" },
        { label: "让助手去听", effects: { compliance: 5, capitalization: 3, trust: -2 }, log: "助手带回了讲义，也带回了几句不完整的重点。" },
        { label: "先备料，晚上补课件", effects: { cash: 8, compliance: -4, stamina: -4 }, log: "今晚卖得不少，但培训课件像未读论文一样躺在手机里。" }
      ]
    },
    {
      id: "R025",
      phase: 0,
      scene: "supply",
      tag: "早市随机",
      title: "供应商换了新标签",
      text: "老赵发来一批新标签，字号很大，品名很清楚，唯一问题是每张都贴得有点歪。",
      choices: [
        { label: "重新贴一遍", effects: { compliance: 8, trust: 4, stamina: -7 }, log: "标签贴正后，世界看起来都没那么倾斜了。" },
        { label: "歪就歪，信息清楚就行", effects: { compliance: 4, cash: 4, absurdity: 3 }, log: "学生说这叫手作感，监管说这叫还算能看。" },
        { label: "让学生帮忙贴，送小串", effects: { trust: 7, stamina: 3, cash: -5, studentFilter: 4 }, log: "贴标签现场变成了小型团建。" }
      ]
    },
    {
      id: "R026",
      phase: 0,
      scene: "fruit",
      tag: "早市随机",
      title: "助手想请假",
      text: "助手说今晚想请假去看演出。你看着订单量，又看着对方眼里的自由，烤炉突然显得很沉默。",
      condition: (s) => hasFlag(s, "assistantReply") || hasFlag(s, "familyBranch") || s.day >= 10,
      choices: [
        { label: "批准，请临时工", effects: { cash: -10, trust: 2, stamina: -2, capitalization: 2 }, log: "临时工很努力，只是把第 17 单叫成了第 71 单。" },
        { label: "自己顶上", effects: { cash: 6, trust: 4, stamina: -14 }, log: "你顶住了晚高峰，腰没完全顶住。" },
        { label: "今晚限量，早点收摊", effects: { cash: -6, trust: 7, stamina: 8, traffic: -3 }, log: "少卖几单，换来一个正常人的晚上。" }
      ]
    },
    {
      id: "R027",
      phase: 0,
      scene: "night",
      tag: "早市随机",
      title: "校园跑封路",
      text: "学校今晚办荧光夜跑，西南门前的路被临时封住。报名同学说这也是一种排队，只是速度更快。",
      choices: [
        { label: "移到终点附近卖", effects: { traffic: 12, cash: 10, stamina: -6, compliance: -2 }, log: "跑完的人比平时更饿，也更愿意相信热量守恒。" },
        { label: "停在原地等封路结束", effects: { traffic: -7, compliance: 5, stamina: 4 }, log: "你等到了路，也错过了第一波胃。" },
        { label: "推出“完赛补给腿”", effects: { traffic: 10, cash: 8, absurdity: 5 }, flags: ["finishLeg"], log: "有人为了补给腿多跑了一圈。" }
      ]
    },
    {
      id: "R028",
      phase: 0,
      scene: "supply",
      tag: "早市随机",
      title: "温度记录仪报警",
      text: "冷藏箱里的温度记录仪突然报警。屏幕显示温度波动，声音像一只电子闹钟在进行道德谴责。",
      condition: (s) => s.day >= 6,
      choices: [
        { label: "立刻换冰袋并记录", effects: { compliance: 10, trust: 3, cash: -6, stamina: -4 }, log: "你把波动写进记录表，也把心跳调回正常范围。" },
        { label: "这批先不卖", effects: { cash: -18, trust: 8, compliance: 8 }, log: "损失很疼，但比解释食品问题便宜。" },
        { label: "继续用，今晚烤透一点", effects: { cash: 12, compliance: -14, trust: -6, nameRealityGap: 4 }, log: "火候不是万能的，尤其不是表格的替代品。" }
      ]
    },
    {
      id: "R029",
      phase: 0,
      scene: "lecture",
      tag: "早市随机",
      title: "数学系要建模",
      text: "数学系学生问你能不能提供每天销量数据。他们想研究“排队长度对幸福感的非线性影响”。",
      choices: [
        { label: "给匿名汇总数据", effects: { trust: 5, compliance: 4, traffic: 3 }, flags: ["anonymousData"], log: "数据脱敏后，连你都认不出哪天最累。" },
        { label: "拒绝，数据只给账本看", effects: { trust: 2, compliance: 3, traffic: -2 }, log: "账本合上了，学生转去研究食堂窗口。" },
        { label: "换一次免费排队优化", effects: { traffic: 8, absurdity: 7, compliance: -2 }, flags: ["studentModel"], log: "模型建议你在雨天卖得更多，像一个很会说废话的导师。" }
      ]
    },
    {
      id: "R030",
      phase: 0,
      scene: "supply",
      tag: "早市随机",
      title: "预制包厂家来谈合作",
      text: "一家预制包厂家带着样品来找你，说可以让味道稳定、出餐更快，还能把你从烤炉前解放出来。",
      condition: (s) => s.day >= 12,
      choices: [
        { label: "试小批量，但明示", effects: { cash: 10, compliance: 7, trust: 1, capitalization: 10 }, flags: ["prepackTrial"], log: "味道稳定得像模板，说明也写得像模板。" },
        { label: "拒绝，坚持现烤", effects: { trust: 9, stamina: -8, capitalization: -5 }, log: "你保住了烟火气，也保住了烟。" },
        { label: "悄悄混用提高效率", effects: { cash: 20, traffic: 6, trust: -8, nameRealityGap: 12, capitalization: 10 }, log: "速度快了，风险也快了。" }
      ]
    },
    {
      id: "R031",
      phase: 0,
      scene: "supply",
      tag: "低概率突发",
      title: "批发市场临时停电",
      text: "批发市场突然停电，冷柜一片安静。摊主们站在走廊里，像等待判卷结果的学生。",
      chance: 0.05,
      condition: (s) => s.day >= 5,
      choices: [
        { label: "转去正规冷链仓补货", effects: { cash: -14, compliance: 12, trust: 5 }, log: "路远价高，但每一箱都带着清楚的来处。" },
        { label: "今天少进货，限量卖", effects: { cash: -5, trust: 7, stamina: 4, traffic: -4 }, log: "限量公告一出，群里开始猜今晚有多限量。" },
        { label: "抢低价现货", effects: { cash: 14, compliance: -16, nameRealityGap: 8 }, log: "价格很美，风险也很有存在感。" }
      ]
    },
    {
      id: "R032",
      phase: 0,
      scene: "ending",
      tag: "低概率突发",
      title: "一箱货多出一只金色小鸭挂件",
      text: "开箱时，你发现里面多了一只金色小鸭挂件。老赵说没见过，学生说这是抽卡出金。",
      chance: 0.04,
      choices: [
        { label: "挂在摊头当吉祥物", effects: { traffic: 8, absurdity: 8, trust: 2 }, flags: ["goldDuckCharm"], log: "金色挂件在灯下发亮，队伍里的玄学浓度升高了。" },
        { label: "退回供应商，别乱收东西", effects: { compliance: 6, trust: 3, absurdity: -2 }, log: "你拒绝了玄学，也拒绝了一个潜在的周边。" },
        { label: "群里抽奖送出", effects: { traffic: 10, cash: -2, studentFilter: 6 }, log: "中奖同学宣布这学期绩点有救了。" }
      ]
    },
    {
      id: "R033",
      phase: 1,
      scene: "night",
      tag: "夜摊随机",
      title: "社团团购",
      text: "戏剧社一次性订 28 只，说今晚排练到很晚，主角可以迟到，烤腿不能。",
      choices: [
        { label: "接单，要求提前付款", effects: { cash: 18, trust: 3, stamina: -10 }, log: "团购单让账本开心，也让烤炉加班。" },
        { label: "只接一半，保证散客", effects: { cash: 8, trust: 8, traffic: 2, stamina: -5 }, log: "戏剧社少吃几只，队伍少骂几句。" },
        { label: "赞助社团，换节目单广告", effects: { cash: -8, traffic: 14, studentFilter: 5 }, log: "节目单上写着鸣谢林姨，旁边的演员像在闻香味。" }
      ]
    },
    {
      id: "R034",
      phase: 1,
      scene: "night",
      tag: "夜摊随机",
      title: "排队号被倒卖",
      text: "有人把 12 号排队号挂到二手群，标题写“校门口稀缺资产，诚心出”。",
      condition: (s) => s.stats.traffic >= 50,
      choices: [
        { label: "现场实名核号", effects: { trust: 8, compliance: 4, stamina: -6, traffic: -2 }, log: "黄牛没了，队伍慢了，但大家觉得公平了。" },
        { label: "取消今晚排队号", effects: { trust: -4, traffic: -6, absurdity: 4 }, log: "公平回来了，秩序走丢了。" },
        { label: "让学生自治举报", effects: { trust: 6, studentFilter: 5, stamina: 2 }, log: "群里出现了临时纪律委员，语气比辅导员还像辅导员。" }
      ]
    },
    {
      id: "R035",
      phase: 1,
      scene: "night",
      tag: "夜摊随机",
      title: "移动支付码失灵",
      text: "付款码突然打不开。队伍里有人举着手机，有人开始翻现金，还有人问能不能用校园卡赊账。",
      choices: [
        { label: "手写欠条，老客先拿", effects: { trust: 8, cash: -10, studentFilter: 5 }, flags: ["iouNight"], log: "欠条像一张张小小的信任合约。" },
        { label: "只收现金，没现金就等", effects: { cash: -4, trust: -5, compliance: 2 }, log: "纸币突然变得像古董。" },
        { label: "让隔壁摊代收再结算", effects: { cash: 6, trust: 2, compliance: -4 }, log: "隔壁摊成了临时金融机构。" }
      ]
    },
    {
      id: "R036",
      phase: 1,
      scene: "night",
      tag: "夜摊随机",
      title: "隔壁摊投诉油烟",
      text: "隔壁卖柠檬茶的大哥说你的烤炉太香，导致大家买茶时都在想腿。",
      choices: [
        { label: "调整炉位并加挡板", effects: { compliance: 7, trust: 3, cash: -7 }, log: "油烟少了，大哥的表情也没那么酸了。" },
        { label: "合作卖套餐", effects: { cash: 12, traffic: 8, capitalization: 4 }, flags: ["teaCombo"], log: "腿配柠檬茶，校门口出现了新的热量闭环。" },
        { label: "保持原位，靠实力竞争", effects: { cash: 8, trust: -4, compliance: -6 }, log: "你赢了销量，输了邻里关系。" }
      ]
    },
    {
      id: "R037",
      phase: 1,
      scene: "night",
      tag: "夜摊随机",
      title: "导师组会加餐",
      text: "一位老师说今晚组会开到十点，想买几只给学生。他补充：不要发票，发票会提醒大家这也是工作。",
      condition: (s) => s.day >= 4,
      choices: [
        { label: "按普通订单排队", effects: { trust: 6, compliance: 3 }, log: "组会没有特权，只有饥饿。" },
        { label: "给组会打包优先走", effects: { cash: 10, trust: -6, studentFilter: -2 }, log: "学生们看着老师插队，表情像看见 deadline 提前。" },
        { label: "送一份小菜，祝早散会", effects: { cash: -3, trust: 5, traffic: 3 }, log: "这份祝福没有立刻生效，但大家心领了。" }
      ]
    },
    {
      id: "R038",
      phase: 1,
      scene: "night",
      tag: "夜摊随机",
      title: "有人要求低盐低辣",
      text: "健身社同学认真问：能不能低盐低辣高蛋白？后面的人小声说：那还算夜宵吗？",
      choices: [
        { label: "做一版清爽口味", effects: { traffic: 5, trust: 5, stamina: -4 }, flags: ["lightFlavor"], log: "清爽口味卖得不多，但评论区很有自律感。" },
        { label: "坚持原味", effects: { cash: 5, trust: -2, stamina: 2 }, log: "原味继续原味，自律继续自律。" },
        { label: "推出“心理低卡版”", effects: { traffic: 9, absurdity: 9, trust: -3 }, log: "热量没有变，命名很努力。" }
      ]
    },
    {
      id: "R039",
      phase: 1,
      scene: "crisis",
      tag: "低概率突发",
      title: "消防演练临时开始",
      text: "校园广播突然响起消防演练通知。队伍散开，烤炉熄火，保安用眼神提醒你：这不是演习里的演习。",
      chance: 0.045,
      condition: (s) => s.day >= 6,
      choices: [
        { label: "立刻熄火撤到安全区", effects: { compliance: 12, trust: 5, cash: -8 }, log: "你少卖了一轮，但安全这件事不适合讨价还价。" },
        { label: "打包半成品，演练后继续", effects: { cash: 4, compliance: -4, stamina: -5 }, log: "半成品很尴尬，像写到一半的论文。" },
        { label: "给保安送水协助疏散", effects: { trust: 8, compliance: 8, cash: -4 }, log: "保安点点头，粉笔线今天对你温柔了一点。" }
      ]
    },
    {
      id: "R040",
      phase: 1,
      scene: "night",
      tag: "低概率突发",
      title: "短暂全校停电",
      text: "校园突然黑了三秒，随后路灯重启。学生们发出整齐的“哇”，你的烤炉发出不太整齐的“咔”。",
      chance: 0.035,
      condition: (s) => s.day >= 8,
      choices: [
        { label: "暂停检查设备", effects: { compliance: 8, trust: 4, cash: -6 }, log: "你等了五分钟，换来设备没有情绪。" },
        { label: "点应急灯继续卖", effects: { cash: 10, traffic: 6, stamina: -6, compliance: -3 }, log: "应急灯下的烤腿显得很有末日感。" },
        { label: "宣布今晚是像素夜市", effects: { traffic: 12, absurdity: 10, trust: 2 }, log: "黑暗把一切都变成了低分辨率。" }
      ]
    },
    {
      id: "R041",
      phase: 1,
      scene: "crisis",
      tag: "低概率突发",
      title: "无人机悬停拍摄",
      text: "一架无人机停在摊位上方，镜头对着烤炉。没人知道是谁的，但大家都知道它很想要流量。",
      chance: 0.04,
      condition: (s) => s.stats.traffic >= 45,
      choices: [
        { label: "请保安处理", effects: { compliance: 6, trust: 4, traffic: -2 }, log: "无人机飞走了，队伍恢复了人类尺度。" },
        { label: "对镜头展示菜单标签", effects: { compliance: 7, traffic: 8, trust: 3 }, log: "镜头拍到了标签，也拍到了你努力不翻白眼。" },
        { label: "挥手营业，顺势整活", effects: { traffic: 16, absurdity: 9, trust: -3 }, log: "视频爆了，评论区开始逐帧分析烤炉。" }
      ]
    },
    {
      id: "R042",
      phase: 2,
      scene: "crisis",
      tag: "群聊随机",
      title: "退款表格太复杂",
      text: "有同学做了退款登记表，字段包括姓名、订单、情绪、想退款还是想被安慰。你看着表格陷入沉思。",
      condition: (s) => s.stats.trust <= 50 || s.stats.nameRealityGap >= 25,
      choices: [
        { label: "简化退款流程", effects: { cash: -12, trust: 12, compliance: 5 }, log: "退款变快了，怨气也变短了。" },
        { label: "逐项核对，慢慢处理", effects: { cash: -5, trust: 3, stamina: -8, compliance: 3 }, log: "你处理得很认真，也处理到眼睛发直。" },
        { label: "先发安抚公告", effects: { trust: -3, traffic: 6, studentFilter: 5 }, log: "公告写得很暖，但表格还在那里。" }
      ]
    },
    {
      id: "R043",
      phase: 2,
      scene: "lecture",
      tag: "群聊随机",
      title: "学生做了民间百科",
      text: "有人给你建了一个“林姨烤腿百科”，页面里有历史沿革、价格表、排队术语和三条待考证传说。",
      condition: (s) => s.stats.traffic >= 40,
      choices: [
        { label: "补充准确信息", effects: { trust: 8, compliance: 5, nameRealityGap: -6 }, flags: ["wikiCorrected"], log: "百科变得没那么神秘，但更像档案了。" },
        { label: "放任大家创作", effects: { traffic: 8, absurdity: 8, studentFilter: 6 }, log: "百科越来越像史诗，考证越来越像玄学。" },
        { label: "请求删除价格历史", effects: { trust: -6, traffic: 5, nameRealityGap: 4 }, log: "越想删，大家越想截图。" }
      ]
    },
    {
      id: "R044",
      phase: 2,
      scene: "crisis",
      tag: "群聊随机",
      title: "老语音被翻出来",
      text: "一段很久以前的群语音被转发出来。你的口音很重，背景很吵，最清楚的是一句“今天不一定有”。",
      condition: (s) => s.day >= 12,
      choices: [
        { label: "解释当时是货源不稳", effects: { trust: 6, nameRealityGap: -4, stamina: -2 }, log: "你把旧话放回旧背景里，大家终于不只听一句。" },
        { label: "承认那时口径混乱", effects: { trust: 9, compliance: 3, traffic: -2 }, log: "承认混乱很难，但比假装整齐容易。" },
        { label: "做成怀旧铃声", effects: { traffic: 10, absurdity: 12, trust: -3 }, flags: ["voiceMeme"], log: "铃声火了，你的解释没那么火。" }
      ]
    },
    {
      id: "R045",
      phase: 2,
      scene: "crisis",
      tag: "群聊随机",
      title: "论坛投票开了",
      text: "论坛有人发起投票：你最在意的是味道、价格、原料、还是阿姨的回复速度？四个选项都在吵。",
      choices: [
        { label: "按投票结果调整菜单", effects: { trust: 6, traffic: 4, stamina: -5 }, log: "民主让菜单更复杂，也让你更忙。" },
        { label: "发起官方问卷", effects: { compliance: 4, trust: 5, traffic: 2 }, log: "问卷多了一个问题：你是否愿意少问几个问题。" },
        { label: "不参与，让大家聊", effects: { traffic: 5, trust: -2, stamina: 3 }, log: "讨论自己转了起来，像一个不用加炭的烤炉。" }
      ]
    },
    {
      id: "R046",
      phase: 2,
      scene: "ending",
      tag: "群聊随机",
      title: "毕业照邀请",
      text: "一群毕业生问你能不能出现在毕业照角落。他们说四年里见导师不多，见你的队伍很多。",
      condition: (s) => s.stats.trust >= 55 && s.day >= 18,
      choices: [
        { label: "去拍照，晚点出摊", effects: { trust: 10, studentFilter: 8, cash: -6 }, log: "照片里你站在边上，却像很多人的校园坐标。" },
        { label: "送他们一张摊位合照", effects: { trust: 6, traffic: 4, stamina: -3 }, log: "合照很普通，但每个人都笑得像抢到号。" },
        { label: "婉拒，今晚订单太多", effects: { cash: 8, trust: -3, stamina: -4 }, log: "他们理解了，只是群里少了一张很可能会火的照片。" }
      ]
    },
    {
      id: "R047",
      phase: 2,
      scene: "crisis",
      tag: "低概率突发",
      title: "平台评分突然清零",
      text: "外卖平台系统维护，你的评分短暂显示为 0.0。群里开始截图，平台客服说这是正常波动。",
      chance: 0.035,
      condition: (s) => hasFlag(s, "standardPack") || hasFlag(s, "miniProgram") || s.stats.capitalization >= 35,
      choices: [
        { label: "贴出平台维护说明", effects: { trust: 6, compliance: 4, traffic: -2 }, log: "说明不有趣，但有用。" },
        { label: "发公告自嘲“归零重开”", effects: { traffic: 10, absurdity: 8, trust: 2 }, log: "大家笑了，平台没笑。" },
        { label: "找客服加急恢复", effects: { stamina: -7, trust: 4, capitalization: 2 }, log: "客服排队系统让你理解了顾客。" }
      ]
    },
    {
      id: "R048",
      phase: 2,
      scene: "lecture",
      tag: "低概率突发",
      title: "匿名美食评论家发帖",
      text: "一篇长评突然出现在本地论坛：火候、香料、排队情绪都写得很细，最后一句是“标签仍需更清楚”。",
      chance: 0.03,
      condition: (s) => s.stats.traffic >= 50,
      choices: [
        { label: "按建议改菜单", effects: { trust: 8, compliance: 6, traffic: 3, nameRealityGap: -8 }, log: "评论家没再出现，但菜单确实更清楚了。" },
        { label: "只转发夸味道的段落", effects: { traffic: 10, trust: -5, nameRealityGap: 5 }, log: "截取很会传播，也很会留下话柄。" },
        { label: "邀请对方现场复评", effects: { traffic: 8, trust: 4, stamina: -4 }, log: "大家开始猜评论家是不是排在第 23 号。" }
      ]
    },
    {
      id: "R049",
      phase: 2,
      scene: "ending",
      tag: "低概率突发",
      title: "流星雨夜",
      text: "深夜，学生说今晚有流星雨。队伍没有散，大家一边等腿一边抬头，像在等两个愿望同时兑现。",
      chance: 0.025,
      condition: (s) => s.day >= 10,
      choices: [
        { label: "暂停十分钟一起看", effects: { trust: 10, studentFilter: 8, cash: -5, stamina: 4 }, log: "流星很短，队伍很长，但那十分钟没人催单。" },
        { label: "继续出餐，别耽误队伍", effects: { cash: 8, trust: 2, stamina: -4 }, log: "愿望从天上划过，你把第 18 单递了出去。" },
        { label: "推出“许愿加辣”", effects: { traffic: 12, absurdity: 9, trust: -1 }, log: "没有证据表明加辣能提高许愿成功率，但群里愿意相信。" }
      ]
    },
    {
      id: "R050",
      phase: 0,
      scene: "supply",
      tag: "低概率突发",
      title: "抽检车提前到",
      text: "你还没出摊，抽检车先到了。对方说今天只是随机检查，你发现随机这个词比排队更刺激。",
      chance: 0.025,
      condition: (s) => s.day >= 16,
      choices: [
        { label: "配合检查，顺便学习流程", effects: { compliance: 14, trust: 5, cash: -6 }, flags: ["randomInspection"], log: "检查比想象中平静，前提是票据真的在。" },
        { label: "暂停备料，先整理票据", effects: { compliance: 8, cash: -10, stamina: -3 }, log: "你翻出每一张单据，像翻出一段经营史。" },
        { label: "让助手先接待", effects: { trust: -5, compliance: -6, stamina: 3, nameRealityGap: 4 }, log: "助手又解释了很多，解释本身成了风险。" }
      ]
    },
    {
      id: "R051",
      phase: 1,
      scene: "night",
      tag: "低概率突发",
      title: "校友捐了一台新烤炉",
      text: "一位校友说自己当年排过你的队，现在想捐一台新烤炉。烤炉崭新得像还没经历社会。",
      chance: 0.02,
      condition: (s) => s.stats.trust >= 60 && s.day >= 12,
      choices: [
        { label: "接受并公开来源", effects: { cash: 18, trust: 7, compliance: 4 }, flags: ["donatedGrill"], log: "新烤炉上岗，群里开始怀念旧烤炉的脾气。" },
        { label: "婉拒，避免人情压力", effects: { trust: 5, capitalization: -4, stamina: -3 }, log: "校友有点遗憾，但尊重你的边界。" },
        { label: "改成公益夜宵基金", effects: { cash: 8, trust: 10, traffic: 6, stamina: -5 }, log: "几位困难学生收到免费券，群里安静了一会儿。" }
      ]
    },
    {
      id: "R052",
      phase: 2,
      scene: "ending",
      tag: "低概率突发",
      title: "国际禽类会议误邀你",
      text: "邮箱里来了一封英文邀请，主题是国际禽类产业会议。对方显然误会了你，但误会得非常正式。",
      chance: 0.015,
      condition: (s) => s.stats.absurdity >= 45 || hasFlag(s, "englishMeme"),
      choices: [
        { label: "礼貌拒绝，继续出摊", effects: { trust: 3, stamina: 4, absurdity: 2 }, log: "你关掉邮箱，烤炉比国际会议更需要你。" },
        { label: "远程参会讲校园夜宵", effects: { traffic: 12, absurdity: 14, stamina: -6 }, flags: ["poultryConference"], log: "同传沉默了两秒，然后努力翻译“姨知道你饿了”。" },
        { label: "把邀请截图发群里", effects: { traffic: 10, studentFilter: 5, absurdity: 10 }, log: "群里一致认为你的事业已经走向国际化。" }
      ]
    }
  ];

  const ENDINGS = [
    {
      id: "END_CASH",
      title: "现金流烤糊",
      scene: "fruit",
      priority: 1000,
      condition: (s) => s.stats.cash <= -40,
      text: "你不是输给了菜单，也不是输给了评论区，而是输给了每天都要付的货款。最后一晚，你把烤炉擦干净，重新摆出一筐水果。至少苹果不会问自己是不是梨。"
    },
    {
      id: "END_STAMINA",
      title: "回到水果摊",
      scene: "fruit",
      priority: 990,
      condition: (s) => s.stats.stamina <= 0,
      text: "你烤到手腕发抖，终于决定收起烤炉。一个学生问：姨，西瓜保真吗？你沉默三秒，切开了一个完整的夏天。"
    },
    {
      id: "END_TRUST",
      title: "温情破产",
      scene: "crisis",
      priority: 980,
      condition: (s) => s.stats.trust <= 0,
      text: "技术上你可能解释得过去，情感上大家过不去。最先帮你写小作文的学生，后来写了最长的告别帖。摊子还在，队伍没了。"
    },
    {
      id: "END_COMPLIANCE",
      title: "表格降临",
      scene: "crisis",
      priority: 970,
      condition: (s) => s.stats.compliance <= 0 && s.stats.traffic >= 55,
      text: "你的摊位被各种表格温柔地包围。它们没有生气，也没有嘲讽，只是逐项要求你证明自己卖的到底是什么。你第一次觉得，沉默的表格比热搜更有压迫感。"
    },
    {
      id: "END18",
      title: "鹅鸭联合王国",
      scene: "ending",
      priority: 220,
      condition: (s) => s.stats.absurdity >= 96 && s.stats.nameRealityGap >= 58 && s.stats.trust >= 48,
      text: "你成功说服学生：鹅和鸭只是市场对同一类腿的不同投影。校门口升起新旗帜，上面写着“万腿归一”。监管人员路过，看完后决定先去喝口水。"
    },
    {
      id: "END10",
      title: "鹅类和解",
      scene: "ending",
      priority: 210,
      condition: (s) => hasFlag(s, "ethicsGoose") && s.stats.trust >= 45,
      text: "访问学者鹅主持发布会，宣布与你达成跨物种谅解备忘录。此后摊位每卖出一只腿，都会向校园湖投放一棵生菜。环保社团表示情绪复杂。"
    },
    {
      id: "END09",
      title: "禽类本体论教授",
      scene: "lecture",
      priority: 205,
      condition: (s) => hasFlag(s, "ontologyTalk") && s.stats.absurdity >= 78,
      text: "你被哲学系邀请开设通识课《鹅、鸭与存在》。期末论文题目是：当我说鹅腿时，我在说什么？选课系统崩了三次。"
    },
    {
      id: "END15",
      title: "鸟类语言模型",
      scene: "crisis",
      priority: 200,
      condition: (s) => hasFlag(s, "aiAuntie") && s.stats.absurdity >= 74,
      text: "你把所有群聊、订单和质疑帖训练成一个大模型。它只会回答三句话：还有吗？快到了。这取决于你如何定义鹅。学生们说它很像真实群聊。"
    },
    {
      id: "END13",
      title: "受惊腿传说",
      scene: "ending",
      priority: 190,
      condition: (s) => hasFlag(s, "startledLeg") && s.stats.absurdity >= 62,
      text: "“受惊腿”成为爆款。顾客相信只有被命运轻微震撼过的腿才够入味。你本人不理解，但账本理解。"
    },
    {
      id: "END11",
      title: "腿门矩阵",
      scene: "ending",
      priority: 185,
      condition: (s) => hasFlag(s, "legMatrix") && s.stats.capitalization >= 68,
      text: "“鹅腿大姨”“鹅腿二姨”“鹅腿姨父”合并上市，股票代码 LEG。招股书第一页写着：本公司不承诺所有腿来自同一种世界观。"
    },
    {
      id: "END14",
      title: "赛博姨",
      scene: "ending",
      priority: 180,
      condition: (s) => (hasFlag(s, "trainedAiAuntie") || hasFlag(s, "miniProgram")) && s.stats.capitalization >= 82,
      text: "真人林姨退休后，AI 林姨继续在群里回复：今天还有 17 只腿。学生怀疑 AI 比真人更准时，于是更难过了。"
    },
    {
      id: "END06",
      title: "资本快线",
      scene: "ending",
      priority: 170,
      condition: (s) => s.stats.capitalization >= 82 && s.stats.cash >= 120,
      text: "MCN 把“林姨”做成全国 IP。你在合同里仍是创始人，在门店里只剩立牌。最新广告词是：不重要是什么腿，重要的是谁定义了腿。"
    },
    {
      id: "END05",
      title: "流量反噬",
      scene: "crisis",
      priority: 160,
      condition: (s) => s.stats.traffic >= 88 && s.stats.nameRealityGap >= 58,
      text: "短视频标题把你推上热搜，也把所有旧公告推到显微镜下。每个人都在截图，每个人都说自己早就知道，每个人又都觉得自己刚刚才知道。"
    },
    {
      id: "END12",
      title: "白塔大学新增学院",
      scene: "lecture",
      priority: 150,
      condition: (s) => hasFlag(s, "paperCoauthor") && s.stats.traffic >= 76 && s.stats.absurdity >= 54,
      text: "学校成立“夜宵供应链与情感计算学院”。第一届博士资格考要求三小时内烤 200 只腿，并证明排队系统稳定。"
    },
    {
      id: "END03",
      title: "烤腿品牌",
      scene: "ending",
      priority: 130,
      condition: (s) => s.stats.cash >= 120 && s.stats.compliance >= 58 && s.stats.capitalization >= 38,
      text: "林姨注册品牌，推出标准化烤腿。高校店、写字楼店和冷链包同步上线。老顾客觉得味道没有以前玄学，但至少每一盒都写着原料。"
    },
    {
      id: "END02",
      title: "合规重生",
      scene: "ending",
      priority: 125,
      condition: (s) => s.stats.compliance >= 74 && s.stats.nameRealityGap <= 24,
      text: "停业整顿后，林姨重新开摊。菜单上写清楚鸭腿、鹅腿和当日批次。销量少了三成，睡眠多了两小时。校门口开始流传一句话：真正的秘方是标签。"
    },
    {
      id: "END01",
      title: "烟火小摊",
      scene: "ending",
      priority: 120,
      condition: (s) => s.stats.trust >= 70 && s.stats.compliance >= 60 && s.stats.capitalization < 45,
      text: "林姨最终没有开连锁，也没有继续上热搜。她把招牌改成“林姨烤腿”，每天限量，卖完就回家。学生毕业后还会回校门口看看，但再也不会把她当成一个必须完美的符号。"
    },
    {
      id: "END08",
      title: "校园食堂编制",
      scene: "ending",
      priority: 115,
      condition: (s) => s.stats.compliance >= 78 && s.stats.trust >= 56 && hasFlag(s, "standardPack"),
      text: "林姨进入食堂窗口，菜单、票据、冷链、投诉二维码一应俱全。学生终于不用抢，但也开始怀念抢不到的日子。"
    },
    {
      id: "END16",
      title: "全校转专业",
      scene: "lecture",
      priority: 110,
      condition: (s) => hasFlag(s, "principalQueued") && s.stats.traffic >= 82 && s.stats.trust >= 62,
      text: "白塔大学招生办发现，最受欢迎专业变成“烤腿学”。计算机系抗议无效，因为烤炉也是一种硬件。"
    },
    {
      id: "END17",
      title: "群聊永生",
      scene: "crisis",
      priority: 70,
      condition: (s) => s.stats.nameRealityGap >= 42 && s.stats.trust >= 34,
      text: "摊子不再出摊，群却还活着。每天都有人问今天有吗，每天都有人回答姨说等等。这已经不是经营，是一种民间历法。"
    },
    {
      id: "END04",
      title: "温情破产",
      scene: "crisis",
      priority: 60,
      condition: (s) => s.stats.trust < 30 && s.stats.studentFilter > 55,
      text: "技术上你可能解释得过去，情感上大家过不去。最先帮你写小作文的学生，后来写了最长的告别帖。摊子还在，队伍没了。"
    },
    {
      id: "END07",
      title: "回到水果摊",
      scene: "fruit",
      priority: 50,
      condition: (s) => s.stats.stamina < 18 || hasFlag(s, "fruitFallback"),
      text: "林姨收起烤炉，重新卖水果。一个学生问：姨，西瓜保真吗？你沉默三秒，切开了一个完整的夏天。"
    },
    {
      id: "END_DEFAULT",
      title: "还在路上",
      scene: "night",
      priority: 0,
      condition: () => true,
      text: "三十天结束，小摊没有飞升，也没有倒下。群里仍然有人问今天还有吗，你仍然会看天气、看货单、看自己的体力。经营不是结局，是明天早上的进货单。"
    }
  ];

  function createInitialState(seed) {
    const safeSeed = seed || Math.floor(Date.now() % 1000000000);
    return {
      day: 1,
      phaseIndex: 0,
      seed: safeSeed >>> 0,
      stats: { ...INITIAL_STATS },
      flags: [],
      seenEvents: [],
      eventCounts: {},
      log: [
        {
          day: 1,
          phase: "开局",
          title: "系统",
          text: "小摊推到白塔大学西南门。今晚开始，所有选择都会进账本。"
        }
      ],
      currentEventId: null,
      stallName: "白塔大学西南门",
      ended: false,
      endingId: null,
      rounds: 0
    };
  }

  function hasFlag(targetState, flag) {
    return targetState.flags.indexOf(flag) !== -1;
  }

  function addFlag(flag) {
    if (!hasFlag(state, flag)) {
      state.flags.push(flag);
    }
  }

  function random() {
    state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
    return state.seed / 4294967296;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clampStats() {
    Object.keys(STAT_META).forEach((key) => {
      const meta = STAT_META[key];
      state.stats[key] = clamp(state.stats[key], meta.min, meta.max);
    });
  }

  function normalizeStat(key, value) {
    const meta = STAT_META[key];
    return ((value - meta.min) / (meta.max - meta.min)) * 100;
  }

  function phaseName() {
    return PHASES[state.phaseIndex] || "收摊";
  }

  function getEventById(id) {
    return EVENTS.find((event) => event.id === id) || null;
  }

  function isSeen(event) {
    return state.seenEvents.indexOf(event.id) !== -1;
  }

  function eventCount(event) {
    state.eventCounts = state.eventCounts || {};
    return state.eventCounts[event.id] || 0;
  }

  function canUseEvent(event) {
    if (event.schedule) {
      const sameDay = event.schedule.day === state.day;
      const samePhase = event.schedule.phase === state.phaseIndex;
      return sameDay && samePhase && !isSeen(event);
    }

    if (event.phase !== undefined && event.phase !== state.phaseIndex) {
      return false;
    }

    if (!event.repeatable && isSeen(event)) {
      return false;
    }

    if (event.repeatable && event.maxRepeats && eventCount(event) >= event.maxRepeats) {
      return false;
    }

    return !event.condition || event.condition(state);
  }

  function chanceAllows(event) {
    return !event.chance || random() < event.chance;
  }

  function weightedPick(pool) {
    const total = pool.reduce((sum, event) => sum + (event.weight || 1), 0);
    let cursor = random() * total;

    for (const event of pool) {
      cursor -= event.weight || 1;
      if (cursor <= 0) {
        return event;
      }
    }

    return pool[pool.length - 1];
  }

  function pickEvent() {
    const scheduled = EVENTS.filter((event) => event.schedule && canUseEvent(event));
    if (scheduled.length > 0) {
      return scheduled[0];
    }

    const eligible = EVENTS.filter((event) => !event.schedule && canUseEvent(event));
    const phasePool = eligible.filter((event) => event.phase === state.phaseIndex);
    const rarePool = phasePool.filter((event) => event.chance && chanceAllows(event));
    const commonPool = phasePool.filter((event) => !event.chance);

    let pool = rarePool.length > 0 ? rarePool : commonPool;
    if (pool.length === 0) {
      pool = eligible.filter((event) => !event.chance);
    }
    if (pool.length === 0) {
      pool = EVENTS.filter((event) => !event.schedule && event.phase === state.phaseIndex && (!event.condition || event.condition(state)));
      const lowestCount = Math.min(...pool.map((event) => eventCount(event)));
      pool = pool.filter((event) => eventCount(event) === lowestCount);
    }

    return weightedPick(pool);
  }

  function pickEnding() {
    const sorted = [...ENDINGS].sort((a, b) => b.priority - a.priority);
    return sorted.find((ending) => ending.condition(state)) || ENDINGS[ENDINGS.length - 1];
  }

  function shouldEndEarly() {
    return (
      state.stats.cash <= -40 ||
      state.stats.stamina <= 0 ||
      state.stats.trust <= 0 ||
      (state.stats.compliance <= 0 && state.stats.traffic >= 55)
    );
  }

  function setCurrentEvent(event) {
    currentEvent = event;
    state.currentEventId = event ? event.id : null;
  }

  function ensureCurrentEvent() {
    if (state.ended) {
      currentEvent = null;
      return;
    }

    currentEvent = getEventById(state.currentEventId);
    if (!currentEvent) {
      setCurrentEvent(pickEvent());
    }
  }

  function applyChoice(choice) {
    if (!currentEvent || state.ended) {
      return;
    }

    if (!currentEvent.repeatable && !isSeen(currentEvent)) {
      state.seenEvents.push(currentEvent.id);
    }

    state.eventCounts = state.eventCounts || {};
    state.eventCounts[currentEvent.id] = (state.eventCounts[currentEvent.id] || 0) + 1;

    Object.entries(choice.effects || {}).forEach(([key, delta]) => {
      state.stats[key] += delta;
    });

    (choice.flags || []).forEach(addFlag);

    if (choice.stallName) {
      state.stallName = choice.stallName;
    }

    clampStats();
    state.rounds += 1;

    addLog({
      title: currentEvent.title,
      text: choice.log || `你选择了：${choice.label}`
    });

    if (choice.endingId) {
      finishGame(choice.endingId);
      return;
    }

    if (shouldEndEarly()) {
      finishGame();
      return;
    }

    advanceTurn();
  }

  function advanceTurn() {
    if (currentEvent && currentEvent.id === "C012") {
      finishGame();
      return;
    }

    state.phaseIndex += 1;
    if (state.phaseIndex >= PHASES.length) {
      state.phaseIndex = 0;
      state.day += 1;
    }

    if (state.day > MAX_DAYS) {
      finishGame();
      return;
    }

    setCurrentEvent(pickEvent());
    saveGame();
    render();
  }

  function finishGame(forcedEndingId) {
    const ending = forcedEndingId
      ? ENDINGS.find((item) => item.id === forcedEndingId) || pickEnding()
      : pickEnding();
    state.ended = true;
    state.endingId = ending.id;
    state.day = Math.min(state.day, MAX_DAYS);
    state.phaseIndex = Math.min(state.phaseIndex, PHASES.length - 1);
    addLog({
      title: `结局：${ending.title}`,
      text: ending.text
    });
    saveGame();
    render();
  }

  function addLog(entry) {
    state.log.unshift({
      day: state.day,
      phase: phaseName(),
      title: entry.title,
      text: entry.text
    });
    state.log = state.log.slice(0, 28);
  }

  function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    updateContinueButton();
  }

  function loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const loaded = JSON.parse(raw);
      if (!loaded || !loaded.stats || !Array.isArray(loaded.flags)) {
        return null;
      }
      loaded.eventCounts = loaded.eventCounts || {};
      return loaded;
    } catch (error) {
      return null;
    }
  }

  function updateContinueButton() {
    dom.continueBtn.disabled = !localStorage.getItem(SAVE_KEY);
  }

  function effectChips(effects) {
    const entries = Object.entries(effects || {}).filter(([key, value]) => {
      const meta = STAT_META[key];
      return value !== 0 && meta && meta.group === "visible";
    });
    const selected = entries.slice(0, 5);
    return selected.map(([key, value]) => {
      const meta = STAT_META[key];
      if (!meta) {
        return "";
      }
      const direction = value > 0 ? "up" : "down";
      const arrow = value > 0 ? "↑" : "↓";
      return `<span class="effect-chip ${direction}">${escapeHtml(meta.label)}${arrow}</span>`;
    }).join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function statTone(key, value) {
    if (key === "cash") {
      if (value < 10) return "#f04f78";
      if (value > 120) return "#2fbd7f";
      return "#21c7d9";
    }

    if (["nameRealityGap", "capitalization", "absurdity"].includes(key)) {
      if (value >= 72) return "#f04f78";
      if (value >= 45) return "#ffb000";
      return "#21c7d9";
    }

    if (value < 28) return "#f04f78";
    if (value > 70) return "#2fbd7f";
    return "#21c7d9";
  }

  function hiddenLevel(value) {
    if (value >= 82) return "爆表";
    if (value >= 58) return "高";
    if (value >= 30) return "中";
    return "低";
  }

  function renderStats() {
    const visible = [];

    Object.entries(STAT_META).forEach(([key, meta]) => {
      const value = state.stats[key];
      const normalized = clamp(normalizeStat(key, value), 0, 100);
      const tone = statTone(key, value);
      const displayValue = meta.group === "hidden"
        ? hiddenLevel(value)
        : `${meta.unit || ""}${Math.round(value)}`;
      const row = `
        <div class="stat-row">
          <div class="stat-head">
            <span>${escapeHtml(meta.label)}</span>
            <span class="stat-value">${escapeHtml(displayValue)}</span>
          </div>
          <div class="meter" aria-hidden="true">
            <div class="meter-fill" style="width:${normalized.toFixed(1)}%; background:${tone};"></div>
          </div>
        </div>
      `;

      if (meta.group === "visible") {
        visible.push(row);
      }
    });

    dom.visibleStats.innerHTML = visible.join("");
  }

  function renderEvent() {
    ensureCurrentEvent();

    if (state.ended) {
      renderEnding();
      return;
    }

    dom.eventTag.textContent = currentEvent.tag || PHASE_TAGS[state.phaseIndex];
    dom.eventTitle.textContent = currentEvent.title;
    dom.eventText.textContent = currentEvent.text;
    setScene(currentEvent.scene || "night");
    renderChoices(currentEvent.choices);
  }

  function renderEnding() {
    const ending = ENDINGS.find((item) => item.id === state.endingId) || pickEnding();
    dom.eventTag.textContent = "结局达成";
    dom.eventTitle.textContent = ending.title;
    dom.eventText.textContent = ending.text;
    setScene(ending.scene || "ending");

    dom.choices.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "ending-card";
    wrap.innerHTML = `
      <h3>本局账本</h3>
      <p>现金 ${Math.round(state.stats.cash)}，信任 ${Math.round(state.stats.trust)}，合规 ${Math.round(state.stats.compliance)}，流量 ${Math.round(state.stats.traffic)}，体力 ${Math.round(state.stats.stamina)}。</p>
    `;
    dom.choices.appendChild(wrap);

    const restart = document.createElement("button");
    restart.type = "button";
    restart.className = "choice-btn";
    restart.dataset.key = "R";
    restart.style.setProperty("--choice-bg", "#ffe66d");
    restart.innerHTML = `
      <span class="choice-title">再开一局</span>
      <span class="choice-hint"><span class="effect-chip up">新账本</span><span class="effect-chip up">新传说</span></span>
    `;
    restart.addEventListener("click", () => startNewGame());
    dom.choices.appendChild(restart);
  }

  function renderChoices(choices) {
    dom.choices.innerHTML = "";

    choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-btn";
      button.dataset.key = String(index + 1);
      button.style.setProperty("--choice-bg", CHOICE_COLORS[index % CHOICE_COLORS.length]);
      button.innerHTML = `
        <span class="choice-title">${escapeHtml(choice.label)}</span>
        <span class="choice-hint">${effectChips(choice.effects)}</span>
      `;
      button.addEventListener("click", () => choose(index, button));
      dom.choices.appendChild(button);
    });
  }

  function renderLog() {
    dom.logList.innerHTML = state.log.map((entry) => `
      <div class="log-entry">
        <strong>D${entry.day} · ${escapeHtml(entry.phase)} · ${escapeHtml(entry.title)}</strong>
        <span>${escapeHtml(entry.text)}</span>
      </div>
    `).join("");
  }

  function renderMeta() {
    dom.dayLabel.textContent = `${state.day} / ${MAX_DAYS}`;
    dom.phaseLabel.textContent = PHASES[state.phaseIndex] || "结算";
    dom.stallLabel.textContent = state.stallName || "白塔大学西南门";
    dom.seedLabel.textContent = `SEED ${state.seed % 100000}`;
  }

  function render() {
    renderMeta();
    renderStats();
    renderEvent();
    renderLog();
    updateContinueButton();
    window.gooseGameState = state;
  }

  function setScene(scene) {
    dom.sceneSprite.className = `scene-sprite scene-${scene}`;
  }

  function choose(index, button) {
    if (state.ended || !currentEvent || button.disabled) {
      return;
    }

    const choice = currentEvent.choices[index];
    if (!choice) {
      return;
    }

    Array.from(dom.choices.querySelectorAll("button")).forEach((item) => {
      item.disabled = true;
    });
    button.classList.add("is-picked");
    dom.eventCard.classList.add("bump");

    const delay = motionEnabled ? 230 : 10;
    window.setTimeout(() => {
      dom.eventCard.classList.remove("bump");
      applyChoice(choice);
    }, delay);
  }

  function startNewGame() {
    state = createInitialState();
    setCurrentEvent(pickEvent());
    saveGame();
    render();
  }

  function continueGame() {
    const loaded = loadGame();
    if (!loaded) {
      startNewGame();
      return;
    }
    state = loaded;
    clampStats();
    ensureCurrentEvent();
    render();
  }

  function resetGame() {
    localStorage.removeItem(SAVE_KEY);
    startNewGame();
  }

  function toggleMotion() {
    motionEnabled = !motionEnabled;
    dom.body.classList.toggle("reduce-motion", !motionEnabled);
    dom.muteBtn.textContent = motionEnabled ? "动效 ON" : "动效 OFF";
  }

  function applyLayoutMode(mode) {
    layoutMode = ["auto", "mobile", "desktop"].includes(mode) ? mode : "auto";
    document.documentElement.classList.toggle("layout-mobile", layoutMode === "mobile");
    document.documentElement.classList.toggle("layout-desktop", layoutMode === "desktop");
    dom.body.classList.toggle("layout-mobile", layoutMode === "mobile");
    dom.body.classList.toggle("layout-desktop", layoutMode === "desktop");
    dom.layoutButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.layout === layoutMode);
      button.setAttribute("aria-pressed", button.dataset.layout === layoutMode ? "true" : "false");
    });
    localStorage.setItem(LAYOUT_KEY, layoutMode);
  }

  function showHelp() {
    dom.helpModal.hidden = false;
  }

  function hideHelp() {
    dom.helpModal.hidden = true;
  }

  function bindEvents() {
    dom.newGameBtn.addEventListener("click", startNewGame);
    dom.continueBtn.addEventListener("click", continueGame);
    dom.layoutButtons.forEach((button) => {
      button.addEventListener("click", () => applyLayoutMode(button.dataset.layout));
    });
    dom.resetBtn.addEventListener("click", resetGame);
    dom.saveBtn.addEventListener("click", () => {
      addLog({ title: "手动保存", text: "账本已经收进抽屉，刷新页面也能继续。" });
      saveGame();
      render();
    });
    dom.helpBtn.addEventListener("click", showHelp);
    dom.closeHelpBtn.addEventListener("click", hideHelp);
    dom.helpModal.addEventListener("click", (event) => {
      if (event.target === dom.helpModal) {
        hideHelp();
      }
    });
    dom.muteBtn.addEventListener("click", toggleMotion);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !dom.helpModal.hidden) {
        hideHelp();
        return;
      }
      if (state && !state.ended && /^[1-4]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        const buttons = dom.choices.querySelectorAll(".choice-btn");
        if (buttons[index]) {
          choose(index, buttons[index]);
        }
      }
    });
  }

  function boot() {
    bindEvents();
    applyLayoutMode(localStorage.getItem(LAYOUT_KEY) || "auto");
    updateContinueButton();
    const loaded = loadGame();
    if (loaded) {
      state = loaded;
      clampStats();
      ensureCurrentEvent();
    } else {
      state = createInitialState();
      setCurrentEvent(pickEvent());
    }
    render();
  }

  boot();
})();
