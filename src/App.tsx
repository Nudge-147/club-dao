import code4teamQR from "./assets/code4team.jpg";
import { useState, useEffect, useMemo } from "react";
import { Cloud, EnvironmentType } from "laf-client-sdk";
import { MapPin, Plus, Zap, User, Calendar, Search, Lock, Palette, Utensils, ShoppingBag, Home, LayoutGrid, Eraser, Shield, ShieldCheck, Mail, Edit3, Save, Trophy, Star, Crown, Gift, Sparkles, Timer, QrCode, BadgeCheck, Megaphone } from "lucide-react";

// --- 配置区域 ---
const cloud = new Cloud({
  baseUrl: "https://yqq4612qr7.bja.sealos.run", 
  getAccessToken: () => localStorage.getItem("access_token") || "",
  environment: EnvironmentType.H5,
});

// --- 数据类型 ---
interface UserProfile {
  gender?: "男" | "女" | "保密";
  grade?: string;
  city?: string;
  hobbies?: string;
  intro?: string;
}

interface UserData {
  _id: string;
  username: string;
  is_verified?: boolean;
  edu_email?: string;
  profile?: UserProfile;
  stats?: { completed_count?: number };
}

interface Activity {
  _id: string;
  title: string;
  description: string;
  max_people: number;
  min_people?: number;
  time: string;
  location: string;
  author: string;
  category: "约饭" | "拼单";
  created_at?: number;
  joined_users: string[];
  hidden_by?: string[]; 
  status?: 'active' | 'locked' | 'cancelled' | 'done';
  requires_verification?: boolean;
}

// --- 皮肤配置 ---
const THEMES = {
  warm: { name: "暖阳橙", bg: "bg-[#FFF8F0]", card: "bg-white", primary: "bg-orange-500", primaryText: "text-orange-500", accent: "bg-yellow-400", icon: "text-orange-600", border: "border-orange-100", badge: "bg-orange-50 text-orange-600", navActive: "text-orange-600", navInactive: "text-gray-300" },
  cool: { name: "清凉蓝", bg: "bg-[#F0F8FF]", card: "bg-white", primary: "bg-blue-600", primaryText: "text-blue-600", accent: "bg-cyan-400", icon: "text-blue-600", border: "border-blue-100", badge: "bg-blue-50 text-blue-600", navActive: "text-blue-600", navInactive: "text-gray-300" },
  nju: { name: "南大紫", bg: "bg-[#F3E5F5]", card: "bg-white/90", primary: "bg-[#6A005F]", primaryText: "text-[#6A005F]", accent: "bg-purple-400", icon: "text-[#6A005F]", border: "border-purple-200", badge: "bg-purple-100 text-purple-800", navActive: "text-[#6A005F]", navInactive: "text-gray-400" }
};

type ThemeKey = keyof typeof THEMES;

function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState<"square" | "my_activities" | "profile">("square");
  const [activitySubTab, setActivitySubTab] = useState<"ongoing" | "history">("ongoing");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<"全部" | "约饭" | "拼单">("全部");
  const [inputTimeStr, setInputTimeStr] = useState("");

  const [currentUser, setCurrentUser] = useState<string>("");
  const [userData, setUserData] = useState<UserData | null>(null);

  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState<UserProfile>({});

  const [dateState, setDateState] = useState(() => {
    const tmr = new Date(); tmr.setDate(tmr.getDate() + 1); 
    return { year: tmr.getFullYear(), month: tmr.getMonth() + 1, day: tmr.getDate(), hour: 0, minute: 0 };
  });

  useEffect(() => {
    const { year, month, day, hour, minute } = dateState;
    const f = (n: number) => n.toString().padStart(2, '0'); 
    setInputTimeStr(`${year}/${f(month)}/${f(day)} ${f(hour)}:${f(minute)}`);
  }, [dateState]);

  useEffect(() => {
    if (showCreateModal) {
      const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
      setDateState({ year: tmr.getFullYear(), month: tmr.getMonth() + 1, day: tmr.getDate(), hour: 0, minute: 0 });
    }
  }, [showCreateModal]);

  useEffect(() => {
    if (!currentUser) return;
    const saved = localStorage.getItem(`club_secret_badge_${currentUser}`) || "";
    setSecretBadge(saved);
  }, [currentUser]);

  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  const handleDateChange = (key: keyof typeof dateState, val: string) => {
    const numVal = parseInt(val);
    setDateState(prev => {
      const next = { ...prev, [key]: numVal };
      if (key === 'year' || key === 'month') {
        const maxDays = getDaysInMonth(next.year, next.month);
        if (next.day > maxDays) next.day = maxDays;
      }
      return next;
    });
  };
  const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const [currentTheme, setCurrentTheme] = useState<ThemeKey>("warm");
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(true);
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginStep, setLoginStep] = useState<"inputName" | "nameTaken" | "inputPassword" | "createAccount">("inputName");
  const [loginError, setLoginError] = useState("");

  // --- 隐藏成就：社群会员盲盒 ---
  const [showSecret, setShowSecret] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [secretBadge, setSecretBadge] = useState<string>(() => {
    if (!currentUser) return "";
    return localStorage.getItem(`club_secret_badge_${currentUser}`) || "";
  });
  const isFounder = secretBadge.includes("Founder");

  const theme = THEMES[currentTheme];

  useEffect(() => {
    const savedName = localStorage.getItem("club_username");
    if (savedName) {
      setCurrentUser(savedName);
      setShowLoginModal(false);
      fetchUserData(savedName);
    }
    const savedTheme = localStorage.getItem("club_theme") as ThemeKey;
    if (savedTheme && THEMES[savedTheme]) setCurrentTheme(savedTheme);
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try { const res = await cloud.invoke("get-activities"); if (res) setActivities(res); } catch (err) { console.error(err); }
  };

  const fetchUserData = async (username: string) => {
    try {
      const res = await cloud.invoke("user-ops", { type: 'get-info', username });
      if (res) {
        setUserData(res);
        setTempProfile(res.profile || {});
      }
    } catch (e) { console.error(e); }
  };

  // --- 统计数据 ---
  const userActivityCount = userData?.stats?.completed_count || 0;

  // --- 拆分列表 ---
  const myOngoingList = useMemo(() => {
    return activities.filter(a => {
      const related = a.author === currentUser || (a.joined_users || []).includes(currentUser);
      if (!related) return false;
      const hidden = (a.hidden_by || []).includes(currentUser);
      if (hidden) return false;
      const st = a.status || 'active';
      if (st === 'cancelled' && a.author === currentUser) return false;
      return st === 'active' || st === 'locked' || st === 'cancelled';
    });
  }, [activities, currentUser]);

  const myHistoryList = useMemo(() => {
    return activities.filter(a => {
      const related = a.author === currentUser || (a.joined_users || []).includes(currentUser);
      if (!related) return false;
      const hidden = (a.hidden_by || []).includes(currentUser);
      if (hidden) return false;
      return (a.status || 'active') === 'done';
    });
  }, [activities, currentUser]);

  const isExpired = (activity: Activity) => {
    if (!activity.time) return false;
    const now = Date.now();
    const created = activity.created_at || now;
    return (now - created) > (5 * 24 * 60 * 60 * 1000); 
  };

  const squareList = useMemo(() => {
    return activities.filter(a => {
      const matchSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = activeCategory === "全部" || a.category === activeCategory;

      const isActive = (a.status || 'active') === 'active';
      const isHidden = (a.hidden_by || []).includes(currentUser);
      const expired = isExpired(a);

      return matchSearch && matchCategory && isActive && !expired && !isHidden;
    });
  }, [activities, searchTerm, activeCategory, currentUser]);

  const handleSetTheme = (theme: ThemeKey) => {
    if (theme === "nju" && userActivityCount < 10) { 
      alert(`🔒 解锁 [南大紫] 需要累计参与 10 次活动。\n\n当前进度：${userActivityCount}/10\n\n加油，多发活动或多参与！`); 
      return; 
    }
    setCurrentTheme(theme); localStorage.setItem("club_theme", theme); setShowThemeModal(false);
  };

  const SECRET_DEADLINE_STR = "2025-12-28T23:59:59";
  const deadlineTs = new Date(SECRET_DEADLINE_STR).getTime();
  const nowTs = Date.now();
  const isSecretExpired = nowTs > deadlineTs;
  const daysLeft = Math.max(0, Math.ceil((deadlineTs - nowTs) / (24 * 60 * 60 * 1000)));

  const SECRET_BADGES = [
    "🟦 链上萌新",
    "🟪 模型驯兽师",
    "🟨 金科欧皇",
    "🟩 合约守护者",
    "🟥 红队破局者",
    "🟫 数据炼金术士",
    "⬛ 黑金会员·Founder",
  ];

  const drawSecretBadge = async () => {
    if (!currentUser) return;
    if (secretBadge) {
      alert("你已经抽过徽章了（每人一次）");
      return;
    }
    if (isSecretExpired) {
      alert("本期二维码入口已截止（后续会更新）");
      return;
    }

    setIsDrawing(true);
    await new Promise((r) => setTimeout(r, 800));

    const pool: string[] = [];
    for (let i = 0; i < SECRET_BADGES.length; i++) {
      const b = SECRET_BADGES[i];
      const weight = i === SECRET_BADGES.length - 1 ? 1 : i >= 4 ? 3 : 8;
      for (let k = 0; k < weight; k++) pool.push(b);
    }

    const picked = pool[Math.floor(Math.random() * pool.length)];
    localStorage.setItem(`club_secret_badge_${currentUser}`, picked);
    setSecretBadge(picked);

    setIsDrawing(false);
    alert(`🎉 你抽到了：${picked}`);
  };

  const handleJoin = async (activityId: string) => {
    if (!currentUser) { alert("请先登录"); return; }
    if (!window.confirm("确定加入？")) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke("join-activity", { activityId, username: currentUser });
      if (res.ok) { alert("加入成功！"); fetchActivities(); } else { alert(res.msg); }
    } catch (e) { alert("网络错误"); } finally { setIsLoading(false); }
  };

  const handleQuit = async (activityId: string) => {
    if (!window.confirm("确定要退出？")) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke("quit-activity", { activityId, username: currentUser });
      if (res.ok) { alert("已退出"); fetchActivities(); } else { alert(res.msg); }
    } catch (e) { alert("网络错误"); } finally { setIsLoading(false); }
  };

  const handleCommonOp = async (opName: string, activityId: string, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke(opName, { activityId, username: currentUser });
      if (res.ok) { fetchActivities(); if(opName==='hide-activity') setActivities(prev=>prev.filter(a=>a._id!==activityId)); } 
      else alert(res.msg || "失败");
    } catch (e) { alert("网络错误"); } finally { setIsLoading(false); }
  };

  const handleToggleRecruit = async (activityId: string) => {
    setIsLoading(true);
    try {
      const res = await cloud.invoke("toggle-lock", { activityId, username: currentUser });
      if (res.ok) fetchActivities();
      else alert(res.msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDissolve = async (activityId: string) => {
    if (!window.confirm("确定解散？解散后活动立刻失效并从广场消失")) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke("cancel-activity", { activityId, username: currentUser });
      if (res.ok) fetchActivities();
      else alert(res.msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteActivity = async (activityId: string) => {
    if (!window.confirm("确定完成活动？完成后将从广场消失，并进入历史")) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke("complete-activity", { activityId, username: currentUser });
      if (res?.ok) fetchActivities();
      else alert(res?.msg || "操作失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAckCancelled = async (activityId: string) => {
    setIsLoading(true);
    try {
      const res = await cloud.invoke("ack-activity-deleted", { activityId, username: currentUser });
      if (res?.ok) {
        fetchActivities();
      } else {
        alert(res?.msg || "操作失败");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sendCode = async () => {
    if (!verifyEmail.endsWith("nju.edu.cn")) { alert("请使用 @smail.nju.edu.cn 或 @nju.edu.cn 结尾的邮箱"); return; }
    setIsSendingCode(true);
    try {
      const res = await cloud.invoke("verify-email", { type: 'send', email: verifyEmail, username: currentUser });
      if (res.ok) alert("验证码已发送，请查收邮件"); else alert(res.msg);
    } catch(e) { alert("发送失败"); } finally { setIsSendingCode(false); }
  };

  const verifyCodeAction = async () => {
    if(!verifyCode) return;
    try {
      const res = await cloud.invoke("verify-email", { type: 'verify', email: verifyEmail, code: verifyCode, username: currentUser });
      if (res.ok) { 
        alert("认证成功！");
        setUserData(prev => prev ? { ...prev, is_verified: true, edu_email: verifyEmail } : null);
        // fetchUserData(currentUser); 
      } else {
        alert(res.msg);
      }
    } catch(e) { alert("验证失败"); }
  };

  const saveProfile = async () => {
    try {
      const res = await cloud.invoke("user-ops", { type: 'update-profile', username: currentUser, profile: tempProfile });
      if (res.ok) { alert("档案已保存"); setUserData(prev => prev ? {...prev, profile: tempProfile} : null); setIsEditingProfile(false); }
    } catch(e) { alert("保存失败"); }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault(); if (!currentUser) return;
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const minVal = parseInt(formData.get('min_people') as string) || 2;
    const maxVal = parseInt(formData.get('max_people') as string) || 5;
    if (minVal < 2) { alert("❌ 至少 2 人"); return; }
    if (maxVal < minVal) { alert(`❌ 人数设置错误`); return; }
    const timeString = inputTimeStr.trim();
    if (!timeString) { alert("⏰ 请填写时间"); return; }

    setIsLoading(true);
    const newActivity = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category'),
      max_people: maxVal,
      min_people: minVal,
      time: timeString, 
      location: formData.get('location') as string,
      author: currentUser,
      requires_verification: formData.get('requires_verification') === 'on',
      created_at: Date.now(),
      joined_users: [currentUser],
      hidden_by: [],
      status: 'active'
    };
    const res = await cloud.invoke("create-activity", newActivity);
    if (res && res.id) { setShowCreateModal(false); fetchActivities(); } else { alert("发布失败"); }
    setIsLoading(false);
  };

  const checkUsername = async (e: React.FormEvent) => { e.preventDefault(); if(!loginName.trim())return; setIsLoading(true); setLoginError(""); try{const res=await cloud.invoke("user-ops",{type:'check',username:loginName.trim()});if(res&&res.exists)setLoginStep("nameTaken");else setLoginStep("createAccount");}catch(e){setLoginError("连接失败")}finally{setIsLoading(false);} };
  const handleLogin = async (e: React.FormEvent) => { e.preventDefault(); setIsLoading(true); const res=await cloud.invoke("user-ops",{type:'login',username:loginName.trim(),password:loginPassword});if(res&&res.ok){localStorage.setItem("club_username",loginName.trim());setCurrentUser(loginName.trim());fetchUserData(loginName.trim());setShowLoginModal(false);}else{setLoginError(res.msg||"密码错误");setIsLoading(false);} };
  const handleRegister = async (e: React.FormEvent) => { e.preventDefault(); setIsLoading(true); const res=await cloud.invoke("user-ops",{type:'register',username:loginName.trim(),password:loginPassword});if(res&&res.ok){localStorage.setItem("club_username",loginName.trim());setCurrentUser(loginName.trim());fetchUserData(loginName.trim());setShowLoginModal(false);}else{setLoginError(res.msg||"注册失败");setIsLoading(false);} };
  const handleLogout = () => { localStorage.removeItem("club_username"); setCurrentUser(""); setUserData(null); setVerifyEmail(""); setVerifyCode(""); setTempProfile({}); setIsEditingProfile(false); setShowLoginModal(true); setLoginStep("inputName"); setLoginName(""); setLoginPassword(""); };
  const resetToInputName = () => { setLoginStep("inputName"); setLoginError(""); setLoginPassword(""); };

  const ActivityCard = ({ activity, showJoinBtn = true, showSweepBtn = false }: { activity: Activity, showJoinBtn?: boolean, showSweepBtn?: boolean }) => {
    const [expanded, setExpanded] = useState(false);
    const joined = activity.joined_users || [];
    const isJoined = joined.includes(currentUser);
    const isAuthor = activity.author === currentUser; 
    const isFull = joined.length >= activity.max_people;
    const minP = activity.min_people || 1;
    const st = activity.status || 'active';
    const isDone = st === 'done';
    const isCancelled = st === 'cancelled';
    const isLocked = st === 'locked';
    const isActive = st === 'active';
    const isHidden = (activity.hidden_by || []).includes(currentUser);
    const isGhost = isHidden;
    const canFinish = joined.length >= minP;

    const actionButtons: React.ReactNode[] = [];

    if (isAuthor) {
      if (isDone) {
        actionButtons.push(
          <button key="done" className="px-6 py-2 rounded-xl text-sm font-bold bg-green-100 text-green-600" disabled>
            已完成
          </button>
        );
      } else if (isLocked) {
        actionButtons.push(
          <button key="reopen" onClick={() => handleToggleRecruit(activity._id)} className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white shadow">
            撤回继续召集
          </button>
        );
        actionButtons.push(
          <button key="complete" onClick={() => handleCompleteActivity(activity._id)} className="px-6 py-2 rounded-xl text-sm font-bold bg-green-500 text-white shadow">
            确定完成
          </button>
        );
        actionButtons.push(
          <button key="dissolve" onClick={() => handleDissolve(activity._id)} className="px-6 py-2 rounded-xl text-sm font-bold bg-red-50 text-red-500">
            解散
          </button>
        );
      } else if (isActive) {
        if (canFinish) {
          actionButtons.push(
            <button key="lock" onClick={() => handleToggleRecruit(activity._id)} className="px-6 py-2 rounded-xl text-sm font-bold bg-green-500 text-white shadow-md">
              结束召集
            </button>
          );
        } else {
          actionButtons.push(
            <button key="recruiting" className="px-6 py-2 rounded-xl text-sm font-bold bg-gray-100 text-gray-400" disabled>
              招募中
            </button>
          );
        }
        actionButtons.push(
          <button key="dissolve" onClick={() => handleDissolve(activity._id)} className="px-6 py-2 rounded-xl text-sm font-bold bg-red-50 text-red-500">
            解散
          </button>
        );
      }
    } else {
      if (isCancelled) {
        actionButtons.push(
          <button key="ack" onClick={() => handleAckCancelled(activity._id)} className="px-6 py-2 rounded-xl text-sm font-bold bg-gray-100 text-gray-500">
            知道了
          </button>
        );
      } else if (isJoined) {
        actionButtons.push(
          <button key="quit" onClick={() => handleQuit(activity._id)} className="px-6 py-2 rounded-xl text-sm font-bold bg-red-50 text-red-500">
            退出
          </button>
        );
      } else if (showJoinBtn) {
        if (isFull) {
          actionButtons.push(
            <button key="full" className="px-6 py-2 rounded-xl text-sm font-bold bg-gray-200 text-gray-400" disabled>
              已满员
            </button>
          );
        } else {
          actionButtons.push(
            <button key="join" onClick={() => handleJoin(activity._id)} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${theme.primary} text-white shadow-md active:scale-95`}>
              加入
            </button>
          );
        }
      }
    }

    return (
      <div className={`${theme.card} rounded-[2rem] p-6 shadow-sm border ${theme.border} mb-4 relative ${isGhost ? "opacity-60 grayscale border-dashed" : ""} ${isDone && !isGhost ? "border-l-4 border-l-green-500" : ""}`}>
        {!isGhost && showSweepBtn && (isCancelled || isDone) && <button onClick={() => handleCommonOp("hide-activity", activity._id, "移除?")} className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 rounded-full"><Eraser size={16} /></button>}
        
        <div className="flex justify-between items-start mb-3 pr-10">
          <div className="flex gap-2 items-center mb-1">
             <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${activity.category === '约饭' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{activity.category || "约饭"}</span>
             {activity.requires_verification && <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-purple-100 text-purple-600 flex items-center gap-1"><ShieldCheck size={10}/> 仅限认证</span>}
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${theme.badge}`}><User size={12} /> {joined.length}/{activity.max_people}</span>
        </div>
        <h3 className="font-bold text-xl mb-2">{activity.title}</h3>
        <div className="mb-4"><p onClick={() => setExpanded(!expanded)} className="text-gray-500 text-sm leading-relaxed whitespace-pre-wrap">{expanded ? activity.description : (activity.description||"").slice(0, 50) + "..."}</p></div>
        <div className="flex flex-col gap-3">
            <div className={`flex items-center gap-2 text-sm font-bold ${theme.icon}`}><Calendar size={14}/> {activity.time}</div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400 font-bold"><MapPin size={14}/> {activity.location}</div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {actionButtons}
                </div>
            </div>
        </div>
      </div>
    );
  };

  // --- 成就组件 ---
  const AchievementCard = () => {
    const isUnlocked = userActivityCount >= 10;
    const progress = Math.min((userActivityCount / 10) * 100, 100);

    return (
      <div className={`rounded-[2rem] p-6 mb-6 shadow-sm border relative overflow-hidden ${isUnlocked ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200" : "bg-white border-gray-100"}`}>
        <div className="flex justify-between items-center mb-4 relative z-10">
          <h3 className={`font-bold text-lg flex items-center gap-2 ${isUnlocked ? "text-yellow-700" : "text-gray-800"}`}>
            {isUnlocked ? <Crown size={20} className="text-yellow-500" /> : <Trophy size={20} className="text-gray-400" />}
            {isUnlocked ? "南大社交达人" : "成就进度"}
          </h3>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${isUnlocked ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
            {isUnlocked ? "已解锁皮肤" : "未解锁"}
          </span>
        </div>
        
        <div className="relative z-10">
           <div className="flex justify-between text-xs font-bold mb-2 text-gray-500">
             <span>参与活动</span>
             <span>{userActivityCount} / 10</span>
           </div>
           <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
             <div className={`h-full rounded-full transition-all duration-1000 ${isUnlocked ? "bg-yellow-400" : "bg-blue-500"}`} style={{ width: `${progress}%` }}></div>
           </div>
           {!isUnlocked && <p className="text-[10px] text-gray-400 mt-2 font-bold">🎯 达成 10 次即可解锁 [南大紫] 专属界面</p>}
        </div>
        
        {/* 背景装饰 */}
        <Star className={`absolute -bottom-4 -right-4 w-24 h-24 rotate-12 ${isUnlocked ? "text-yellow-500/10" : "text-gray-500/5"}`} />
      </div>
    );
  };

  const SecretAchievementCard = () => {
    if (!userData?.is_verified) return null;

    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowSecret(v => !v)}
          className="w-full p-5 flex items-center justify-between active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${secretBadge ? "bg-yellow-50" : "bg-gray-50"}`}>
              {secretBadge ? <Sparkles className="text-yellow-600" size={18} /> : <Gift className="text-gray-500" size={18} />}
            </div>
            <div className="text-left">
              <div className="font-black text-sm flex items-center gap-2">
                隐藏成就：社团会员盲盒
                {!secretBadge && <span className="text-[10px] px-2 py-0.5 rounded-full bg-black text-white">NEW</span>}
              </div>
              <div className="text-[11px] font-bold text-gray-400">
                加入微信群，抽取随机特殊徽章（盲盒）
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className={`text-[11px] font-black flex items-center gap-1 justify-end ${isSecretExpired ? "text-gray-300" : "text-red-500"}`}>
              <Timer size={14} />
              {isSecretExpired ? "已截止" : `剩余 ${daysLeft} 天`}
            </div>
            <div className="text-[10px] font-bold text-gray-300">
              12/28 截止（之后更新）
            </div>
          </div>
        </button>

        <div
          className={`px-5 pb-5 transition-all duration-300 ${
            showSecret ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
          }`}
        >
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 font-black text-sm mb-2">
              <QrCode size={16} className="text-gray-600" />
              扫码进群（限认证校友）
            </div>

            <div className="text-[11px] font-bold text-gray-500 leading-relaxed mb-3">
              进群后你就是【区块链 + AI 大模型金科大赛社团】会员。<br />
              会员可抽取随机【特殊徽章】（盲盒），越稀有越有排面。
            </div>

            <div className="flex items-center justify-center rounded-2xl bg-white p-4 border border-gray-100">
              <img
                src={code4teamQR}
                alt="区块链 + AI 大模型金科大赛社团群二维码"
                className={`w-full max-w-[260px] rounded-xl transition ${
                  isSecretExpired ? "opacity-40 grayscale" : "opacity-100"
                }`}
              />
            </div>

            <div className={`mt-3 text-[11px] font-black ${isSecretExpired ? "text-gray-300" : "text-red-500"}`}>
              {isSecretExpired ? "本期入口已截止（后续将更新二维码）" : "⏳ 稀缺入口：12/28 前有效（过期后会更新）"}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-100 p-4 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-black text-sm">会员盲盒徽章</div>
                <div className="text-[11px] font-bold text-gray-400">
                  每人一次抽取机会（永久保存）
                </div>
              </div>

              <button
                onClick={drawSecretBadge}
                disabled={isDrawing || !!secretBadge || isSecretExpired}
                className={`px-4 py-2 rounded-xl text-xs font-black transition active:scale-95 ${
                  isSecretExpired
                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                    : secretBadge
                    ? "bg-green-50 text-green-600 cursor-default"
                    : isDrawing
                    ? "bg-black text-white opacity-70"
                    : "bg-black text-white"
                }`}
              >
                {isSecretExpired ? "已截止" : secretBadge ? "已抽取" : isDrawing ? "开奖中..." : "抽一次"}
              </button>
            </div>

            {secretBadge ? (
              <div className="mt-3 bg-yellow-50 border border-yellow-100 rounded-2xl p-3">
                <div className="text-[11px] font-bold text-yellow-700">你获得的特殊徽章</div>
                <div className="text-lg font-black text-yellow-800 mt-1">{secretBadge}</div>
                <div className="text-[10px] font-bold text-yellow-600 mt-1">
                  这是“身份感”奖励：越稀有越有优越感 ✨
                </div>
              </div>
            ) : (
              <div className="mt-3 text-[11px] font-bold text-gray-400">
                扫码进群后，点击【抽一次】领取你的盲盒徽章～
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen font-sans text-slate-900 pb-32 transition-colors duration-500 ${theme.bg}`}>
      {showLoginModal && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"><div className="bg-white rounded-[2rem] p-8 w-full max-w-sm text-center"><h2 className="text-3xl font-black mb-8">ClubDAO</h2>{loginStep==="inputName"&&(<form onSubmit={checkUsername}><input autoFocus value={loginName} onChange={e=>setLoginName(e.target.value)} placeholder="代号" className="w-full p-4 bg-slate-100 rounded-xl mb-4 text-center font-bold"/><button className="w-full bg-black text-white p-4 rounded-xl font-bold">下一步</button></form>)}{loginStep==="nameTaken"&&(<div className="space-y-4"><div className="bg-orange-50 text-orange-600 p-4 rounded-xl text-sm font-bold">该代号已存在</div><button onClick={()=>setLoginStep("inputPassword")} className="w-full bg-black text-white p-4 rounded-xl font-bold">是本人，去登录</button><button onClick={resetToInputName} className="w-full bg-white border p-4 rounded-xl font-bold">换个名字</button></div>)}{loginStep==="inputPassword"&&( <form onSubmit={handleLogin}><input autoFocus type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="密码" className="w-full p-4 bg-slate-100 rounded-xl mb-4 text-center font-bold"/><button className="w-full bg-black text-white p-4 rounded-xl font-bold">登录</button></form>)}{loginStep==="createAccount"&&(<form onSubmit={handleRegister}><input autoFocus value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="设个密码" className="w-full p-4 bg-slate-100 rounded-xl mb-4 text-center font-bold"/><button className="w-full bg-black text-white p-4 rounded-xl font-bold">注册并登录</button></form>)}{loginError&&<p className="text-red-500 mt-4 font-bold">{loginError}</p>}</div></div>)}
      
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${theme.primary}`}>
            C
          </div>

          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-xl ${theme.primaryText}`}>
                {activeTab === "square"
                  ? "ClubDAO"
                  : activeTab === "my_activities"
                  ? "我的局"
                  : "我的"}
              </span>

              {/* 官方出品标识 */}
              <span className="px-2 py-1 rounded-md bg-black text-white text-[10px] font-black flex items-center gap-1">
                <BadgeCheck size={12} />
                官方出品
              </span>
            </div>

            {/* 官方主体名称（唯一权威来源） */}
            <span className="text-[10px] text-gray-500 font-black">
              南京大学区块链 + AI 与金融科技创新俱乐部 · 官方推出
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowThemeModal(true)}
            className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center"
          >
            <Palette size={14} />
          </button>

          <div className="bg-white border px-3 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-sm">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${theme.accent}`}>
              <User size={14} />
            </div>
            {currentUser}
          </div>
        </div>
      </nav>
      
      <main className="p-6 max-w-md mx-auto space-y-6">
        {activeTab === 'square' && (
          <div className="animate-fade-in space-y-6">
            <div className="relative group"><Search className="absolute left-4 top-3.5 text-gray-400" size={20} /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="寻找下一场活动..." className="w-full bg-white pl-12 pr-4 py-3 rounded-2xl font-bold outline-none shadow-sm" /></div>

            {/* 社团官方公告 */}
            <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${theme.primary}`}>
                    <Megaphone size={18} />
                  </div>

                  <div>
                    <div className="font-black text-sm text-gray-900">
                      南京大学区块链 + AI 与金融科技创新俱乐部 · 官方推出
                    </div>

                    <div className="text-xs text-gray-500 font-bold mt-1 leading-relaxed">
                      本平台为俱乐部官方活动与社群入口。  
                      校园邮箱认证后可解锁隐藏成就，并随机获得限定徽章（盲盒）。
                    </div>

                    <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-black">
                      ⏳ 限时开放：12 月 28 日截止
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("profile")}
                  className="px-4 py-2 rounded-xl bg-black text-white text-xs font-black active:scale-95 whitespace-nowrap"
                >
                  立即领取
                </button>
              </div>
            </div>

            <div className="flex p-1.5 bg-white rounded-2xl shadow-sm gap-1">{(["全部", "约饭", "拼单"] as const).map(cat => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeCategory === cat ? `${theme.primary} text-white shadow-md` : "text-gray-400 hover:bg-gray-50"}`}>{cat}</button>))}</div>
            <div>{squareList.length === 0 && !isLoading && <div className="text-center py-12 text-gray-300 font-bold">暂无活动</div>}{squareList.map(activity => <ActivityCard key={activity._id} activity={activity} showJoinBtn={true} />)}</div>
          </div>
        )}
        
        {activeTab === 'my_activities' && (
          <div className="animate-fade-in space-y-6">
            <div className="flex p-1 bg-white rounded-2xl shadow-sm border border-gray-100">
              <button onClick={() => setActivitySubTab('ongoing')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${activitySubTab==='ongoing' ? 'bg-black text-white shadow' : 'text-gray-400'}`}>
                正在进行 ({myOngoingList.length})
              </button>
              <button onClick={() => setActivitySubTab('history')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${activitySubTab==='history' ? 'bg-black text-white shadow' : 'text-gray-400'}`}>
                历史活动 ({myHistoryList.length})
              </button>
            </div>

            {activitySubTab === 'ongoing' && (
              <div>
                {myOngoingList.length === 0 && <div className="text-center py-12 text-gray-300 font-bold">暂无进行中的活动</div>}
                {myOngoingList.map(a => (
                  <ActivityCard key={a._id} activity={a} showJoinBtn={false} showSweepBtn={false} />
                ))}
              </div>
            )}

            {activitySubTab === 'history' && (
              <div>
                {myHistoryList.length === 0 && <div className="text-center py-12 text-gray-300 font-bold">还没有历史活动</div>}
                {myHistoryList.map(a => (
                  <div key={a._id}>
                    <ActivityCard activity={a} showJoinBtn={false} showSweepBtn={false} />
                    <div className="flex justify-end -mt-2 mb-6">
                      <button
                        onClick={() => handleCommonOp("hide-activity", a._id, "移除这条回忆？（仅对你隐藏）")}
                        className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-bold"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'profile' && (
          <div className="animate-fade-in space-y-6">
            {/* 头部卡片 */}
            <div className={`rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden text-white transition-colors duration-500 ${theme.primary}`}>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{currentUser}</h1>

                  {/* ✅ 隐藏成就徽章：抽到才显示 */}
                  {secretBadge && (
                    <span
                      className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${
                        isFounder ? "bg-yellow-400 text-yellow-950" : "bg-black/20 text-white/90"
                      }`}
                    >
                      <Sparkles size={12} className={isFounder ? "text-yellow-900" : "text-yellow-300"} />
                      {secretBadge}
                    </span>
                  )}

                  {userData?.is_verified ? (
                    <div className="px-2 py-1 bg-yellow-400 text-yellow-900 text-[10px] font-black rounded-md flex items-center gap-1">
                      <ShieldCheck size={12}/> 已认证
                    </div>
                  ) : (
                    <div className="px-2 py-1 bg-black/20 text-white/70 text-[10px] font-bold rounded-md flex items-center gap-1">
                      <Shield size={12}/> 未认证
                    </div>
                  )}
                </div>
                <p className="text-white/80 text-sm mb-6">{userData?.profile?.intro || "这个人很懒，还没写自我介绍..."}</p>
                <div className="flex gap-4 text-center">
                  <div><p className="text-2xl font-bold">{userActivityCount}</p><p className="text-[10px] opacity-60">总参与</p></div>
                  <div><p className="text-2xl font-bold">{userData?.is_verified ? 'V' : 'X'}</p><p className="text-[10px] opacity-60">校友</p></div>
                </div>
              </div>
              <Zap className="absolute right-[-20px] top-[-20px] opacity-20 rotate-12" size={160} />
            </div>

            {/* 成就系统卡片 */}
            <AchievementCard />
            <SecretAchievementCard />

            {/* 认证卡片 (仅当未认证时显示) */}
            {!userData?.is_verified && (
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-purple-100">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-purple-800"><Mail size={18}/> 校园邮箱认证</h3>
                <div className="space-y-3">
                  <input value={verifyEmail} onChange={e=>setVerifyEmail(e.target.value)} placeholder="学号@smail.nju.edu.cn" className="w-full bg-purple-50 p-3 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-purple-200"/>
                  <div className="flex gap-2">
                    <input value={verifyCode} onChange={e=>setVerifyCode(e.target.value)} placeholder="6位验证码" className="flex-1 bg-purple-50 p-3 rounded-xl font-bold text-sm outline-none"/>
                    <button onClick={sendCode} disabled={isSendingCode} className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs whitespace-nowrap">{isSendingCode?"发送中":"获取验证码"}</button>
                  </div>
                  <button onClick={verifyCodeAction} className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm mt-2">提交认证</button>
                </div>
              </div>
            )}

            {/* 个人档案 */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">个人档案</h3>
                <button onClick={()=>{if(isEditingProfile)saveProfile();setIsEditingProfile(!isEditingProfile);}} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  {isEditingProfile ? <Save size={18} className="text-green-600"/> : <Edit3 size={18} className="text-gray-500"/>}
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase">性别</label>
                     {isEditingProfile ? (
                       <select value={tempProfile.gender||"保密"} onChange={e=>setTempProfile({...tempProfile, gender: e.target.value as any})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none"><option>男</option><option>女</option><option>保密</option></select>
                     ) : <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">{userData?.profile?.gender||"未填写"}</div>}
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase">年级</label>
                     {isEditingProfile ? (
                       <select value={tempProfile.grade||""} onChange={e=>setTempProfile({...tempProfile, grade: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none"><option value="">请选择</option><option>本科大一</option><option>本科大二</option><option>本科大三</option><option>本科大四</option><option>硕士研究生</option><option>博士研究生</option></select>
                     ) : <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">{userData?.profile?.grade||"未填写"}</div>}
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">来自城市</label>
                   {isEditingProfile ? (
                     <input value={tempProfile.city||""} onChange={e=>setTempProfile({...tempProfile, city: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none" placeholder="例如：江苏南京"/>
                   ) : <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">{userData?.profile?.city||"未填写"}</div>}
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">兴趣爱好</label>
                   {isEditingProfile ? (
                     <input value={tempProfile.hobbies||""} onChange={e=>setTempProfile({...tempProfile, hobbies: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none" placeholder="例如：羽毛球、摄影、德州扑克"/>
                   ) : <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">{userData?.profile?.hobbies||"未填写"}</div>}
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">自我介绍</label>
                   {isEditingProfile ? (
                     <textarea value={tempProfile.intro||""} onChange={e=>setTempProfile({...tempProfile, intro: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none h-24 resize-none" placeholder="想找什么样的搭子？"/>
                   ) : <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold whitespace-pre-wrap">{userData?.profile?.intro||"未填写"}</div>}
                </div>
              </div>
            </div>

            {/* 历史记录：不再是混在一起的，而是分两个 Tab */}
            <div className="mt-8 mb-4 flex justify-center"><button onClick={handleLogout} className="px-6 py-2 bg-gray-100 text-gray-400 rounded-full font-bold text-xs hover:bg-red-50 hover:text-red-500 transition-colors">退出登录</button></div>
          </div>
        )}
      </main>

      {/* 悬浮按钮与底部导航 */}
      {activeTab === 'square' && (<button onClick={() => setShowCreateModal(true)} className={`fixed bottom-24 right-6 w-14 h-14 text-white rounded-[1.2rem] flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-90 z-30 ${theme.primary}`}><Plus size={28} /></button>)}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 pb-safe pt-2 px-6 flex justify-around items-center z-50 h-20">
        <button onClick={() => setActiveTab('square')} className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'square' ? theme.navActive : theme.navInactive}`}><Home size={24} strokeWidth={activeTab === 'square' ? 3 : 2} /><span className="text-[10px] font-bold">广场</span></button>
        <button onClick={() => setActiveTab('my_activities')} className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'my_activities' ? theme.navActive : theme.navInactive}`}><LayoutGrid size={24} strokeWidth={activeTab === 'my_activities' ? 3 : 2} /><span className="text-[10px] font-bold">我的局</span></button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'profile' ? theme.navActive : theme.navInactive}`}><User size={24} strokeWidth={activeTab === 'profile' ? 3 : 2} /><span className="text-[10px] font-bold">我的</span></button>
      </div>

      {/* 主题弹窗 */}
      {showThemeModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"><div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-slide-up"><h3 className="text-xl font-black mb-6 text-center">选择界面风格</h3><div className="grid grid-cols-3 gap-4"><button onClick={() => handleSetTheme("warm")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${currentTheme==='warm'?'border-orange-500 bg-orange-50':'border-transparent bg-gray-50'}`}><div className="w-8 h-8 rounded-full bg-orange-500 shadow-md"></div><span className="text-xs font-bold">暖阳橙</span></button><button onClick={() => handleSetTheme("cool")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${currentTheme==='cool'?'border-blue-500 bg-blue-50':'border-transparent bg-gray-50'}`}><div className="w-8 h-8 rounded-full bg-blue-500 shadow-md"></div><span className="text-xs font-bold">清凉蓝</span></button><button onClick={() => handleSetTheme("nju")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${currentTheme==='nju'?'border-purple-800 bg-purple-50':'border-transparent bg-gray-50'} relative overflow-hidden`}><div className="w-8 h-8 rounded-full bg-[#6A005F] shadow-md flex items-center justify-center">{userActivityCount < 10 && <Lock size={14} className="text-white/50"/>}</div><span className="text-xs font-bold text-[#6A005F]">南大紫</span></button></div><button onClick={() => setShowThemeModal(false)} className="w-full mt-6 py-3 bg-gray-100 rounded-xl font-bold text-gray-500">关闭</button></div></div>)}
      
      {/* 发布活动弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-50 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6 pt-4"><h2 className="text-3xl font-black">发布活动</h2><button onClick={() => setShowCreateModal(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400">✕</button></div>
          <form onSubmit={handleCreateActivity} className="flex-1 space-y-6 overflow-y-auto pb-20">
            <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">分类</label><div className="flex gap-4"><label className="flex-1 cursor-pointer"><input type="radio" name="category" value="约饭" defaultChecked className="peer hidden" /><div className="bg-gray-100 peer-checked:bg-orange-500 peer-checked:text-white py-3 rounded-xl text-center font-bold flex items-center justify-center gap-2 transition-all"><Utensils size={16}/> 约饭</div></label><label className="flex-1 cursor-pointer"><input type="radio" name="category" value="拼单" className="peer hidden" /><div className="bg-gray-100 peer-checked:bg-blue-600 peer-checked:text-white py-3 rounded-xl text-center font-bold flex items-center justify-center gap-2 transition-all"><ShoppingBag size={16}/> 拼单</div></label></div></div>
            <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">标题</label><input name="title" required className="w-full text-2xl font-bold border-b-2 border-gray-100 py-3 outline-none bg-transparent" placeholder="例如：周末火锅局" /></div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">时间</label>
              <div className="flex gap-2 items-center">
                <div className="relative flex-[1.2]"><select value={dateState.year} onChange={(e) => handleDateChange('year', e.target.value)} className="w-full bg-gray-50 text-center font-bold text-lg py-3 rounded-xl outline-none">{range(2025, 2030).map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                <div className="relative flex-1"><select value={dateState.month} onChange={(e) => handleDateChange('month', e.target.value)} className="w-full bg-gray-50 text-center font-bold text-lg py-3 rounded-xl outline-none">{range(1, 12).map(m => <option key={m} value={m}>{m}月</option>)}</select></div>
                <div className="relative flex-1"><select value={dateState.day} onChange={(e) => handleDateChange('day', e.target.value)} className="w-full bg-gray-50 text-center font-bold text-lg py-3 rounded-xl outline-none">{range(1, getDaysInMonth(dateState.year, dateState.month)).map(d => <option key={d} value={d}>{d}日</option>)}</select></div>
                <span className="text-gray-300 font-bold">-</span>
                <div className="relative flex-1"><select value={dateState.hour} onChange={(e) => handleDateChange('hour', e.target.value)} className="w-full bg-gray-50 text-center font-bold text-lg py-3 rounded-xl outline-none">{range(0, 23).map(h => <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>)}</select></div>
                <span className="text-gray-300 font-bold">:</span>
                <div className="relative flex-1"><select value={dateState.minute} onChange={(e) => handleDateChange('minute', e.target.value)} className="w-full bg-gray-50 text-center font-bold text-lg py-3 rounded-xl outline-none">{range(0, 59).map(m => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}</select></div>
              </div>
            </div>

            <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">地点</label><input name="location" required className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none" /></div>
            <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">人数</label><div className="flex gap-4 items-center"><div className="flex-1 bg-gray-50 rounded-2xl p-4 flex items-center gap-2"><span className="text-xs text-gray-400 font-bold">最少</span><input type="number" name="min_people" placeholder="2" min="2" className="w-full bg-transparent font-bold outline-none text-center" /></div><span className="text-gray-300 font-bold">-</span><div className="flex-1 bg-gray-50 rounded-2xl p-4 flex items-center gap-2"><span className="text-xs text-gray-400 font-bold">最多</span><input type="number" name="max_people" placeholder="5" min="2" className="w-full bg-transparent font-bold outline-none text-center" /></div></div></div>
            
            <div className="flex items-center justify-between bg-purple-50 p-4 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-700"><ShieldCheck size={20}/></div>
                <div><div className="font-bold text-sm text-purple-900">仅限认证校友</div><div className="text-[10px] text-purple-500 font-bold">开启后，未认证用户无法加入</div></div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="requires_verification" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">详情</label><textarea name="description" placeholder="年级要求、口味偏好、具体流程..." className="w-full bg-gray-50 rounded-2xl p-4 h-32 resize-none outline-none font-medium text-sm" /></div>
            <button disabled={isLoading} type="submit" className={`w-full text-white py-5 rounded-2xl font-bold text-xl shadow-xl mt-8 ${theme.primary}`}>{isLoading ? "发布中..." : "即刻发布"}</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
